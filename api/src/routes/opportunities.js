import { Router } from "express";
import { z } from "zod";
import { weightedValue } from "../lib/dashboard.js";
import { generateNumber, hydrateCounter } from "../lib/numbering.js";
import { addAudit, addRecord, getCollection, nextDocumentNumber, updateRecord } from "../data/store.js";
import { ensurePersisted } from "../lib/persistence.js";

const router = Router();
const stageDefaults = {
  QUALIFYING: 20,
  PROPOSED: 40,
  NEGOTIATING: 70,
  SOW: 90,
  WON: 100,
  LOST: 0
};

function stageNote(previousStage, nextStage, actor) {
  return {
    id: crypto.randomUUID(),
    author: actor,
    timestamp: new Date().toISOString(),
    note: `Stage changed from ${previousStage} to ${nextStage}.`
  };
}

router.get("/", async (_req, res) => {
  const opportunities = [...getCollection("opportunities")]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((opportunity) => ({
      ...opportunity,
      client: getCollection("accounts").find((account) => account.id === opportunity.accountId) || null,
      roles: getCollection("opportunityRoles").filter((role) => role.opportunityId === opportunity.id)
    }));
  hydrateCounter("OPP", opportunities.map((item) => item.number));
  res.json(opportunities);
});

router.get("/:id", async (req, res) => {
  const opportunity = getCollection("opportunities").find((item) => item.id === req.params.id);

  if (!opportunity) {
    return res.status(404).json({ message: "Opportunity not found" });
  }

  res.json({
    ...opportunity,
    client: getCollection("accounts").find((account) => account.id === opportunity.accountId) || null,
    roles: getCollection("opportunityRoles").filter((role) => role.opportunityId === opportunity.id),
    conversionHistory: getCollection("sows").filter((sow) => sow.sourceOpportunityId === opportunity.id),
    auditTrail: getCollection("auditLogs").filter((item) => item.recordId === opportunity.id)
  });
});

router.post("/", async (req, res) => {
  const schema = z.object({
    accountId: z.string().min(1),
    name: z.string().min(2),
    stage: z.enum(["QUALIFYING", "PROPOSED", "NEGOTIATING", "SOW", "WON", "LOST"]),
    probability: z.coerce.number().min(0).max(100),
    estimatedRevenue: z.coerce.number().min(0),
    currency: z.string().min(1),
    expectedCloseDate: z.string(),
    expectedStartDate: z.string(),
    expectedEndDate: z.string().optional(),
    source: z.string().optional(),
    targetMargin: z.coerce.number().min(0).max(100).optional(),
    accountManagerName: z.string().min(2),
    deliveryManagerName: z.string().min(2),
    dealType: z.string().optional(),
    notes: z.string().optional(),
    notesHistory: z.array(z.object({
      id: z.string(),
      author: z.string(),
      timestamp: z.string(),
      note: z.string()
    })).optional().default([])
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid opportunity payload", issues: parsed.error.issues });
  }

  const now = new Date().toISOString();
  const probability = parsed.data.stage === "WON"
    ? 100
    : parsed.data.stage === "LOST"
      ? 0
      : parsed.data.probability ?? stageDefaults[parsed.data.stage];
  const opportunity = addRecord("opportunities", {
    id: crypto.randomUUID(),
    ...parsed.data,
    number: nextDocumentNumber("Opportunity"),
    probability,
    roleEstimatedRevenue: 0,
    weightedValue: weightedValue(parsed.data.estimatedRevenue, probability),
    expectedCloseDate: new Date(parsed.data.expectedCloseDate).toISOString(),
    expectedStartDate: new Date(parsed.data.expectedStartDate).toISOString(),
    expectedEndDate: parsed.data.expectedEndDate ? new Date(parsed.data.expectedEndDate).toISOString() : null,
    createdAt: now,
    updatedAt: now
  });
  addAudit({
    entityName: "Opportunity",
    recordId: opportunity.id,
    actionType: "CREATE",
    actor: req.user?.name || "Unknown",
    newValue: opportunity,
    sourceScreen: "Opportunity"
  });

  if (!(await ensurePersisted(res))) return;
  res.status(201).json(opportunity);
});

router.patch("/:id", async (req, res) => {
  const schema = z.object({
    accountId: z.string().min(1).optional(),
    name: z.string().min(2).optional(),
    stage: z.enum(["QUALIFYING", "PROPOSED", "NEGOTIATING", "SOW", "WON", "LOST"]).optional(),
    probability: z.coerce.number().min(0).max(100).optional(),
    estimatedRevenue: z.coerce.number().min(0).optional(),
    currency: z.string().min(1).optional(),
    expectedCloseDate: z.string().optional(),
    expectedStartDate: z.string().optional(),
    expectedEndDate: z.string().optional(),
    source: z.string().optional(),
    targetMargin: z.coerce.number().min(0).max(100).optional(),
    accountManagerName: z.string().min(2).optional(),
    deliveryManagerName: z.string().min(2).optional(),
    dealType: z.string().optional(),
    notes: z.string().optional(),
    notesHistory: z.array(z.object({
      id: z.string(),
      author: z.string(),
      timestamp: z.string(),
      note: z.string()
    })).optional()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid opportunity payload", issues: parsed.error.issues });
  }

  const existing = getCollection("opportunities").find((item) => item.id === req.params.id);
  if (!existing) {
    return res.status(404).json({ message: "Opportunity not found" });
  }

  const changes = { ...parsed.data };
  if (changes.stage) {
    const stageDefault = stageDefaults[changes.stage];
    if (changes.probability === undefined || changes.stage === "WON" || changes.stage === "LOST") {
      changes.probability = stageDefault;
    }
  }
  if (changes.estimatedRevenue !== undefined || changes.probability !== undefined) {
    const estimatedRevenue = changes.estimatedRevenue ?? existing?.estimatedRevenue ?? 0;
    const probability = changes.probability ?? existing?.probability ?? 0;
    changes.weightedValue = weightedValue(estimatedRevenue, probability);
  }

  for (const key of ["expectedCloseDate", "expectedStartDate", "expectedEndDate"]) {
    if (changes[key]) {
      changes[key] = new Date(changes[key]).toISOString();
    }
  }

  if (changes.stage && changes.stage !== existing.stage) {
    changes.notesHistory = [
      ...(changes.notesHistory || existing.notesHistory || []),
      stageNote(existing.stage, changes.stage, req.user?.name || "System")
    ];
  }

  const opportunity = updateRecord("opportunities", req.params.id, changes);
  addAudit({
    entityName: "Opportunity",
    recordId: opportunity.id,
    actionType: "UPDATE",
    actor: req.user?.name || "Unknown",
    oldValue: existing,
    newValue: opportunity,
    sourceScreen: "Opportunity"
  });

  if (!(await ensurePersisted(res))) return;
  res.json(opportunity);
});

export default router;
