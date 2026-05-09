import { Router } from "express";
import { z } from "zod";
import { addAudit, deleteRecord, getCollection, nextDocumentNumber, updateRecord, upsertRecord } from "../data/store.js";
import { weightedValue } from "../lib/dashboard.js";
import { getEngagementOverheadRules, removeOverheadFromLoadedCost } from "../lib/overheadRules.js";
import { ensurePersisted } from "../lib/persistence.js";

const router = Router();

function toIsoDate(value) {
  return value ? new Date(value).toISOString() : value;
}

function addWeeksAndSubtractDay(value, duration) {
  if (!value || !duration) {
    return "";
  }
  const start = new Date(value);
  if (Number.isNaN(start.getTime())) {
    return "";
  }
  const result = new Date(start);
  result.setDate(result.getDate() + Number(duration) * 7);
  result.setDate(result.getDate() - 1);
  return result.toISOString();
}

function weekSpanInclusive(startDate, endDate) {
  if (!startDate || !endDate) {
    return undefined;
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return undefined;
  }
  const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, Math.ceil(diffDays / 7));
}

async function deriveCostGuidance(billRate, targetMargin, engagementType, locationType) {
  const rate = Number(billRate || 0);
  const margin = Number(targetMargin || 0);
  if (!rate) {
    return {
      targetMargin: margin,
      loadedCostGuidance: 0,
      baseCostGuidance: 0,
      costGuidance: 0
    };
  }

  const loadedCostGuidance = Number((rate * (1 - margin / 100)).toFixed(2));
  const rules = await getEngagementOverheadRules();
  const baseCostGuidance = removeOverheadFromLoadedCost(loadedCostGuidance, rules, engagementType, locationType);
  return {
    targetMargin: margin,
    loadedCostGuidance,
    baseCostGuidance,
    costGuidance: loadedCostGuidance
  };
}

function normalizeRoleDates(payload) {
  const next = { ...payload };
  if (next.startDate) {
    next.startDate = toIsoDate(next.startDate);
  }
  if (next.endDate) {
    next.endDate = toIsoDate(next.endDate);
  }
  if (next.startDate && next.duration && !next.endDate) {
    next.endDate = addWeeksAndSubtractDay(next.startDate, next.duration);
  } else if (next.startDate && next.endDate && !next.duration) {
    next.duration = weekSpanInclusive(next.startDate, next.endDate);
  }
  return next;
}

async function normalizeCostFields(payload, existing = {}) {
  const next = { ...payload };
  const shouldRecalculate =
    "billRate" in next ||
    "targetMargin" in next ||
    "engagementType" in next ||
    "roleLocation" in next ||
    "locationRequirement" in next ||
    !existing.id;
  if (!shouldRecalculate) {
    return next;
  }

  const billRate = next.billRate ?? existing.billRate ?? 0;
  const targetMargin = next.targetMargin ?? existing.targetMargin ?? 0;
  const engagementType = next.engagementType ?? existing.engagementType ?? "Full-Time";
  const locationType = next.roleLocation ?? next.locationRequirement ?? existing.roleLocation ?? existing.locationRequirement ?? "Offshore";
  const costing = await deriveCostGuidance(billRate, targetMargin, engagementType, locationType);
  next.targetMargin = costing.targetMargin;
  next.loadedCostGuidance = costing.loadedCostGuidance;
  next.baseCostGuidance = costing.baseCostGuidance;
  next.costGuidance = costing.costGuidance;
  return next;
}

async function normalizeChildRecord(collection, payload, existing = {}) {
  if (collection === "opportunityRoles" || collection === "sowRoles") {
    return normalizeCostFields({
      ...normalizeRoleDates(payload),
      quantity: 1
    }, existing);
  }
  return payload;
}

function calculateOpportunityRoleRevenue(role) {
  return Number(role.estimatedHours || 0) * Number(role.billRate || 0);
}

function refreshOpportunityTotals(opportunityId) {
  const opportunity = getCollection("opportunities").find((item) => item.id === opportunityId);
  if (!opportunity) {
    return;
  }

  const roles = getCollection("opportunityRoles").filter((role) => role.opportunityId === opportunityId);
  const roleEstimatedRevenue = Number(
    roles.reduce((sum, role) => sum + calculateOpportunityRoleRevenue(role), 0).toFixed(2)
  );

  updateRecord("opportunities", opportunityId, {
    roleEstimatedRevenue,
    weightedValue: weightedValue(opportunity.estimatedRevenue || 0, opportunity.probability || 0)
  });
}

