import { Router } from "express";
import { z } from "zod";
import { computeGrossMarginPercent } from "../lib/dashboard.js";
import { generateNumber, hydrateCounter } from "../lib/numbering.js";
import { getEngagementOverheadRules, removeOverheadFromLoadedCost } from "../lib/overheadRules.js";
import { addAudit, addRecord, getCollection, nextDocumentNumber, updateRecord } from "../data/store.js";

const router = Router();
const sowStatuses = ["DRAFT", "ACTIVE", "INACTIVE", "ON_HOLD", "COMPLETED", "TERMINATED"];

async function deriveRoleCosting(billRate, targetMargin, engagementType, locationType) {
  const rate = Number(billRate || 0);
  const margin = Number(targetMargin || 0);
  const loadedCostGuidance = Number((rate * (1 - margin / 100)).toFixed(2));
  const rules = await getEngagementOverheadRules();
  return {
    targetMargin: margin,
    loadedCostGuidance,
    baseCostGuidance: removeOverheadFromLoadedCost(loadedCostGuidance, rules, engagementType, locationType)
  };
}

function weekSpanInclusive(startDate, endDate) {
  if (!startDate || !endDate) {
    return 1;
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 1;
  }
  const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, Math.ceil(diffDays / 7));
}

router.get("/", async (_req, res) => {
  const sows = [...getCollection("sows")]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((sow) => ({
      ...sow,
      account: getCollection("accounts").find((account) => account.id === sow.accountId) || null,
      roles: getCollection("sowRoles")
        .filter((role) => role.sowId === sow.id)
        .map((role) => ({
          ...role,
          deployments: getCollection("deployments")
            .filter((deployment) => deployment.sowRoleId === role.id)
            .map((deployment) => ({
              ...deployment,
              resource: getCollection("resources").find((resource) => resource.id === deployment.resourceId) || null
            }))
        })),
      milestones: getCollection("milestones").filter((milestone) => milestone.sowId === sow.id)
    }));
  hydrateCounter("SOW", sows.map((item) => item.number));
  res.json(sows);
});

router.get("/:id", async (req, res) => {
  const sow = getCollection("sows").find((item) => item.id === req.params.id);

  if (!sow) {
    return res.status(404).json({ message: "SOW not found" });
  }

  const roles = getCollection("sowRoles")
    .filter((role) => role.sowId === sow.id)
    .map((role) => {
      const deployments = getCollection("deployments")
        .filter((deployment) => deployment.sowRoleId === role.id)
        .map((deployment) => ({
          ...deployment,
          resource: getCollection("resources").find((resource) => resource.id === deployment.resourceId)
        }));

      return { ...role, deployments };
    });

  const actuals = getCollection("actuals").filter((actual) =>
    roles.some((role) => role.deployments.some((deployment) => deployment.id === actual.deploymentId))
  );
  const milestones = getCollection("milestones").filter((milestone) => milestone.sowId === sow.id);
  const attachments = getCollection("sowAttachments").filter((attachment) => attachment.sowId === sow.id);

  res.json({
    ...sow,
    account: getCollection("accounts").find((account) => account.id === sow.accountId) || null,
    roles,
    milestones,
    attachments,
    actuals
  });
});

