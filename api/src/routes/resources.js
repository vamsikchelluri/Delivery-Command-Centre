import { Router } from "express";
import { z } from "zod";
import { generateNumber, hydrateCounter } from "../lib/numbering.js";
import { addRecord, getCollection, nextDocumentNumber, updateRecord } from "../data/store.js";
import { deriveCurrentResourceState, localDateKey } from "../lib/resourceStatus.js";

const router = Router();

function normalizeResourceBody(body, { defaults = false } = {}) {
  return {
    ...body,
    firstName: typeof body.firstName === "string" ? body.firstName.trim() : body.firstName,
    lastName: typeof body.lastName === "string" ? body.lastName.trim() : body.lastName,
    contactEmail: typeof body.contactEmail === "string" ? body.contactEmail.trim() : body.contactEmail,
    contactNumber: typeof body.contactNumber === "string" ? body.contactNumber.trim() : body.contactNumber,
    primarySkill: typeof body.primarySkill === "string" ? body.primarySkill.trim() : body.primarySkill,
    subModule: typeof body.subModule === "string" ? body.subModule.trim() : body.subModule,
    primarySubModules: Array.isArray(body.primarySubModules)
      ? body.primarySubModules.map((item) => typeof item === "string" ? item.trim() : item).filter(Boolean)
      : (defaults || body.subModule !== undefined ? (body.subModule ? [body.subModule] : []) : body.primarySubModules),
    employmentStatus: defaults ? (body.employmentStatus || "ACTIVE") : body.employmentStatus,
    deliveryStatus: defaults ? (body.deliveryStatus || "AVAILABLE") : body.deliveryStatus,
    secondarySkills: Array.isArray(body.secondarySkills)
      ? body.secondarySkills
        .map((item) => ({
          skill: typeof item?.skill === "string" ? item.skill.trim() : item?.skill,
          subModule: typeof item?.subModule === "string" ? item.subModule.trim() : item?.subModule
        }))
        .filter((item) => item.skill)
      : []
  };
}

function validationMessage(issues) {
  const details = issues.map((issue) => {
    const field = issue.path.length ? issue.path.join(".") : "payload";
    return `${field}: ${issue.message}`;
  }).join("; ");
  return details ? `Invalid resource payload - ${details}` : "Invalid resource payload";
}

router.get("/", async (_req, res) => {
  const todayKey = localDateKey();
  const deployments = getCollection("deployments");
  const roles = getCollection("sowRoles");
  const sows = getCollection("sows");
  const resources = [...getCollection("resources")].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  hydrateCounter("RES", resources.map((item) => item.number));
  res.json(resources.map((resource) => {
    const hydrated = deriveCurrentResourceState(resource, { deployments, roles, sows }, todayKey);
    const { deployments: _deployments, ...summary } = hydrated;
    return summary;
  }));
});

router.get("/:id", async (req, res) => {
  const resource = getCollection("resources").find((item) => item.id === req.params.id);

  if (!resource) {
    return res.status(404).json({ message: "Resource not found" });
  }

  const hydratedResource = deriveCurrentResourceState(resource, {
    deployments: getCollection("deployments"),
    roles: getCollection("sowRoles"),
    sows: getCollection("sows")
  });

  const linkedOpportunities = getCollection("opportunityRoles")
    .filter((role) => role.candidateResourceName === `${resource.firstName} ${resource.lastName}`)
    .map((role) => ({
      ...role,
      opportunity: getCollection("opportunities").find((item) => item.id === role.opportunityId)
    }));

  res.json({
    ...hydratedResource,
    linkedOpportunities,
    costHistory: [
      {
        effectiveDate: "2026-04-01",
        costRate: resource.costRate,
        reason: "Initial MVP seed rate"
      }
    ],
    auditTrail: getCollection("auditLogs").filter((item) => item.recordId === resource.id)
  });
});