const config = {
  opportunityRoles: {
    parentKey: "opportunityId",
    schema: z.object({
      id: z.string().optional(),
      number: z.string().optional(),
      opportunityId: z.string(),
      title: z.string().min(2),
      skill: z.string().min(2),
      subModule: z.string().optional(),
      quantity: z.coerce.number().min(1).default(1),
      engagementType: z.string().optional(),
      experienceLevel: z.string().optional(),
      startDate: z.string().optional(),
      duration: z.coerce.number().optional(),
      endDate: z.string().optional(),
      roleLocation: z.enum(["Offshore", "Onsite"]).default("Offshore"),
      estimatedHours: z.coerce.number().optional(),
      billRate: z.coerce.number().optional(),
      targetMargin: z.coerce.number().min(0).max(100).optional(),
      baseCostGuidance: z.coerce.number().optional(),
      loadedCostGuidance: z.coerce.number().optional(),
      costGuidance: z.coerce.number().optional(),
      allocationPercent: z.coerce.number().optional(),
      resourceIdentificationStatus: z.string().optional(),
      candidateResourceName: z.string().optional(),
      notes: z.string().optional()
    })
  },
  sowRoles: {
    parentKey: "sowId",
    schema: z.object({
      id: z.string().optional(),
      number: z.string().optional(),
      sowId: z.string(),
      title: z.string().min(2),
      skill: z.string().min(2),
      subModule: z.string().optional(),
      quantity: z.coerce.number().min(1).default(1),
      engagementType: z.string().optional(),
      experienceLevel: z.string().optional(),
      billingType: z.string().optional(),
      billRate: z.coerce.number().optional(),
      costRate: z.coerce.number().optional(),
      targetMargin: z.coerce.number().min(0).max(100).optional(),
      baseCostGuidance: z.coerce.number().optional(),
      loadedCostGuidance: z.coerce.number().optional(),
      startDate: z.string().optional(),
      duration: z.coerce.number().optional(),
      endDate: z.string().optional(),
      plannedAllocationPercent: z.coerce.number().optional(),
      plannedHours: z.coerce.number().optional(),
      locationRequirement: z.enum(["Offshore", "Onsite"]).default("Offshore"),
      staffingPriority: z.string().optional(),
      staffingStatus: z.string().optional(),
      remarks: z.string().optional(),
      measurementUnit: z.enum(["HOURS", "MAN_MONTHS"]).default("HOURS")
    })
  },
  deployments: {
    parentKey: "sowRoleId",
    schema: z.object({
      id: z.string().optional(),
      number: z.string().optional(),
      sowRoleId: z.string(),
      resourceId: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      allocationPercent: z.coerce.number().min(1).max(200),
      status: z.enum(["PLANNED", "ACTIVE", "ENDED", "CANCELLED"]),
      lockedCostRate: z.coerce.number(),
      lockedBillRate: z.coerce.number().optional(),
      billable: z.boolean().default(true),
      sourceOfAssignment: z.string().optional()
    })
  },
  deploymentPlans: {
    parentKey: "sowRoleId",
    schema: z.object({
      id: z.string().optional(),
      number: z.string().optional(),
      deploymentId: z.string().optional().default(""),
      sowRoleId: z.string(),
      month: z.string(),
      plannedQuantity: z.coerce.number().min(0),
      plannedUnit: z.enum(["HOURS", "MAN_MONTHS"]),
      notes: z.string().optional()
    })
  },
  actuals: {
    parentKey: "deploymentId",
    schema: z.object({
      id: z.string().optional(),
      number: z.string().optional(),
      deploymentId: z.string(),
      month: z.string(),
      actualQuantity: z.coerce.number().min(0),
      actualUnit: z.enum(["HOURS", "MAN_MONTHS"]),
      remarks: z.string().optional(),
      uploadBatchRef: z.string().optional(),
      enteredBy: z.string().optional()
    })
  },
  milestones: {
    parentKey: "sowId",
    schema: z.object({
      id: z.string().optional(),
      number: z.string().optional(),
      sowId: z.string(),
      name: z.string().min(2),
      sequence: z.coerce.number().min(1),
      plannedDate: z.string(),
      plannedAmount: z.coerce.number().min(0),
      actualDate: z.string().optional(),
      actualAmount: z.coerce.number().optional(),
      invoiceDate: z.string().optional(),
      paymentDate: z.string().optional(),
      status: z.enum(["Upcoming", "In Progress", "Invoiced", "Paid"]),
      remarks: z.string().optional()
    })
  },
  sowAttachments: {
    parentKey: "sowId",
    schema: z.object({
      id: z.string().optional(),
      number: z.string().optional(),
      sowId: z.string(),
      documentType: z.enum(["SOW Document", "Scope Document", "Project Plan", "Pricing Sheet", "Change Request", "Approval Email", "Other"]),
      fileName: z.string().min(1),
      referenceUrl: z.string().optional(),
      notes: z.string().optional()
    })
  }
};

