import { Router } from "express";
import { getCollection } from "../data/store.js";
import { deriveCurrentResourceState, formatDateKey, localDateKey } from "../lib/resourceStatus.js";

const router = Router();

function dateValue(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function dateKey(value) {
  return value ? formatDateKey(value) : "";
}

function activeDeploymentsForResource(resourceId, deployments, roles, sows) {
  return deployments
    .filter((deployment) => deployment.resourceId === resourceId && deployment.status !== "CANCELLED")
    .map((deployment) => {
      const role = roles.find((item) => item.id === deployment.sowRoleId) || null;
      const sow = sows.find((item) => item.id === role?.sowId) || null;
      return {
        ...deployment,
        startDate: role?.startDate || deployment.startDate,
        endDate: role?.endDate || deployment.endDate,
        role,
        sow
      };
    });
}

function allocationAtDate(resourceDeployments, targetDate) {
  if (!targetDate) {
    return 0;
  }
  const target = dateKey(targetDate);
  return resourceDeployments.reduce((sum, deployment) => {
    const start = dateKey(deployment.startDate);
    const end = dateKey(deployment.endDate);
    if ((!start || start <= target) && (!end || end >= target)) {
      return sum + Number(deployment.allocationPercent || 0);
    }
    return sum;
  }, 0);
}

function nextRollOff(resourceDeployments, targetDate) {
  const target = targetDate?.getTime() || Date.now();
  const rollOffs = resourceDeployments
    .map((deployment) => dateValue(deployment.endDate))
    .filter((date) => date && date.getTime() >= target)
    .sort((a, b) => a.getTime() - b.getTime());
  return rollOffs[0]?.toISOString() || "";
}

function demandStatus({ matchingCount, eligibleCount, partialCount, openCount, sourceType }) {
  if (openCount <= 0) {
    return "Match Available";
  }
  if (sourceType === "SOW" && matchingCount === 0) {
    return "Confirmed Open";
  }
  if (eligibleCount > 0) {
    return sourceType === "SOW" ? "Confirmed Open" : "Match Available";
  }
  if (partialCount > 0) {
    return "Partial Match";
  }
  if (matchingCount > 0) {
    return "At Risk";
  }
  return sourceType === "SOW" ? "Confirmed Open" : "Open";
}

function buildCandidateSummary({ demand, resources, deployments, roles, sows, todayKey }) {
  const requiredAllocation = Number(demand.requiredAllocationPercent || 100);
  const startDate = dateValue(demand.expectedStartDate);
  const activeMatchingResources = resources
    .map((resource) => {
      const current = deriveCurrentResourceState(resource, { deployments, roles, sows }, todayKey);
      if (current.employmentStatus !== "ACTIVE" || resource.primarySkill !== demand.skill) {
        return null;
      }
      const resourceDeployments = activeDeploymentsForResource(resource.id, deployments, roles, sows);
      const allocatedAtStart = allocationAtDate(resourceDeployments, startDate);
      const availableAtStart = Math.max(0, 100 - allocatedAtStart);
      return {
        resource,
        availableAtStart,
        rollOffDate: nextRollOff(resourceDeployments, startDate),
        currentAvailablePercent: current.currentAvailablePercent
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.availableAtStart - a.availableAtStart || b.currentAvailablePercent - a.currentAvailablePercent);

  const eligible = activeMatchingResources.filter((candidate) => candidate.availableAtStart >= requiredAllocation);
  const partial = activeMatchingResources.filter((candidate) => candidate.availableAtStart > 0 && candidate.availableAtStart < requiredAllocation);
  const best = eligible[0] || partial[0] || activeMatchingResources[0] || null;
  const status = demandStatus({
    matchingCount: activeMatchingResources.length,
    eligibleCount: eligible.length,
    partialCount: partial.length,
    openCount: demand.openCount,
    sourceType: demand.sourceType
  });

  return {
    matchingResourceCount: activeMatchingResources.length,
    bestCandidate: best ? `${best.resource.firstName || ""} ${best.resource.lastName || ""}`.trim() || best.resource.number : "-",
    candidateAvailablePercent: best ? best.availableAtStart : 0,
    candidateRollOffDate: best?.rollOffDate || "",
    planningStatus: status,
    riskNotes: status === "Match Available"
      ? "Matching active resource capacity is available."
      : status === "Partial Match"
        ? "Matching resource exists, but available allocation is below the demand."
        : status === "At Risk"
          ? "Matching skill exists, but capacity is not available by the start date."
          : "No suitable active SAP module match found."
  };
}

router.get("/", (_req, res) => {
  const opportunities = getCollection("opportunities");
  const opportunityRoles = getCollection("opportunityRoles");
  const accounts = getCollection("accounts");
  const sows = getCollection("sows");
  const sowRoles = getCollection("sowRoles");
  const deployments = getCollection("deployments");
  const resources = getCollection("resources");
  const todayKey = localDateKey();
  const convertedOpportunityIds = new Set(sows.map((sow) => sow.sourceOpportunityId).filter(Boolean));

  const opportunityDemand = opportunities
    .filter((opportunity) =>
      opportunity.stage !== "LOST" &&
      Number(opportunity.probability || 0) >= 70 &&
      !convertedOpportunityIds.has(opportunity.id)
    )
    .flatMap((opportunity) => {
      const account = accounts.find((item) => item.id === opportunity.accountId);
      return opportunityRoles
        .filter((role) => role.opportunityId === opportunity.id)
        .map((role) => ({
          id: `opp-${role.id}`,
          sourceType: opportunity.stage === "WON" ? "Won Opportunity" : "Opportunity",
          clientName: account?.name || "-",
          sourceNumber: opportunity.number,
          sourceName: opportunity.name,
          stageOrStatus: opportunity.stage,
          probability: Number(opportunity.probability || 0),
          expectedStartDate: opportunity.expectedStartDate,
          expectedEndDate: opportunity.expectedEndDate,
          roleTitle: role.title,
          skill: role.skill,
          locationRequirement: role.roleLocation || "Offshore",
          requiredAllocationPercent: Number(role.allocationPercent || 100),
          requiredHours: Number(role.estimatedHours || 0),
          requiredCount: Number(role.quantity || 1),
          assignedCount: 0,
          openCount: Number(role.quantity || 1)
        }));
    });

  const sowDemand = sowRoles.flatMap((role) => {
    const sow = sows.find((item) => item.id === role.sowId);
    if (!sow || ["COMPLETED", "TERMINATED"].includes(sow.status)) {
      return [];
    }
    const activeAssignments = deployments.filter((deployment) =>
      deployment.sowRoleId === role.id && deployment.status !== "CANCELLED"
    );
    const requiredCount = Number(role.quantity || 1);
    const assignedCount = activeAssignments.length;
    const openCount = Math.max(0, requiredCount - assignedCount);
    if (openCount <= 0) {
      return [];
    }
    const account = accounts.find((item) => item.id === sow.accountId);
    return [{
      id: `sow-${role.id}`,
      sourceType: "SOW",
      clientName: account?.name || "-",
      sourceNumber: sow.number,
      sourceName: sow.name,
      stageOrStatus: sow.status,
      probability: 100,
      expectedStartDate: role.startDate || sow.startDate,
      expectedEndDate: role.endDate || sow.endDate,
      roleTitle: role.title,
      skill: role.skill,
      locationRequirement: role.locationRequirement || "Offshore",
      requiredAllocationPercent: Number(role.plannedAllocationPercent || 100),
      requiredHours: Number(role.plannedHours || 0),
      requiredCount,
      assignedCount,
      openCount
    }];
  });

  const rows = [...opportunityDemand, ...sowDemand]
    .map((demand) => ({
      ...demand,
      ...buildCandidateSummary({ demand, resources, deployments, roles: sowRoles, sows, todayKey })
    }))
    .sort((a, b) => String(a.expectedStartDate || "").localeCompare(String(b.expectedStartDate || "")));

  const rollOffBuckets = resources.reduce((summary, resource) => {
    const current = deriveCurrentResourceState(resource, { deployments, roles: sowRoles, sows }, todayKey);
    if (current.employmentStatus !== "ACTIVE") {
      return summary;
    }
    const resourceDeployments = activeDeploymentsForResource(resource.id, deployments, sowRoles, sows);
    const rollOff = nextRollOff(resourceDeployments, new Date());
    if (!rollOff) {
      return summary;
    }
    const days = Math.ceil((new Date(rollOff).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days <= 30) summary.rollOff30 += 1;
    if (days <= 60) summary.rollOff60 += 1;
    if (days <= 90) summary.rollOff90 += 1;
    return summary;
  }, { rollOff30: 0, rollOff60: 0, rollOff90: 0 });

  res.json({
    kpis: {
      totalDemandRoles: rows.length,
      openPositions: rows.filter((row) => ["Open", "Confirmed Open"].includes(row.planningStatus)).length,
      confirmedOpenPositions: rows.filter((row) => row.planningStatus === "Confirmed Open").length,
      atRiskPositions: rows.filter((row) => row.planningStatus === "At Risk").length,
      matchAvailablePositions: rows.filter((row) => row.planningStatus === "Match Available").length,
      ...rollOffBuckets
    },
    rows,
    activeDeployments: deployments
      .filter((deployment) => deployment.status === "ACTIVE")
      .map((deployment) => {
        const role = sowRoles.find((item) => item.id === deployment.sowRoleId);
        const sow = sows.find((item) => item.id === role?.sowId);
        const account = accounts.find((item) => item.id === sow?.accountId);
        const resource = resources.find((item) => item.id === deployment.resourceId);
        const current = resource
          ? deriveCurrentResourceState(resource, { deployments, roles: sowRoles, sows }, todayKey)
          : null;
        return {
          id: deployment.id,
          deploymentNumber: deployment.number,
          clientName: account?.name || "-",
          sowNumber: sow?.number || "-",
          sowName: sow?.name || "-",
          sowStatus: sow?.status || "-",
          roleTitle: role?.title || "-",
          skill: role?.skill || "-",
          locationRequirement: role?.locationRequirement || "-",
          resourceNumber: resource?.number || "-",
          resourceName: resource ? `${resource.firstName || ""} ${resource.lastName || ""}`.trim() || resource.number : "-",
          resourceStatus: current?.currentDeliveryStatusLabel || "-",
          allocationPercent: Number(deployment.allocationPercent || 0),
          startDate: deployment.startDate,
          endDate: deployment.endDate,
          rollOffDate: deployment.endDate,
          lockedBillRate: Number(deployment.lockedBillRate || role?.billRate || 0),
          lockedCostRate: Number(deployment.lockedCostRate || resource?.costRate || 0)
        };
      })
      .filter((row) => row.sowStatus === "ACTIVE")
      .sort((a, b) => `${a.sowNumber}${a.resourceName}`.localeCompare(`${b.sowNumber}${b.resourceName}`))
  });
});

export default router;
