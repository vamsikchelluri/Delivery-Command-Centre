import { Router } from "express";
import { z } from "zod";
import { addAudit, addRecord, deleteRecord, getCollection, nextDocumentNumber, updateRecord, upsertRecord } from "../data/store.js";
import { hashPassword } from "../lib/auth.js";
import { DEFAULT_OVERHEAD_RULES, OVERHEAD_RULES_CONFIG_KEY, normalizeOverheadRule } from "../lib/overheadRules.js";
import { prisma } from "../prisma.js";

const router = Router();

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function stripUndefined(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}

function sanitizeUser(user) {
  if (!user) return user;
  const { passwordHash: _passwordHash, temporaryPassword: _temporaryPassword, ...safeUser } = user;
  return safeUser;
}

function sanitizeUsers(users) {
  return users.map(sanitizeUser);
}

const postgresAdminCollections = {
  skills: {
    model: "skill",
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  },
  currencies: {
    model: "currency",
    orderBy: { code: "asc" }
  },
  regions: {
    model: "region",
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  },
  locations: {
    model: "location",
    orderBy: { name: "asc" }
  },
  experienceLevels: {
    model: "experienceLevel",
    orderBy: [{ fromYears: "asc" }, { name: "asc" }]
  },
  systemConfigs: {
    model: "systemConfig",
    orderBy: { key: "asc" }
  },
  numberRanges: {
    model: "numberRange",
    orderBy: { objectType: "asc" }
  },
  appRoles: {
    model: "appRole",
    orderBy: { name: "asc" }
  },
  permissionFeatures: {
    model: "permissionFeature",
    orderBy: [{ category: "asc" }, { name: "asc" }]
  }
};

async function addAuditToPostgres({ entityName, recordId, actionType, actor = "System", oldValue, newValue, sourceScreen, importReference }) {
  const year = new Date().getFullYear();
  return prisma.auditLog.create({
    data: {
      number: `AUD-${year}-${Date.now()}`,
      entityName,
      recordId,
      actionType,
      changedFields: newValue ? Object.keys(newValue).join(", ") : "",
      oldValue: oldValue ? JSON.stringify(oldValue) : undefined,
      newValue: newValue ? JSON.stringify(newValue) : undefined,
      actor,
      sourceScreen,
      importReference
    }
  });
}

async function validateUserRole(roleName) {
  const role = await prisma.appRole.findUnique({
    where: { name: roleName }
  });
  return Boolean(role?.active);
}

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
  permissionFeatures: {
    schema: z.object({
      id: z.string().optional(),
      key: z.string().min(2),
      name: z.string().min(2),
      category: z.string().optional(),
      actions: z.array(z.string().min(1)).default(["view"])
    })
  },
  rolePermissions: {
    schema: z.object({
      id: z.string().optional(),
      roleId: z.string().optional(),
      roleName: z.string().min(2),
      featureKey: z.string().min(2),
      action: z.string().min(1),
      allowed: z.boolean().default(false)
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
      canViewMargin: z.boolean().default(false),
      temporaryPassword: z.string().min(8).optional().or(z.literal(""))
    })
  }
};

function parseOverheadRules(value) {
  if (!value) {
    return DEFAULT_OVERHEAD_RULES;
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(normalizeOverheadRule) : DEFAULT_OVERHEAD_RULES;
  } catch (_error) {
    return DEFAULT_OVERHEAD_RULES;
  }
}

router.get("/overhead-rules", asyncRoute(async (_req, res) => {
  const config = await prisma.systemConfig.upsert({
    where: { key: OVERHEAD_RULES_CONFIG_KEY },
    update: {},
    create: {
      id: "cfg_engagement_overhead_rules",
      key: OVERHEAD_RULES_CONFIG_KEY,
      value: JSON.stringify(DEFAULT_OVERHEAD_RULES),
      description: "Engagement type and location type overhead rules"
    }
  });
  return res.json(parseOverheadRules(config.value));
}));

