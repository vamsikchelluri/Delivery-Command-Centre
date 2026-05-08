import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seedData } from "./seedData.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "db.json");

function normalizeOpportunity(opportunity) {
  const seededOpportunity = seedData.opportunities.find((item) => item.id === opportunity.id);
  return {
    source: seededOpportunity?.source || opportunity.source || "Existing Client",
    targetMargin: seededOpportunity?.targetMargin ?? opportunity.targetMargin ?? 0,
    notesHistory: seededOpportunity?.notesHistory || opportunity.notesHistory || []
  };
}

function mergeSeedRecords(currentRecords = [], seededRecords = []) {
  const merged = [...currentRecords];
  for (const seededRecord of seededRecords) {
    if (!merged.some((record) => record.id === seededRecord.id)) {
      merged.push(seededRecord);
    }
  }
  return merged;
}

function ensureDb() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(seedData, null, 2), "utf8");
    return;
  }

  const current = JSON.parse(fs.readFileSync(dbPath, "utf8"));
  let changed = false;

  for (const [key, value] of Object.entries(seedData)) {
    if (!current[key]) {
      current[key] = value;
      changed = true;
    }
  }

  for (const key of ["skills", "currencies", "regions", "locations", "experienceLevels", "systemConfigs", "numberRanges", "appRoles", "users"]) {
    const merged = mergeSeedRecords(current[key], seedData[key]);
    if (JSON.stringify(merged) !== JSON.stringify(current[key])) {
      current[key] = merged;
      changed = true;
    }
  }

  if (current.opportunities) {
    current.opportunities = current.opportunities.map((opportunity) => {
      const normalized = normalizeOpportunity(opportunity);
      const hasChanges =
        opportunity.source !== normalized.source ||
        opportunity.targetMargin !== normalized.targetMargin ||
        JSON.stringify(opportunity.notesHistory || []) !== JSON.stringify(normalized.notesHistory);

      if (hasChanges) {
        changed = true;
        return {
          ...opportunity,
          ...normalized
        };
      }

      return opportunity;
    });
  }

  if (current.opportunityRoles) {
    current.opportunityRoles = current.opportunityRoles.map((role) => {
      const seededRole = seedData.opportunityRoles.find((item) => item.id === role.id);
      const nextRoleLocation = seededRole?.roleLocation || role.roleLocation || "Offshore";
      if (role.roleLocation !== nextRoleLocation) {
        changed = true;
        return {
          ...role,
          roleLocation: nextRoleLocation
        };
      }
      return role;
    });
  }

  if (current.sowRoles) {
    current.sowRoles = current.sowRoles.map((role) => {
      const seededRole = seedData.sowRoles.find((item) => item.id === role.id);
      const nextLocationRequirement = seededRole?.locationRequirement || role.locationRequirement || "Offshore";
      if (role.locationRequirement !== nextLocationRequirement) {
        changed = true;
        return {
          ...role,
          locationRequirement: nextLocationRequirement
        };
      }
      return role;
    });
  }

  if (changed) {
    fs.writeFileSync(dbPath, JSON.stringify(current, null, 2), "utf8");
  }
}

function loadDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function saveDb(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf8");
}

export function getCollection(name) {
  const db = loadDb();
  return db[name] || [];
}

export function addRecord(name, record) {
  const db = loadDb();
  db[name] = db[name] || [];
  db[name].push(record);
  saveDb(db);
  return record;
}

export function updateRecord(name, id, changes) {
  const db = loadDb();
  db[name] = db[name] || [];
  const index = db[name].findIndex((record) => record.id === id);

  if (index === -1) {
    return null;
  }

  db[name][index] = {
    ...db[name][index],
    ...changes,
    updatedAt: new Date().toISOString()
  };
  saveDb(db);
  return db[name][index];
}

export function deleteRecord(name, id) {
  const db = loadDb();
  db[name] = db[name] || [];
  const index = db[name].findIndex((record) => record.id === id);

  if (index === -1) {
    return null;
  }

  const [deleted] = db[name].splice(index, 1);
  saveDb(db);
  return deleted;
}

export function addAudit({ entityName, recordId, actionType, actor = "System", oldValue, newValue, sourceScreen, importReference }) {
  const db = loadDb();
  db.auditLogs = db.auditLogs || [];
  const next = db.auditLogs.length + 1;
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
  db.auditLogs.push(audit);
  saveDb(db);
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
  const db = loadDb();
  const ranges = db.numberRanges || [];
  const range = ranges.find((item) => item.objectType === objectType || item.prefix === objectType);
  const year = new Date().getFullYear();

  if (!range) {
    const prefix = objectType.slice(0, 3).toUpperCase();
    return `${prefix}-${year}-${String(Date.now()).slice(-6)}`;
  }

  const number = `${range.prefix}-${range.includeYear ? `${year}-` : ""}${String(range.nextNumber).padStart(range.sequenceLength, "0")}`;
  range.nextNumber += 1;
  saveDb(db);
  return number;
}

export function getDatabaseSnapshot() {
  return loadDb();
}
