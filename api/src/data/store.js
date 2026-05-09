import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../prisma.js";
import { seedData } from "./seedData.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "db.json");

const collectionModels = {
  accounts: "account",
  users: "user",
  resources: "resource",
  opportunities: "opportunity",
  opportunityRoles: "opportunityRole",
  sows: "sow",
  sowRoles: "sowRole",
  deployments: "deployment",
  deploymentPlans: "deploymentPlan",
  actuals: "actual",
  milestones: "milestone",
  sowAttachments: "sowAttachment",
  auditLogs: "auditLog",
  skills: "skill",
  currencies: "currency",
  regions: "region",
  locations: "location",
  experienceLevels: "experienceLevel",
  systemConfigs: "systemConfig",
  numberRanges: "numberRange",
  appRoles: "appRole",
  permissionFeatures: "permissionFeature",
  rolePermissions: "rolePermission"
};

const dateFields = {
  resources: ["joiningDate", "availabilityDate", "deliveryRollOffDate", "notAvailableFrom", "notAvailableTo", "createdAt", "updatedAt"],
  opportunities: ["expectedCloseDate", "expectedStartDate", "expectedEndDate", "createdAt", "updatedAt"],
  opportunityRoles: ["startDate", "endDate", "createdAt", "updatedAt"],
  sows: ["startDate", "endDate", "createdAt", "updatedAt"],
  sowRoles: ["startDate", "endDate", "createdAt", "updatedAt"],
  deployments: ["startDate", "endDate", "createdAt", "updatedAt"],
  deploymentPlans: ["month", "createdAt", "updatedAt"],
  actuals: ["month", "enteredDate", "createdAt", "updatedAt"],
  milestones: ["plannedDate", "actualDate", "invoiceDate", "paymentDate", "createdAt", "updatedAt"],
  sowAttachments: ["createdAt", "updatedAt"],
  accounts: ["createdAt", "updatedAt"],
  users: ["createdAt", "updatedAt"],
  auditLogs: ["createdAt"],
  skills: ["createdAt", "updatedAt"],
  appRoles: ["createdAt", "updatedAt"],
  permissionFeatures: ["createdAt", "updatedAt"],
  rolePermissions: ["createdAt", "updatedAt"]
};

const enumDefaults = {
  resources: {
    employmentStatus: "ACTIVE",
    deliveryStatus: "AVAILABLE"
  },
  opportunities: {
    stage: "QUALIFYING"
  },
  sows: {
    billingModel: "TM_HOURLY",
    status: "DRAFT"
  },
  deployments: {
    status: "ACTIVE"
  },
  deploymentPlans: {
    plannedUnit: "HOURS"
  },
  actuals: {
    actualUnit: "HOURS"
  },
  sowRoles: {
    measurementUnit: "HOURS"
  }
};

const nullableStringFields = {
  sows: ["sourceOpportunityId", "parentSowReference"],
  sowRoles: ["sourceOpportunityRoleId"],
  deploymentPlans: ["deploymentId"],
  auditLogs: ["sourceScreen", "importReference"]
};

let db = {};
let initialized = false;
let writeQueue = Promise.resolve();

function readLocalDb() {
  if (!fs.existsSync(dbPath)) {
    return seedData;
  }
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function serializeRecord(record) {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [
    key,
    value instanceof Date ? value.toISOString() : value
  ]));
}

function serializeRows(rows) {
  return rows.map(serializeRecord);
}