router.patch("/overhead-rules", asyncRoute(async (req, res) => {
  const schema = z.object({
    rules: z.array(z.object({
      id: z.string().optional(),
      engagementType: z.string().min(2),
      locationType: z.string().min(2),
      overheadPercent: z.coerce.number().min(0).max(500).default(0),
      hourlyAddOn: z.coerce.number().min(0).max(10000).default(0),
      active: z.boolean().default(true)
    }))
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid overhead rule payload", issues: parsed.error.issues });
  }

  const rules = parsed.data.rules.map(normalizeOverheadRule);
  const existing = await prisma.systemConfig.findUnique({ where: { key: OVERHEAD_RULES_CONFIG_KEY } });
  const record = await prisma.systemConfig.upsert({
    where: { key: OVERHEAD_RULES_CONFIG_KEY },
    update: {
      value: JSON.stringify(rules),
      description: "Engagement type and location type overhead rules"
    },
    create: {
      id: "cfg_engagement_overhead_rules",
      key: OVERHEAD_RULES_CONFIG_KEY,
      value: JSON.stringify(rules),
      description: "Engagement type and location type overhead rules"
    }
  });
  await addAuditToPostgres({
    entityName: "overheadRules",
    recordId: record.id,
    actionType: existing ? "UPDATE" : "CREATE",
    actor: req.user?.name || "Unknown",
    oldValue: existing ? parseOverheadRules(existing.value) : undefined,
    newValue: rules,
    sourceScreen: "Admin"
  });
  return res.json(rules);
}));

router.get("/role-permissions/matrix", asyncRoute(async (_req, res) => {
  const [roles, features, permissions] = await Promise.all([
    prisma.appRole.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.permissionFeature.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.rolePermission.findMany({ orderBy: [{ roleName: "asc" }, { featureKey: "asc" }, { action: "asc" }] })
  ]);

  return res.json({ roles, features, permissions });
}));

router.patch("/role-permissions/matrix", asyncRoute(async (req, res) => {
  const schema = z.object({
    roleName: z.string().min(2),
    permissions: z.array(z.object({
      featureKey: z.string().min(2),
      action: z.string().min(1),
      allowed: z.boolean()
    }))
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid role permission payload", issues: parsed.error.issues });
  }

  const role = await prisma.appRole.findUnique({
    where: { name: parsed.data.roleName }
  });
  if (!role) {
    return res.status(404).json({ message: "Role not found" });
  }

  const existingPermissions = await prisma.rolePermission.findMany({
    where: { roleName: role.name }
  });
  const existingByKey = new Map(existingPermissions.map((permission) => [`${permission.featureKey}:${permission.action}`, permission]));
  const changes = parsed.data.permissions.filter((permission) => {
    const existing = existingByKey.get(`${permission.featureKey}:${permission.action}`);
    return !existing || Boolean(existing.allowed) !== Boolean(permission.allowed) || existing.roleId !== role.id;
  });
  let updated = existingPermissions;

  if (changes.length) {
    await prisma.$transaction(changes.map((permission) =>
      prisma.rolePermission.upsert({
        where: {
          roleName_featureKey_action: {
            roleName: role.name,
            featureKey: permission.featureKey,
            action: permission.action
          }
        },
        update: {
          roleId: role.id,
          allowed: permission.allowed
        },
        create: {
          id: `perm_${role.id}_${permission.featureKey}_${permission.action}`.replace(/[^a-zA-Z0-9_]/g, "_"),
          roleId: role.id,
          roleName: role.name,
          featureKey: permission.featureKey,
          action: permission.action,
          allowed: permission.allowed
        }
      })
    ));
    updated = await prisma.rolePermission.findMany({
      where: { roleName: role.name },
      orderBy: [{ featureKey: "asc" }, { action: "asc" }]
    });
  }

  if (changes.length) {
    await addAuditToPostgres({
      entityName: "rolePermissions",
      recordId: role.id,
      actionType: "UPDATE",
      actor: req.user?.name || "Unknown",
      oldValue: { roleName: role.name, changedCount: changes.length },
      newValue: { roleName: role.name, changedCount: changes.length },
      sourceScreen: "Admin"
    });
  }

  return res.json({ roleName: role.name, permissions: updated });
}));

router.get("/:collection", asyncRoute(async (req, res) => {
  if (!collections[req.params.collection]) {
    return res.status(404).json({ message: "Unknown admin collection" });
  }

  const postgresConfig = postgresAdminCollections[req.params.collection];
  if (postgresConfig) {
    return res.json(await prisma[postgresConfig.model].findMany({ orderBy: postgresConfig.orderBy }));
  }

  const rows = getCollection(req.params.collection);
  return res.json(req.params.collection === "users" ? sanitizeUsers(rows) : rows);
}));

router.post("/:collection", asyncRoute(async (req, res) => {
  const config = collections[req.params.collection];
  if (!config) {
    return res.status(404).json({ message: "Unknown admin collection" });
  }

  const parsed = config.schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", issues: parsed.error.issues });
  }

  if (req.params.collection === "users" && !(await validateUserRole(parsed.data.role))) {
    return res.status(400).json({ message: "User role must be selected from active Admin roles." });
  }
  if (req.params.collection === "users" && !parsed.data.temporaryPassword) {
    return res.status(400).json({ message: "Temporary password is required when creating a user." });
  }
  if (req.params.collection === "users" && getCollection("users").some((user) => user.email === parsed.data.email)) {
    return res.status(400).json({ message: "A user with this email already exists." });
  }

  const payload = { ...parsed.data };
  if (req.params.collection === "users") {
    payload.passwordHash = await hashPassword(parsed.data.temporaryPassword);
    payload.number = payload.number || nextDocumentNumber("User");
    delete payload.temporaryPassword;
  }

  const postgresConfig = postgresAdminCollections[req.params.collection];
  if (req.params.collection === "users") {
    const now = new Date().toISOString();
    const record = addRecord("users", {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...payload
    });
    addAudit({
      entityName: "users",
      recordId: record.id,
      actionType: "CREATE",
      actor: req.user?.name || "Unknown",
      newValue: sanitizeUser(record),
      sourceScreen: "Admin"
    });
    return res.status(201).json(sanitizeUser(record));
  }

  if (postgresConfig) {
    const record = await prisma[postgresConfig.model].create({
      data: stripUndefined(payload)
    });
    await addAuditToPostgres({
      entityName: req.params.collection,
      recordId: record.id,
      actionType: "CREATE",
      actor: req.user?.name || "Unknown",
      newValue: record,
      sourceScreen: "Admin"
    });
    return res.status(201).json(record);
  }

  const record = upsertRecord(req.params.collection, payload, req.user?.name || "Unknown", "Admin");
  return res.status(201).json(req.params.collection === "users" ? sanitizeUser(record) : record);
}));

router.patch("/:collection/:id", asyncRoute(async (req, res) => {
  const config = collections[req.params.collection];
  if (!config) {
    return res.status(404).json({ message: "Unknown admin collection" });
  }

  const postgresConfig = postgresAdminCollections[req.params.collection];
  if (postgresConfig) {
    const existing = await prisma[postgresConfig.model].findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: "Record not found" });
    }
    const parsed = config.schema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid payload", issues: parsed.error.issues });
    }
    if (req.params.collection === "users" && parsed.data.role && !(await validateUserRole(parsed.data.role))) {
      return res.status(400).json({ message: "User role must be selected from active Admin roles." });
    }
    const payload = { ...parsed.data };
    if (req.params.collection === "users") {
      if (payload.temporaryPassword) {
        payload.passwordHash = await hashPassword(payload.temporaryPassword);
      }
      delete payload.temporaryPassword;
    }
    const updated = await prisma[postgresConfig.model].update({
      where: { id: req.params.id },
      data: stripUndefined(payload)
    });
    await addAuditToPostgres({
      entityName: req.params.collection,
      recordId: req.params.id,
      actionType: "UPDATE",
      actor: req.user?.name || "Unknown",
      oldValue: existing,
      newValue: updated,
      sourceScreen: "Admin"
    });
    return res.json(updated);
  }

  const existing = getCollection(req.params.collection).find((item) => item.id === req.params.id);
  if (!existing) {
    return res.status(404).json({ message: "Record not found" });
  }

  const parsed = config.schema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", issues: parsed.error.issues });
  }
  if (req.params.collection === "users" && parsed.data.role && !(await validateUserRole(parsed.data.role))) {
    return res.status(400).json({ message: "User role must be selected from active Admin roles." });
  }
  if (req.params.collection === "users" && parsed.data.email && getCollection("users").some((user) => user.email === parsed.data.email && user.id !== req.params.id)) {
    return res.status(400).json({ message: "A user with this email already exists." });
  }

  const payload = { ...parsed.data };
  if (req.params.collection === "users") {
    if (payload.temporaryPassword) {
      payload.passwordHash = await hashPassword(payload.temporaryPassword);
    }
    delete payload.temporaryPassword;
  }

  const updated = updateRecord(req.params.collection, req.params.id, payload);
  addAudit({
    entityName: req.params.collection,
    recordId: req.params.id,
    actionType: "UPDATE",
    actor: req.user?.name || "Unknown",
    oldValue: req.params.collection === "users" ? sanitizeUser(existing) : existing,
    newValue: req.params.collection === "users" ? sanitizeUser(updated) : updated,
    sourceScreen: "Admin"
  });

  return res.json(req.params.collection === "users" ? sanitizeUser(updated) : updated);
}));

router.delete("/:collection/:id", asyncRoute(async (req, res) => {
  const config = collections[req.params.collection];
  if (!config) {
    return res.status(404).json({ message: "Unknown admin collection" });
  }

  const postgresConfig = postgresAdminCollections[req.params.collection];
  if (postgresConfig) {
    const existing = await prisma[postgresConfig.model].findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: "Record not found" });
    }
    const deleted = await prisma[postgresConfig.model].delete({ where: { id: req.params.id } });
    await addAuditToPostgres({
      entityName: req.params.collection,
      recordId: req.params.id,
      actionType: "DELETE",
      actor: req.user?.name || "Unknown",
      oldValue: existing,
      newValue: deleted,
      sourceScreen: "Admin"
    });
    return res.json(deleted);
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
    oldValue: req.params.collection === "users" ? sanitizeUser(existing) : existing,
    newValue: req.params.collection === "users" ? sanitizeUser(deleted) : deleted,
    sourceScreen: "Admin"
  });

  return res.json(req.params.collection === "users" ? sanitizeUser(deleted) : deleted);
}));

router.get("/audit/logs", asyncRoute(async (_req, res) => {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" }
  });
  return res.json(logs);
}));

export default router;
