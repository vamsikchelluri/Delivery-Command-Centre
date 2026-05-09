import { Router } from "express";
import { z } from "zod";
import { generateNumber, hydrateCounter } from "../lib/numbering.js";
import { addAudit, addRecord, getCollection, nextDocumentNumber, updateRecord } from "../data/store.js";
import { ensurePersisted } from "../lib/persistence.js";

const router = Router();
const clientStatuses = ["ACTIVE", "INACTIVE", "TERMINATED"];

router.get("/", async (_req, res) => {
  const accounts = [...getCollection("accounts")]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((item) => ({
      ...item,
      status: item.status || (item.active === false ? "INACTIVE" : "ACTIVE")
    }));
  hydrateCounter("ACC", accounts.map((item) => item.number));
  res.json(accounts);
});

router.post("/", async (req, res) => {
  const schema = z.object({
    name: z.string().min(2),
    industry: z.string().optional(),
    region: z.string().optional(),
    contactPerson: z.string().optional(),
    contactEmail: z.string().optional(),
    contactPhone: z.string().optional(),
    notes: z.string().optional(),
    status: z.enum(clientStatuses).default("ACTIVE")
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid account payload" });
  }

  const now = new Date().toISOString();
  const account = addRecord("accounts", {
    id: crypto.randomUUID(),
    number: nextDocumentNumber("Account"),
    active: parsed.data.status === "ACTIVE",
    createdAt: now,
    updatedAt: now,
    ...parsed.data
  });
  addAudit({
    entityName: "Client",
    recordId: account.id,
    actionType: "CREATE",
    actor: req.user?.name || "Unknown",
    newValue: account,
    sourceScreen: "Clients"
  });

  if (!(await ensurePersisted(res))) return;
  res.status(201).json(account);
});

router.patch("/:id", async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).optional(),
    industry: z.string().optional(),
    region: z.string().optional(),
    contactPerson: z.string().optional(),
    contactEmail: z.string().optional(),
    contactPhone: z.string().optional(),
    notes: z.string().optional(),
    status: z.enum(clientStatuses).optional(),
    active: z.boolean().optional()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid account payload" });
  }

  const changes = { ...parsed.data };
  if (changes.status) {
    changes.active = changes.status === "ACTIVE";
  }
  const account = updateRecord("accounts", req.params.id, changes);
  if (!account) {
    return res.status(404).json({ message: "Account not found" });
  }
  addAudit({
    entityName: "Client",
    recordId: account.id,
    actionType: "UPDATE",
    actor: req.user?.name || "Unknown",
    newValue: account,
    sourceScreen: "Clients"
  });

  if (!(await ensurePersisted(res))) return;
  res.json(account);
});

export default router;
