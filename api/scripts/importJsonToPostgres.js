import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultJsonPath = path.resolve(__dirname, "../src/data/db.json");
const args = new Set(process.argv.slice(2));
const shouldReset = args.has("--reset");
const masterDataOnly = args.has("--master-data-only");
const jsonPathArg = process.argv.find((arg) => arg.startsWith("--file="));
const jsonPath = jsonPathArg ? path.resolve(jsonPathArg.replace("--file=", "")) : defaultJsonPath;

function asDate(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function stripUndefined(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}

function cleanEnum(value, fallback) {
  return value || fallback;
}

async function createMany(modelName, records) {
  const data = records.map(stripUndefined);
  if (!data.length) return;
  await prisma[modelName].createMany({ data, skipDuplicates: true });
  console.log(`Imported ${data.length} ${modelName}`);
}

async function resetDatabase() {
  const masterDataDeleteOrder = [
    "rolePermission",
    "permissionFeature",
    "appRole",
    "skill",
    "currency",
    "fxRate",
    "masterDataItem",
    "region",
    "location",
    "experienceLevel",
    "systemConfig",
    "numberRange"
  ];
  const deleteOrder = masterDataOnly ? masterDataDeleteOrder : [
    "auditLog",
    "actual",
    "deploymentPlan",
    "deployment",
    "milestone",
    "sowAttachment",
    "sowRole",
    "sow",
    "opportunityRole",
    "opportunity",
    "resource",
    "user",
    "rolePermission",
    "permissionFeature",
    "appRole",
    "skill",
    "currency",
    "fxRate",
    "masterDataItem",
    "region",
    "location",
    "experienceLevel",
    "systemConfig",
    "numberRange",
    "account"
  ];

  for (const modelName of deleteOrder) {
    await prisma[modelName].deleteMany();
  }
}

async function main() {
  const db = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  console.log(`Importing ${jsonPath}`);
  const accountIds = new Set((db.accounts || []).map((row) => row.id));
  const validOpportunities = (db.opportunities || []).filter((row) => {
    const isValid = accountIds.has(row.accountId);
    if (!isValid) {
      console.warn(`Skipping opportunity ${row.number || row.id} because accountId ${row.accountId || "-"} is missing.`);
    }
    return isValid;
  });
  const validOpportunityIds = new Set(validOpportunities.map((row) => row.id));
  const validOpportunityRoles = (db.opportunityRoles || []).filter((row) => {
    const isValid = validOpportunityIds.has(row.opportunityId);
    if (!isValid) {
      console.warn(`Skipping opportunity role ${row.number || row.id} because opportunityId ${row.opportunityId || "-"} is missing.`);
    }
    return isValid;
  });
  const validOpportunityRoleIds = new Set(validOpportunityRoles.map((row) => row.id));

  if (shouldReset) {
    console.log("Resetting target PostgreSQL tables...");
    await resetDatabase();
  }

  await createMany("appRole", (db.appRoles || []).map((row) => ({
    id: row.id,
    name: row.name,
    canViewCost: Boolean(row.canViewCost),
    canViewMargin: Boolean(row.canViewMargin),
    active: row.active !== false,
    createdAt: asDate(row.createdAt),
    updatedAt: asDate(row.updatedAt)
  })));

  await createMany("permissionFeature", (db.permissionFeatures || []).map((row) => ({
    id: row.id,
    key: row.key,
    name: row.name,
    category: row.category,
    actions: row.actions || [],
    createdAt: asDate(row.createdAt),
    updatedAt: asDate(row.updatedAt)
  })));

  await createMany("rolePermission", (db.rolePermissions || []).map((row) => ({
    id: row.id,
    roleId: row.roleId,
    roleName: row.roleName,
    featureKey: row.featureKey,
    action: row.action,
    allowed: Boolean(row.allowed),
    createdAt: asDate(row.createdAt),
    updatedAt: asDate(row.updatedAt)
  })));

  await createMany("skill", (db.skills || []).map((row) => ({
    id: row.id,
    number: row.number,
    code: row.code,
    name: row.name,
    description: row.description,
    sortOrder: row.sortOrder,
    subModules: row.subModules ?? [],
    active: row.active !== false,
    createdAt: asDate(row.createdAt),
    updatedAt: asDate(row.updatedAt)
  })));

  await createMany("currency", (db.currencies || []).map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    fxToUsd: Number(row.fxToUsd || 1),
    active: row.active !== false
  })));

  await createMany("fxRate", (db.fxRates || []).map((row) => ({
    id: row.id,
    currencyCode: row.currencyCode,
    rateToUsd: Number(row.rateToUsd || row.fxToUsd || 1),
    validFrom: asDate(row.validFrom) || new Date("2026-01-01T00:00:00.000Z"),
    validTo: asDate(row.validTo),
    active: row.active !== false,
    createdAt: asDate(row.createdAt),
    updatedAt: asDate(row.updatedAt)
  })));

  await createMany("masterDataItem", (db.masterDataItems || []).map((row) => ({
    id: row.id,
    category: row.category,
    code: row.code,
    label: row.label,
    description: row.description,
    sortOrder: Number(row.sortOrder || 0),
    active: row.active !== false,
    metadata: row.metadata ?? undefined,
    createdAt: asDate(row.createdAt),
    updatedAt: asDate(row.updatedAt)
  })));

  await createMany("region", (db.regions || []).map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    sortOrder: Number(row.sortOrder || 0),
    active: row.active !== false
  })));

  await createMany("location", (db.locations || []).map((row) => ({
    id: row.id,
    name: row.name,
    locationType: row.locationType || "Offshore",
    defaultCompensationCurrency: row.defaultCompensationCurrency,
    defaultPaymentCurrency: row.defaultPaymentCurrency,
    active: row.active !== false
  })));

  await createMany("experienceLevel", (db.experienceLevels || []).map((row) => ({
    id: row.id,
    name: row.name,
    fromYears: Number(row.fromYears || 0),
    toYears: Number(row.toYears || 0),
    active: row.active !== false
  })));

  await createMany("systemConfig", (db.systemConfigs || []).map((row) => ({
    id: row.id,
    key: row.key,
    value: row.value,
    description: row.description
  })));

  await createMany("numberRange", (db.numberRanges || []).map((row) => ({
    id: row.id,
    objectType: row.objectType,
    prefix: row.prefix,
    sequenceLength: Number(row.sequenceLength || 6),
    nextNumber: Number(row.nextNumber || 1),
    includeYear: row.includeYear !== false,
    active: row.active !== false
  })));

  if (masterDataOnly) {
    console.log("Master data and authorization import completed.");
    return;
  }

  await createMany("account", (db.accounts || []).map((row) => ({
    id: row.id,
    number: row.number,
    name: row.name,
    status: row.status,
    industry: row.industry,
    region: row.region,
    contactPerson: row.contactPerson,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    notes: row.notes,
    active: row.active !== false,
    createdAt: asDate(row.createdAt),
    updatedAt: asDate(row.updatedAt)
  })));

  await createMany("user", (db.users || []).map((row) => ({
    id: row.id,
    number: row.number,
    name: row.name,
    email: row.email,
    passwordHash: row.passwordHash,
    role: row.role,
    deliveryRoles: row.deliveryRoles || [],
    canViewCost: Boolean(row.canViewCost),
    canViewMargin: Boolean(row.canViewMargin),
    createdAt: asDate(row.createdAt),
    updatedAt: asDate(row.updatedAt)
  })));

  await createMany("resource", (db.resources || []).map((row) => ({
    id: row.id,
    number: row.number,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    contactEmail: row.contactEmail,
    contactNumber: row.contactNumber,
    primarySkill: row.primarySkill,
    subModule: row.subModule,
    primarySubModules: row.primarySubModules || [],
    secondarySkills: row.secondarySkills || [],
    experienceLevel: row.experienceLevel,
    location: row.location,
    locationType: row.locationType,
    employmentType: row.employmentType,
    employmentStatus: cleanEnum(row.employmentStatus, "ACTIVE"),
    deliveryStatus: cleanEnum(row.deliveryStatus, "AVAILABLE"),
    deployedPercent: Number(row.deployedPercent || 0),
    joiningDate: asDate(row.joiningDate),
    noticePeriod: row.noticePeriod,
    availabilityDate: asDate(row.availabilityDate),
    deliveryRollOffDate: asDate(row.deliveryRollOffDate),
    notAvailableFrom: asDate(row.notAvailableFrom),
    notAvailableTo: asDate(row.notAvailableTo),
    notAvailableReason: row.notAvailableReason,
    visaWorkAuthorization: row.visaWorkAuthorization,
    backgroundCheck: row.backgroundCheck,
    compensationInputType: row.compensationInputType,
    compensationValue: row.compensationValue === undefined ? undefined : Number(row.compensationValue || 0),
    compensationCurrency: row.compensationCurrency,
    paymentTerms: row.paymentTerms,
    paymentCurrency: row.paymentCurrency,
    costRate: Number(row.costRate || 0),
    reportingManager: row.reportingManager,
    ownerName: row.ownerName,
    currentSowName: row.currentSowName,
    costCalculationMode: row.costCalculationMode,
    fxRateUsed: row.fxRateUsed === undefined ? undefined : Number(row.fxRateUsed || 0),
    createdAt: asDate(row.createdAt),
    updatedAt: asDate(row.updatedAt)
  })));

  await createMany("opportunity", validOpportunities.map((row) => ({
    id: row.id,
    number: row.number,
    accountId: row.accountId,
    name: row.name,
    stage: cleanEnum(row.stage, "QUALIFYING"),
    probability: Number(row.probability || 0),
    estimatedRevenue: Number(row.estimatedRevenue || 0),
    roleEstimatedRevenue: Number(row.roleEstimatedRevenue || 0),
    weightedValue: Number(row.weightedValue || 0),
    currency: row.currency || "USD",
    expectedCloseDate: asDate(row.expectedCloseDate),
    expectedStartDate: asDate(row.expectedStartDate),
    expectedEndDate: asDate(row.expectedEndDate),
    accountManagerName: row.accountManagerName,
    deliveryManagerName: row.deliveryManagerName,
    dealType: row.dealType,
    source: row.source,
    targetMargin: row.targetMargin === undefined ? undefined : Number(row.targetMargin || 0),
    notes: row.notes,
    notesHistory: row.notesHistory || [],
    createdAt: asDate(row.createdAt),
    updatedAt: asDate(row.updatedAt)
  })));

  await createMany("opportunityRole", validOpportunityRoles.map((row) => ({
    id: row.id,
    number: row.number,
    opportunityId: row.opportunityId,
    title: row.title,
    skill: row.skill,
    subModule: row.subModule,
    quantity: Number(row.quantity || 1),
    engagementType: row.engagementType,
    experienceLevel: row.experienceLevel,
    startDate: asDate(row.startDate),
    duration: row.duration === undefined ? undefined : Number(row.duration || 0),
    endDate: asDate(row.endDate),
    roleLocation: row.roleLocation,
    estimatedHours: row.estimatedHours === undefined ? undefined : Number(row.estimatedHours || 0),
    billRate: row.billRate === undefined ? undefined : Number(row.billRate || 0),
    targetMargin: row.targetMargin === undefined ? undefined : Number(row.targetMargin || 0),
    costGuidance: row.costGuidance === undefined ? undefined : Number(row.costGuidance || 0),
    baseCostGuidance: row.baseCostGuidance === undefined ? undefined : Number(row.baseCostGuidance || 0),
    loadedCostGuidance: row.loadedCostGuidance === undefined ? undefined : Number(row.loadedCostGuidance || 0),
    allocationPercent: row.allocationPercent === undefined ? undefined : Number(row.allocationPercent || 0),
    resourceIdentificationStatus: row.resourceIdentificationStatus,
    candidateResourceName: row.candidateResourceName,
    notes: row.notes,
    createdAt: asDate(row.createdAt),
    updatedAt: asDate(row.updatedAt)
  })));

  await createMany("sow", (db.sows || []).map((row) => ({
    id: row.id,
    number: row.number,
    accountId: row.accountId,
    sourceOpportunityId: validOpportunityIds.has(row.sourceOpportunityId) ? row.sourceOpportunityId : undefined,
    name: row.name,
    billingModel: cleanEnum(row.billingModel, "TM_HOURLY"),
    status: cleanEnum(row.status, "DRAFT"),
    currency: row.currency || "USD",
    startDate: asDate(row.startDate),
    endDate: asDate(row.endDate),
    contractValue: Number(row.contractValue || 0),
    visibleRevenue: Number(row.visibleRevenue || 0),
    visibleCost: Number(row.visibleCost || 0),
    grossMargin: Number(row.grossMargin || 0),
    grossMarginPercent: Number(row.grossMarginPercent || 0),
    targetMargin: row.targetMargin === undefined ? undefined : Number(row.targetMargin || 0),
    projectHealth: row.projectHealth,
    projectManagerName: row.projectManagerName,
    deliveryManagerName: row.deliveryManagerName,
    accountManagerName: row.accountManagerName,
    parentSowReference: row.parentSowReference,
    createdFrom: row.createdFrom || "DIRECT",
    travelExpensesAllowed: Boolean(row.travelExpensesAllowed),
    travelExpensesBillingType: row.travelExpensesBillingType,
    travelExpensesCapAmount: row.travelExpensesCapAmount === undefined ? undefined : Number(row.travelExpensesCapAmount || 0),
    travelExpensesApprovalRequired: Boolean(row.travelExpensesApprovalRequired),
    travelExpensesNotes: row.travelExpensesNotes,
    createdAt: asDate(row.createdAt),
    updatedAt: asDate(row.updatedAt)
  })));

  await createMany("sowRole", (db.sowRoles || []).map((row) => ({
    id: row.id,
    number: row.number,
    sowId: row.sowId,
    sourceOpportunityRoleId: validOpportunityRoleIds.has(row.sourceOpportunityRoleId) ? row.sourceOpportunityRoleId : undefined,
    title: row.title,
    skill: row.skill,
    subModule: row.subModule,
    quantity: Number(row.quantity || 1),
    engagementType: row.engagementType,
    experienceLevel: row.experienceLevel,
    billingType: row.billingType,
    billRate: row.billRate === undefined ? undefined : Number(row.billRate || 0),
    costRate: row.costRate === undefined ? undefined : Number(row.costRate || 0),
    targetMargin: row.targetMargin === undefined ? undefined : Number(row.targetMargin || 0),
    costGuidance: row.costGuidance === undefined ? undefined : Number(row.costGuidance || 0),
    baseCostGuidance: row.baseCostGuidance === undefined ? undefined : Number(row.baseCostGuidance || 0),
    loadedCostGuidance: row.loadedCostGuidance === undefined ? undefined : Number(row.loadedCostGuidance || 0),
    startDate: asDate(row.startDate),
    duration: row.duration === undefined ? undefined : Number(row.duration || 0),
    endDate: asDate(row.endDate),
    plannedAllocationPercent: row.plannedAllocationPercent === undefined ? undefined : Number(row.plannedAllocationPercent || 0),
    plannedHours: row.plannedHours === undefined ? undefined : Number(row.plannedHours || 0),
    locationRequirement: row.locationRequirement,
    staffingPriority: row.staffingPriority,
    staffingStatus: row.staffingStatus,
    remarks: row.remarks,
    measurementUnit: cleanEnum(row.measurementUnit, "HOURS"),
    createdAt: asDate(row.createdAt),
    updatedAt: asDate(row.updatedAt)
  })));

  await createMany("deployment", (db.deployments || []).map((row) => ({
    id: row.id,
    number: row.number,
    sowRoleId: row.sowRoleId,
    resourceId: row.resourceId,
    startDate: asDate(row.startDate),
    endDate: asDate(row.endDate),
    allocationPercent: Number(row.allocationPercent || 0),
    status: cleanEnum(row.status, "PLANNED"),
    lockedCostRate: Number(row.lockedCostRate || 0),
    lockedBillRate: row.lockedBillRate === undefined ? undefined : Number(row.lockedBillRate || 0),
    billable: row.billable !== false,
    sourceOfAssignment: row.sourceOfAssignment,
    createdAt: asDate(row.createdAt),
    updatedAt: asDate(row.updatedAt)
  })));

  await createMany("deploymentPlan", (db.deploymentPlans || []).map((row) => ({
    id: row.id,
    number: row.number,
    deploymentId: row.deploymentId || undefined,
    sowRoleId: row.sowRoleId,
    month: asDate(row.month),
    plannedQuantity: Number(row.plannedQuantity || 0),
    plannedUnit: cleanEnum(row.plannedUnit, "HOURS"),
    notes: row.notes,
    createdAt: asDate(row.createdAt),
    updatedAt: asDate(row.updatedAt)
  })));

  await createMany("actual", (db.actuals || []).map((row) => ({
    id: row.id,
    number: row.number,
    deploymentId: row.deploymentId,
    month: asDate(row.month),
    actualQuantity: Number(row.actualQuantity || 0),
    actualUnit: cleanEnum(row.actualUnit, "HOURS"),
    remarks: row.remarks,
    uploadBatchRef: row.uploadBatchRef,
    enteredBy: row.enteredBy,
    enteredDate: asDate(row.enteredDate),
    createdAt: asDate(row.createdAt),
    updatedAt: asDate(row.updatedAt)
  })));

  await createMany("milestone", (db.milestones || []).map((row) => ({
    id: row.id,
    number: row.number,
    sowId: row.sowId,
    name: row.name,
    sequence: Number(row.sequence || 0),
    plannedDate: asDate(row.plannedDate),
    plannedAmount: Number(row.plannedAmount || 0),
    actualDate: asDate(row.actualDate),
    actualAmount: row.actualAmount === undefined ? undefined : Number(row.actualAmount || 0),
    invoiceDate: asDate(row.invoiceDate),
    paymentDate: asDate(row.paymentDate),
    status: row.status,
    remarks: row.remarks,
    createdAt: asDate(row.createdAt),
    updatedAt: asDate(row.updatedAt)
  })));

  await createMany("sowAttachment", (db.sowAttachments || []).map((row) => ({
    id: row.id,
    number: row.number,
    sowId: row.sowId,
    documentType: row.documentType,
    fileName: row.fileName,
    referenceUrl: row.referenceUrl,
    notes: row.notes,
    createdAt: asDate(row.createdAt),
    updatedAt: asDate(row.updatedAt)
  })));

  await createMany("auditLog", (db.auditLogs || []).map((row) => ({
    id: row.id,
    number: row.number,
    entityName: row.entityName,
    recordId: row.recordId,
    actionType: row.actionType,
    changedFields: row.changedFields,
    oldValue: row.oldValue,
    newValue: row.newValue,
    actor: row.actor,
    sourceScreen: row.sourceScreen,
    importReference: row.importReference,
    createdAt: asDate(row.createdAt)
  })));

  console.log("JSON to PostgreSQL import completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