function collectionConfig(name) {
  return config[name];
}

router.get("/:collection", (req, res) => {
  if (!collectionConfig(req.params.collection)) {
    return res.status(404).json({ message: "Unknown child collection" });
  }
  return res.json(getCollection(req.params.collection));
});

router.get("/:collection/by-parent/:parentId", (req, res) => {
  const setup = collectionConfig(req.params.collection);
  if (!setup) {
    return res.status(404).json({ message: "Unknown child collection" });
  }
  return res.json(getCollection(req.params.collection).filter((item) => item[setup.parentKey] === req.params.parentId));
});

router.post("/:collection", async (req, res) => {
  const setup = collectionConfig(req.params.collection);
  if (!setup) {
    return res.status(404).json({ message: "Unknown child collection" });
  }
  const parsed = setup.schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", issues: parsed.error.issues });
  }
  const payload = await normalizeChildRecord(req.params.collection, { ...parsed.data });
  if (!payload.number) {
    const objectMap = {
      opportunityRoles: "OpportunityRole",
      sowRoles: "SOWRole",
      deployments: "Deployment",
      deploymentPlans: "DeploymentPlan",
      actuals: "Actual",
      milestones: "Milestone",
      sowAttachments: "SOWAttachment"
    };
    payload.number = nextDocumentNumber(objectMap[req.params.collection] || req.params.collection);
  }
  if (req.params.collection === "deploymentPlans" && !payload.id) {
    const existingPlan = getCollection("deploymentPlans").find((item) =>
      String(item.month || "").slice(0, 10) === String(payload.month || "").slice(0, 10) &&
      (
        payload.deploymentId
          ? item.deploymentId === payload.deploymentId
          : !item.deploymentId && item.sowRoleId === payload.sowRoleId
      )
    );
    if (existingPlan) {
      payload.id = existingPlan.id;
      payload.number = existingPlan.number;
    }
  }
  const record = upsertRecord(req.params.collection, payload, req.user?.name || "Unknown", "Child CRUD");
  if (req.params.collection === "opportunityRoles") {
    refreshOpportunityTotals(record.opportunityId);
  }
  if (!(await ensurePersisted(res))) return;
  return res.status(201).json(record);
});

router.patch("/:collection/:id", async (req, res) => {
  const setup = collectionConfig(req.params.collection);
  if (!setup) {
    return res.status(404).json({ message: "Unknown child collection" });
  }
  const existing = getCollection(req.params.collection).find((item) => item.id === req.params.id);
  if (!existing) {
    return res.status(404).json({ message: "Record not found" });
  }
  const parsed = setup.schema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", issues: parsed.error.issues });
  }
  const normalizedChanges = await normalizeChildRecord(req.params.collection, parsed.data, existing);
  const updated = updateRecord(req.params.collection, req.params.id, normalizedChanges);
  addAudit({
    entityName: req.params.collection,
    recordId: req.params.id,
    actionType: "UPDATE",
    actor: req.user?.name || "Unknown",
    oldValue: existing,
    newValue: updated,
    sourceScreen: "Child CRUD"
  });
  if (req.params.collection === "opportunityRoles") {
    refreshOpportunityTotals(updated.opportunityId);
  }
  if (!(await ensurePersisted(res))) return;
  return res.json(updated);
});

router.delete("/:collection/:id", async (req, res) => {
  const setup = collectionConfig(req.params.collection);
  if (!setup) {
    return res.status(404).json({ message: "Unknown child collection" });
  }
  const existing = getCollection(req.params.collection).find((item) => item.id === req.params.id);
  if (!existing) {
    return res.status(404).json({ message: "Record not found" });
  }
  const deleted = deleteRecord(req.params.collection, req.params.id);
  addAudit({
    entityName: req.params.collection,
    recordId: req.params.id,
    actionType: "DELETE",
    actor: req.user?.name || "Unknown",
    oldValue: existing,
    newValue: null,
    sourceScreen: "Child CRUD"
  });
  if (!(await ensurePersisted(res))) return;
  return res.json(deleted);
});

export default router;
