import { Router } from "express";
import { z } from "zod";
import { addAudit, deleteRecord, getCollection, updateRecord, upsertRecord } from "../data/store.js";

const router = Router();

const collections = {
  skills: {
    schema: z.object({
      id: z.string().optional(),
      number: z.string().optional(),
      code: z.string().optional(),
      name: z.string().min(2),
      description: z.string().optional(),
      sortOrder: z.coerce.number().min(0).default(0),
      subModules: z.array(z.union([
        z.string(),
        z.object({
          id: z.string().optional(),
          code: z.string().optional(),
          value: z.string().optional(),
          name: z.string().min(1),
          description: z.string().optional(),
          sortOrder: z.coerce.number().min(0).default(0),
          active: z.boolean().default(true)
        })
      ])).default([]),
      active: z.boolean().default(true)
    })
  },
  currencies: {
    schema: z.object({
      id: z.string().optional(),
      code: z.string().min(2),
      name: z.string().min(2),
      fxToUsd: z.coerce.number().positive(),
      active: z.boolean().default(true)
    })
  },
  regions: {
    schema: z.object({
      id: z.string().optional(),
      code: z.string().min(2),
      name: z.string().min(2),
      sortOrder: z.coerce.number().min(0).default(0),
      active: z.boolean().default(true)
    })
  },
  locations: {
    schema: z.object({
      id: z.string().optional(),
      name: z.string().min(2),
      locationType: z.enum(["Offshore", "Onsite", "Nearshore"]).default("Offshore"),
      defaultCompensationCurrency: z.string().optional(),
      defaultPaymentCurrency: z.string().optional(),
      active: z.boolean().default(true)
    })
  },
  experienceLevels: {
    schema: z.object({
      id: z.string().optional(),
      name: z.string().min(2),
      fromYears: z.coerce.number().min(0).default(0),
      toYears: z.coerce.number().min(0).default(0),
      active: z.boolean().default(true)
    })
  },
  systemConfigs: {
    schema: z.object({
      id: z.string().optional(),
      key: z.string().min(2),
      value: z.string().min(1),
      description: z.string().optional()
    })
  },
  numberRanges: {
    schema: z.object({
      id: z.string().optional(),
      objectType: z.string().min(2),
      prefix: z.string().min(1),
      sequenceLength: z.coerce.number().min(3).max(12),
      nextNumber: z.coerce.number().min(1),
      includeYear: z.boolean().default(true),
      active: z.boolean().default(true)
    })
  },
  appRoles: {
    schema: z.object({
      id: z.string().optional(),
      name: z.string().min(2),
      canViewCost: z.boolean().default(false),
      canViewMargin: z.boolean().default(false),
      active: z.boolean().default(true)
    })
  },
  users: {
    schema: z.object({
      id: z.string().optional(),
      number: z.string().optional(),
      name: z.string().min(2),
      email: z.string().email(),
      role: z.string().min(2),
      canViewCost: z.boolean().default(false),
      canViewMargin: z.boolean().default(false)
    })
  }
};

router.get("/:collection", (req, res) => {
  if (!collections[req.params.collection]) {
    return res.status(404).json({ message: "Unknown admin collection" });
  }

  return res.json(getCollection(req.params.collection));
});

router.post("/:collection", (req, res) => {
  const config = collections[req.params.collection];
  if (!config) {
    return res.status(404).json({ message: "Unknown admin collection" });
  }

  const parsed = config.schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", issues: parsed.error.issues });
  }

  const record = upsertRecord(req.params.collection, parsed.data, req.user?.name || "Unknown", "Admin");
  return res.status(201).json(record);
});

router.patch("/:collection/:id", (req, res) => {
  const config = collections[req.params.collection];
  if (!config) {
    return res.status(404).json({ message: "Unknown admin collection" });
  }

  const existing = getCollection(req.params.collection).find((item) => item.id === req.params.id);
  if (!existing) {
    return res.status(404).json({ message: "Record not found" });
  }

  const parsed = config.schema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", issues: parsed.error.issues });
  }

  const updated = updateRecord(req.params.collection, req.params.id, parsed.data);
  addAudit({
    entityName: req.params.collection,
    recordId: req.params.id,
    actionType: "UPDATE",
    actor: req.user?.name || "Unknown",
    oldValue: existing,
    newValue: updated,
    sourceScreen: "Admin"
  });

  return res.json(updated);
});

router.delete("/:collection/:id", (req, res) => {
  const config = collections[req.params.collection];
  if (!config) {
    return res.status(404).json({ message: "Unknown admin collection" });
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
    newValue: deleted,
    sourceScreen: "Admin"
  });

  return res.json(deleted);
});

router.get("/audit/logs", (_req, res) => {
  return res.json(getCollection("auditLogs"));
});

export default router;