router.post("/", async (req, res) => {
  const schema = z.object({
    accountId: z.string().min(1),
    sourceOpportunityId: z.string().optional(),
    targetMargin: z.coerce.number().min(0).max(100).optional(),
    name: z.string().min(2),
    billingModel: z.enum(["TM_HOURLY", "FIXED_MAN_MONTH", "FIXED_MILESTONE"]),
    status: z.enum(sowStatuses).default("DRAFT"),
    currency: z.string().min(1),
    startDate: z.string(),
    endDate: z.string(),
    contractValue: z.coerce.number().min(0),
    visibleRevenue: z.coerce.number().min(0).default(0),
    visibleCost: z.coerce.number().min(0).default(0),
    travelExpensesAllowed: z.boolean().default(false),
    travelExpensesBillingType: z.enum(["Included", "Pass-through", "Capped", "Not Billable"]).default("Not Billable"),
    travelExpensesCapAmount: z.coerce.number().min(0).default(0),
    travelExpensesApprovalRequired: z.boolean().default(false),
    travelExpensesNotes: z.string().optional(),
    projectManagerName: z.string().min(2),
    deliveryManagerName: z.string().min(2),
    accountManagerName: z.string().optional().default(""),
    projectHealth: z.string().optional(),
    createdFrom: z.string().default("DIRECT")
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid SOW payload", issues: parsed.error.issues });
  }

  const sourceOpportunity = parsed.data.sourceOpportunityId
    ? getCollection("opportunities").find((item) => item.id === parsed.data.sourceOpportunityId)
    : null;
  if (sourceOpportunity && sourceOpportunity.stage !== "WON") {
    return res.status(400).json({ message: "Only won opportunities can be referenced for SOW creation." });
  }

  const now = new Date().toISOString();
  const grossMargin = parsed.data.visibleRevenue - parsed.data.visibleCost;
  const payload = {
    ...parsed.data,
    sourceOpportunityId: parsed.data.sourceOpportunityId || null
  };
  const sow = addRecord("sows", {
    id: crypto.randomUUID(),
    ...payload,
    targetMargin: parsed.data.targetMargin ?? sourceOpportunity?.targetMargin ?? 0,
    number: nextDocumentNumber("SOW"),
    startDate: new Date(parsed.data.startDate).toISOString(),
    endDate: new Date(parsed.data.endDate).toISOString(),
    grossMargin,
    grossMarginPercent: computeGrossMarginPercent(parsed.data.visibleRevenue, parsed.data.visibleCost),
    createdAt: now,
    updatedAt: now
  });
  addAudit({
    entityName: "SOW",
    recordId: sow.id,
    actionType: "CREATE",
    actor: req.user?.name || "Unknown",
    newValue: sow,
    sourceScreen: "SOW"
  });

  if (sourceOpportunity) {
    const sourceRoles = getCollection("opportunityRoles").filter((role) => role.opportunityId === sourceOpportunity.id);
    for (const sourceRole of sourceRoles) {
      const copiedCosting = await deriveRoleCosting(
        sourceRole.billRate,
        sourceRole.targetMargin ?? sourceOpportunity.targetMargin ?? 0,
        sourceRole.engagementType || "Full-Time",
        sourceRole.roleLocation || "Offshore"
      );
      const copiedRole = {
        id: crypto.randomUUID(),
        number: nextDocumentNumber("SOWRole"),
        sowId: sow.id,
        sourceOpportunityRoleId: sourceRole.id,
        title: sourceRole.title,
        skill: sourceRole.skill,
        subModule: sourceRole.subModule || "",
        quantity: 1,
        engagementType: sourceRole.engagementType || "Full-Time",
        experienceLevel: sourceRole.experienceLevel || "Consultant",
        billingType: sow.billingModel === "FIXED_MAN_MONTH" ? "Man-Month" : sow.billingModel === "FIXED_MILESTONE" ? "Milestone" : "Hourly",
        billRate: Number(sourceRole.billRate || 0),
        costRate: 0,
        targetMargin: copiedCosting.targetMargin,
        loadedCostGuidance: copiedCosting.loadedCostGuidance,
        baseCostGuidance: copiedCosting.baseCostGuidance,
        startDate: sourceRole.startDate || sow.startDate,
        duration: sourceRole.duration ?? weekSpanInclusive(sourceRole.startDate || sow.startDate, sourceRole.endDate || sow.endDate),
        endDate: sourceRole.endDate || sow.endDate,
        plannedAllocationPercent: Number(sourceRole.allocationPercent || 100),
        plannedHours: Number(sourceRole.estimatedHours || 0),
        locationRequirement: sourceRole.roleLocation || "Offshore",
        staffingPriority: "High",
        staffingStatus: "Open",
        remarks: sourceRole.notes || "",
        measurementUnit: sow.billingModel === "FIXED_MAN_MONTH" ? "MAN_MONTHS" : "HOURS",
        createdAt: now,
        updatedAt: now
      };
      addRecord("sowRoles", copiedRole);
      addAudit({
        entityName: "SOWRole",
        recordId: copiedRole.id,
        actionType: "CREATE",
        actor: req.user?.name || "Unknown",
        newValue: copiedRole,
        sourceScreen: "SOW Conversion"
      });
    }
  }

  res.status(201).json(sow);
});

router.patch("/:id", async (req, res) => {
  const schema = z.object({
    accountId: z.string().min(1).optional(),
    sourceOpportunityId: z.string().optional(),
    targetMargin: z.coerce.number().min(0).max(100).optional(),
    name: z.string().min(2).optional(),
    billingModel: z.enum(["TM_HOURLY", "FIXED_MAN_MONTH", "FIXED_MILESTONE"]).optional(),
    status: z.enum(sowStatuses).optional(),
    currency: z.string().min(1).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    contractValue: z.coerce.number().min(0).optional(),
    visibleRevenue: z.coerce.number().min(0).optional(),
    visibleCost: z.coerce.number().min(0).optional(),
    travelExpensesAllowed: z.boolean().optional(),
    travelExpensesBillingType: z.enum(["Included", "Pass-through", "Capped", "Not Billable"]).optional(),
    travelExpensesCapAmount: z.coerce.number().min(0).optional(),
    travelExpensesApprovalRequired: z.boolean().optional(),
    travelExpensesNotes: z.string().optional(),
    projectManagerName: z.string().min(2).optional(),
    deliveryManagerName: z.string().min(2).optional(),
    accountManagerName: z.string().optional().default(""),
    projectHealth: z.string().optional()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid SOW payload", issues: parsed.error.issues });
  }

  const existing = getCollection("sows").find((item) => item.id === req.params.id);
  if (!existing) {
    return res.status(404).json({ message: "SOW not found" });
  }

  const changes = { ...parsed.data };
  if (changes.sourceOpportunityId === "") {
    changes.sourceOpportunityId = null;
  }
  if (changes.accountManagerName === undefined) {
    delete changes.accountManagerName;
  }
  for (const key of ["startDate", "endDate"]) {
    if (changes[key]) {
      changes[key] = new Date(changes[key]).toISOString();
    }
  }

  if (changes.visibleRevenue !== undefined || changes.visibleCost !== undefined) {
    const revenue = changes.visibleRevenue ?? existing?.visibleRevenue ?? 0;
    const cost = changes.visibleCost ?? existing?.visibleCost ?? 0;
    changes.grossMargin = revenue - cost;
    changes.grossMarginPercent = computeGrossMarginPercent(revenue, cost);
  }

  const sow = updateRecord("sows", req.params.id, changes);
  addAudit({
    entityName: "SOW",
    recordId: sow.id,
    actionType: "UPDATE",
    actor: req.user?.name || "Unknown",
    oldValue: existing,
    newValue: sow,
    sourceScreen: "SOW"
  });

  res.json(sow);
});

export default router;