router.post("/", async (req, res) => {
  const body = normalizeResourceBody(req.body, { defaults: true });
  const schema = z.object({
    firstName: z.string().min(2),
    lastName: z.string().min(2),
    contactEmail: z.string().email().optional().or(z.literal("")),
    contactNumber: z.string().optional(),
    primarySkill: z.string().min(2),
    subModule: z.string().optional(),
    primarySubModules: z.array(z.string()).default([]),
    secondarySkills: z.array(z.object({
      skill: z.string().min(2),
      subModule: z.string().optional()
    })).default([]),
    location: z.string().optional(),
    locationType: z.string().optional(),
    employmentType: z.string().optional(),
    employmentStatus: z.enum(["ACTIVE", "ON_LEAVE", "SABBATICAL", "INACTIVE", "TERMINATED", "EXITED"]),
    deliveryStatus: z.enum(["AVAILABLE", "FULLY_DEPLOYED", "PARTIALLY_DEPLOYED"]).default("AVAILABLE"),
    deployedPercent: z.coerce.number().min(0).max(150).default(0),
    joiningDate: z.string().optional(),
    noticePeriod: z.string().optional(),
    deliveryRollOffDate: z.string().optional(),
    availabilityDate: z.string().optional(),
    visaWorkAuthorization: z.string().optional(),
    backgroundCheck: z.string().optional(),
    notAvailableFrom: z.string().optional(),
    notAvailableTo: z.string().optional(),
    notAvailableReason: z.string().optional(),
    compensationInputType: z.string().optional(),
    compensationValue: z.coerce.number().optional(),
    compensationCurrency: z.string().optional(),
    paymentTerms: z.string().optional(),
    paymentCurrency: z.string().optional(),
    costRate: z.coerce.number().default(0),
    reportingManager: z.string().optional(),
    costCalculationMode: z.string().optional(),
    fxRateUsed: z.coerce.number().optional()
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return res.status(400).json({ message: validationMessage(parsed.error.issues), issues: parsed.error.issues });
  }

  const now = new Date().toISOString();
  const resource = addRecord("resources", {
    id: crypto.randomUUID(),
    number: nextDocumentNumber("Resource"),
    currentSowName: "",
    createdAt: now,
    updatedAt: now,
    ...parsed.data
  });

  res.status(201).json(resource);
});

router.patch("/:id", async (req, res) => {
  const body = normalizeResourceBody(req.body);
  const schema = z.object({
    firstName: z.string().min(2).optional(),
    lastName: z.string().min(2).optional(),
    contactEmail: z.string().email().optional().or(z.literal("")),
    contactNumber: z.string().optional(),
    primarySkill: z.string().min(2).optional(),
    subModule: z.string().optional(),
    primarySubModules: z.array(z.string()).optional(),
    secondarySkills: z.array(z.object({
      skill: z.string().min(2),
      subModule: z.string().optional()
    })).optional(),
    location: z.string().optional(),
    locationType: z.string().optional(),
    employmentType: z.string().optional(),
    employmentStatus: z.enum(["ACTIVE", "ON_LEAVE", "SABBATICAL", "INACTIVE", "TERMINATED", "EXITED"]).optional(),
    deliveryStatus: z.enum(["AVAILABLE", "FULLY_DEPLOYED", "PARTIALLY_DEPLOYED"]).optional(),
    deployedPercent: z.coerce.number().min(0).max(150).optional(),
    joiningDate: z.string().optional(),
    noticePeriod: z.string().optional(),
    deliveryRollOffDate: z.string().optional(),
    availabilityDate: z.string().optional(),
    visaWorkAuthorization: z.string().optional(),
    backgroundCheck: z.string().optional(),
    notAvailableFrom: z.string().optional(),
    notAvailableTo: z.string().optional(),
    notAvailableReason: z.string().optional(),
    compensationInputType: z.string().optional(),
    compensationValue: z.coerce.number().optional(),
    compensationCurrency: z.string().optional(),
    paymentTerms: z.string().optional(),
    paymentCurrency: z.string().optional(),
    costRate: z.coerce.number().optional(),
    reportingManager: z.string().optional(),
    costCalculationMode: z.string().optional(),
    fxRateUsed: z.coerce.number().optional()
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return res.status(400).json({ message: validationMessage(parsed.error.issues), issues: parsed.error.issues });
  }

  const resource = updateRecord("resources", req.params.id, parsed.data);
  if (!resource) {
    return res.status(404).json({ message: "Resource not found" });
  }

  res.json(resource);
});

export default router;