function cleanForPrisma(collection, record) {
  const cleaned = { ...record };
  delete cleaned.account;
  delete cleaned.client;
  delete cleaned.roles;
  delete cleaned.deployments;
  delete cleaned.resource;
  delete cleaned.sow;
  delete cleaned.opportunity;
  delete cleaned.actuals;
  delete cleaned.milestones;
  delete cleaned.attachments;
  delete cleaned.auditTrail;
  delete cleaned.conversionHistory;
  delete cleaned.currentDeployedPercent;
  delete cleaned.currentAvailablePercent;
  delete cleaned.currentActiveSowName;
  delete cleaned.currentDeliveryStatus;
  delete cleaned.currentDeliveryStatusLabel;

  for (const field of dateFields[collection] || []) {
    if (cleaned[field] === "" || cleaned[field] === null) {
      cleaned[field] = null;
    } else if (cleaned[field]) {
      const parsed = new Date(cleaned[field]);
      cleaned[field] = Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }

  for (const field of nullableStringFields[collection] || []) {
    if (cleaned[field] === "") {
      cleaned[field] = null;
    }
  }

  for (const [field, fallback] of Object.entries(enumDefaults[collection] || {})) {
    if (!cleaned[field]) {
      cleaned[field] = fallback;
    }
  }

  return Object.fromEntries(Object.entries(cleaned).filter(([, value]) => value !== undefined));
}

function enqueueWrite(task) {
  writeQueue = writeQueue
    .then(task)
    .catch((error) => {
      console.error("Postgres write-through failed", error);
    });
  return writeQueue;
}

async function persistCreate(collection, record) {
  const model = collectionModels[collection];
  if (!model) return;
  await prisma[model].create({
    data: cleanForPrisma(collection, record)
  });
}

async function persistUpdate(collection, id, changes) {
  const model = collectionModels[collection];
  if (!model) return;
  const data = cleanForPrisma(collection, changes);
  delete data.id;
  delete data.createdAt;
  await prisma[model].update({
    where: { id },
    data
  });
}

async function persistDelete(collection, id) {
  const model = collectionModels[collection];
  if (!model) return;
  await prisma[model].delete({
    where: { id }
  });
}

async function bootstrapIfEmpty(collection, localDb) {
  const model = collectionModels[collection];
  const localRows = localDb[collection] || [];
  if (!model || !localRows.length) return;

  const count = await prisma[model].count();
  if (count > 0) return;

  await prisma[model].createMany({
    data: localRows.map((row) => cleanForPrisma(collection, row)),
    skipDuplicates: true
  });
}

export async function initializeStore() {
  if (initialized) return;
  const localDb = readLocalDb();

  // Prevent login lockout and preserve local starter records when a table is brand new.
  for (const collection of Object.keys(collectionModels)) {
    await bootstrapIfEmpty(collection, localDb);
  }

  for (const [collection, model] of Object.entries(collectionModels)) {
    db[collection] = serializeRows(await prisma[model].findMany());
  }

  initialized = true;
  console.log("Postgres-backed store initialized");
}

export function getCollection(name) {
  return db[name] || [];
}

export function addRecord(name, record) {
  const created = {
    id: record.id || crypto.randomUUID(),
    createdAt: record.createdAt || new Date().toISOString(),
    updatedAt: record.updatedAt || new Date().toISOString(),
    ...record
  };
  db[name] = db[name] || [];
  db[name].push(created);
  enqueueWrite(() => persistCreate(name, created));
  return created;
}

export function updateRecord(name, id, changes) {
  db[name] = db[name] || [];
  const index = db[name].findIndex((record) => record.id === id);

  if (index === -1) {
    return null;
  }

  const updated = {
    ...db[name][index],
    ...changes,
    updatedAt: new Date().toISOString()
  };
  db[name][index] = updated;
  enqueueWrite(() => persistUpdate(name, id, { ...changes, updatedAt: updated.updatedAt }));
  return updated;
}

export function deleteRecord(name, id) {
  db[name] = db[name] || [];
  const index = db[name].findIndex((record) => record.id === id);

  if (index === -1) {
    return null;
  }

  const [deleted] = db[name].splice(index, 1);
  enqueueWrite(() => persistDelete(name, id));
  return deleted;
}

export function addAudit({ entityName, recordId, actionType, actor = "System", oldValue, newValue, sourceScreen, importReference }) {
  const next = (db.auditLogs || []).length + 1;
  const year = new Date().getFullYear();
  const audit = {
    id: crypto.randomUUID(),
    number: `AUD-${year}-${String(next).padStart(6, "0")}`,
    entityName,
    recordId,
    actionType,
    changedFields: newValue ? Object.keys(newValue).join(", ") : "",
    oldValue: oldValue ? JSON.stringify(oldValue) : "",
    newValue: newValue ? JSON.stringify(newValue) : "",
    actor,
    sourceScreen,
    importReference,
    createdAt: new Date().toISOString()
  };
  db.auditLogs = db.auditLogs || [];
  db.auditLogs.push(audit);
  enqueueWrite(() => persistCreate("auditLogs", audit));
  return audit;
}

export function upsertRecord(name, record, actor = "System", sourceScreen = "API") {
  const existing = record.id ? getCollection(name).find((item) => item.id === record.id) : null;
  if (existing) {
    const updated = updateRecord(name, record.id, record);
    addAudit({
      entityName: name,
      recordId: record.id,
      actionType: "UPDATE",
      actor,
      oldValue: existing,
      newValue: updated,
      sourceScreen
    });
    return updated;
  }

  const created = addRecord(name, {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...record
  });
  addAudit({
    entityName: name,
    recordId: created.id,
    actionType: "CREATE",
    actor,
    newValue: created,
    sourceScreen
  });
  return created;
}

export function nextDocumentNumber(objectType) {
  const ranges = db.numberRanges || [];
  const range = ranges.find((item) => item.objectType === objectType || item.prefix === objectType);
  const year = new Date().getFullYear();

  if (!range) {
    const prefix = objectType.slice(0, 3).toUpperCase();
    return `${prefix}-${year}-${String(Date.now()).slice(-6)}`;
  }

  const number = `${range.prefix}-${range.includeYear ? `${year}-` : ""}${String(range.nextNumber).padStart(range.sequenceLength, "0")}`;
  range.nextNumber += 1;
  enqueueWrite(() => persistUpdate("numberRanges", range.id, { nextNumber: range.nextNumber }));
  return number;
}

export function getDatabaseSnapshot() {
  return db;
}

export async function flushStoreWrites() {
  await writeQueue;
}
