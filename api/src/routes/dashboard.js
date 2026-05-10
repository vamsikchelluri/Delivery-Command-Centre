import { Router } from "express";
import { getCollection } from "../data/store.js";
import { deriveCurrentResourceState, localDateKey, summarizeCurrentResourceStatuses } from "../lib/resourceStatus.js";

const router = Router();
const STANDARD_MONTH_HOURS = 168;

function quantityToHours(quantity, unit) {
  const value = Number(quantity || 0);
  return unit === "MAN_MONTHS" ? value * STANDARD_MONTH_HOURS : value;
}

function monthKey(value) {
  if (!value) {
    return "";
  }
  return String(value).slice(0, 7);
}

function monthWithinRange(month, startDate, endDate) {
  const key = monthKey(month);
  if (!key) {
    return false;
  }
  const start = monthKey(startDate);
  const end = monthKey(endDate);
  return (!start || key >= start) && (!end || key <= end);
}

function stageLabel(stage) {
  return String(stage || "UNKNOWN")
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function addMonths(value, offset) {
  const date = new Date(`${value}-01T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}

function monthLabel(value) {
  const date = new Date(`${value}-01T00:00:00.000Z`);
  return date.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

function matchesManager(record, user) {
  if (!user?.name || user.role === "COO") {
    return true;
  }
  if (user.role === "Project Manager") {
    return record.projectManagerName === user.name;
  }
  if (user.role === "Delivery Manager") {
    return record.deliveryManagerName === user.name;
  }
  if (user.role === "Account Manager") {
    return record.accountManagerName === user.name;
  }
  return true;
}

function emptyFinancialMonth(month) {
  return {
    id: month,
    month,
    label: monthLabel(month),
    revenue: 0,
    cost: 0,
    grossMargin: 0,
    marginPercent: 0,
    hours: 0
  };
}

function percent(numerator, denominator) {
  return denominator ? Number(((numerator / denominator) * 100).toFixed(2)) : 0;
}

router.get("/", async (req, res) => {
  const opportunities = getCollection("opportunities");
  const sows = getCollection("sows");
  const resources = getCollection("resources");
  const deployments = getCollection("deployments");
  const roles = getCollection("sowRoles");
  const actuals = getCollection("actuals");
  const deploymentPlans = getCollection("deploymentPlans");
  const today = new Date();
  const todayKey = localDateKey(today);
  const currentMonth = today.toISOString().slice(0, 7);
  const monthWindow = [-2, -1, 0, 1, 2, 3].map((offset) => addMonths(currentMonth, offset));
  const dueWindowEnd = new Date(today);
  dueWindowEnd.setDate(dueWindowEnd.getDate() + 30);
  const user = {
    id: req.user?.sub,
    name: req.user?.name,
    role: req.user?.role
  };
  const scopedSows = sows.filter((sow) => matchesManager(sow, user));
  const scopedSowIds = new Set(scopedSows.map((sow) => sow.id));
  const scopedRoles = roles.filter((role) => scopedSowIds.has(role.sowId));
  const scopedRoleIds = new Set(scopedRoles.map((role) => role.id));
  const scopedDeployments = deployments.filter((deployment) => scopedRoleIds.has(deployment.sowRoleId));
  const scopedDeploymentIds = new Set(scopedDeployments.map((deployment) => deployment.id));
  const scopedResourceIds = new Set(scopedDeployments.map((deployment) => deployment.resourceId).filter(Boolean));
  const scopedResources = user.role === "COO"
    ? resources
    : resources.filter((resource) => scopedResourceIds.has(resource.id) || resource.ownerName === user.name || resource.reportingManager === user.name);
  const scopedResourcesWithState = scopedResources.map((resource) => {
    const hydrated = deriveCurrentResourceState(resource, { deployments, roles, sows }, todayKey);
    const { deployments: _deployments, ...summary } = hydrated;
    return summary;
  });
  const scopedOpportunities = opportunities.filter((opportunity) => {
    if (matchesManager(opportunity, user)) {
      return true;
    }
    return scopedSows.some((sow) => sow.sourceOpportunityId === opportunity.id);
  });
  const milestones = getCollection("milestones").filter((item) => {
    if (item.status === "Paid") {
      return false;
    }
    if (!scopedSowIds.has(item.sowId)) {
      return false;
    }
    const plannedDate = new Date(item.plannedDate);
    return !Number.isNaN(plannedDate.getTime()) && plannedDate >= today && plannedDate <= dueWindowEnd;
  });
  const openOpportunities = scopedOpportunities.filter((item) => !["WON", "LOST"].includes(item.stage));
  const activeSows = scopedSows.filter((item) => item.status === "ACTIVE");
  const activeSowIds = new Set(activeSows.map((sow) => sow.id));
  const activeRoleIds = new Set(scopedRoles.filter((role) => activeSowIds.has(role.sowId)).map((role) => role.id));
  const activeDeploymentIds = new Set(scopedDeployments.filter((deployment) => activeRoleIds.has(deployment.sowRoleId)).map((deployment) => deployment.id));

  const weightedPipeline = openOpportunities.reduce((sum, item) => sum + Number(item.weightedValue || 0), 0);
  const scopedActuals = actuals.filter((actual) => activeDeploymentIds.has(actual.deploymentId));
  const currentMonthActuals = scopedActuals.filter((actual) => monthKey(actual.month) === currentMonth);
  function actualToFinancials(totals, actual) {
    const deployment = deployments.find((item) => item.id === actual.deploymentId);
    const role = roles.find((item) => item.id === deployment?.sowRoleId);
    const resource = resources.find((item) => item.id === deployment?.resourceId);
    if (!role || !monthWithinRange(actual.month, role.startDate, role.endDate)) {
      return totals;
    }
    const hours = quantityToHours(actual.actualQuantity, actual.actualUnit || role?.measurementUnit || "HOURS");
    const billRate = Number(deployment?.lockedBillRate || role?.billRate || 0);
    const costRate = Number(deployment?.lockedCostRate || resource?.costRate || role?.costRate || role?.loadedCostGuidance || 0);
    return {
      actualHours: totals.actualHours + hours,
      visibleRevenue: totals.visibleRevenue + (hours * billRate),
      visibleCost: totals.visibleCost + (hours * costRate)
    };
  }

  function planToFinancials(totals, plan) {
    const deployment = plan.deploymentId ? deployments.find((item) => item.id === plan.deploymentId) : null;
    const role = roles.find((item) => item.id === (plan.sowRoleId || deployment?.sowRoleId));
    if (!role || !monthWithinRange(plan.month, role.startDate, role.endDate)) {
      return totals;
    }
    const hours = quantityToHours(plan.plannedQuantity, plan.plannedUnit || role?.measurementUnit || "HOURS");
    const billRate = Number(deployment?.lockedBillRate || role?.billRate || 0);
    return {
      actualHours: totals.actualHours + hours,
      visibleRevenue: totals.visibleRevenue + (hours * billRate),
      visibleCost: 0
    };
  }

  const actualFinancials = currentMonthActuals.reduce(actualToFinancials, { actualHours: 0, visibleRevenue: 0, visibleCost: 0 });
  const visibleRevenue = Number(actualFinancials.visibleRevenue.toFixed(2));
  const visibleCost = Number(actualFinancials.visibleCost.toFixed(2));
  const benchCount = scopedResourcesWithState.filter((resource) => resource.currentDeliveryStatus === "AVAILABLE").length;
  const partiallyDeployedCount = scopedResourcesWithState.filter((resource) => resource.currentDeliveryStatus === "PARTIALLY_DEPLOYED").length;
  const zeroRevenueActiveSows = activeSows.filter((sow) => Number(sow.visibleRevenue || 0) === 0);
  const pipelineByStage = openOpportunities.reduce((rows, opportunity) => {
    const stage = opportunity.stage || "UNKNOWN";
    const existing = rows.get(stage) || { id: stage, stage, label: stageLabel(stage), count: 0, weightedValue: 0 };
    existing.count += 1;
    existing.weightedValue += Number(opportunity.weightedValue || 0);
    rows.set(stage, existing);
    return rows;
  }, new Map());
  const revenueCostTrend = monthWindow.map((month) => {
    const isFutureMonth = month > currentMonth;
    const financials = isFutureMonth
      ? deploymentPlans
        .filter((plan) =>
          monthKey(plan.month) === month &&
          (activeRoleIds.has(plan.sowRoleId) || activeDeploymentIds.has(plan.deploymentId))
        )
        .reduce(planToFinancials, { actualHours: 0, visibleRevenue: 0, visibleCost: 0 })
      : scopedActuals
        .filter((actual) => monthKey(actual.month) === month)
        .reduce(actualToFinancials, { actualHours: 0, visibleRevenue: 0, visibleCost: 0 });
    const revenue = Number(financials.visibleRevenue.toFixed(2));
    const cost = Number(financials.visibleCost.toFixed(2));
    const grossMargin = Number((revenue - cost).toFixed(2));
    return {
      ...emptyFinancialMonth(month),
      basis: isFutureMonth ? "Projected Revenue Only" : financials.actualHours ? "Actual" : "Actual - No Entries",
      revenue,
      cost,
      grossMargin: isFutureMonth ? 0 : grossMargin,
      marginPercent: isFutureMonth ? 0 : percent(grossMargin, revenue),
      hours: Number(financials.actualHours.toFixed(2))
    };
  });
  const currentMonthDeployments = scopedDeployments.filter((deployment) => deployment.status !== "CANCELLED");
  const currentActualsByDeployment = new Map(currentMonthActuals.map((actual) => [actual.deploymentId, actual]));
  const currentPlans = deploymentPlans.filter((plan) =>
    monthKey(plan.month) === currentMonth &&
    (activeRoleIds.has(plan.sowRoleId) || activeDeploymentIds.has(plan.deploymentId))
  );
  const planByDeployment = new Map(currentPlans.filter((plan) => plan.deploymentId).map((plan) => [plan.deploymentId, plan]));
  const planByRole = new Map(currentPlans.filter((plan) => plan.sowRoleId).map((plan) => [plan.sowRoleId, plan]));
  const actualsCompletion = currentMonthDeployments.reduce((summary, deployment) => {
    const role = roles.find((item) => item.id === deployment.sowRoleId);
    const actual = currentActualsByDeployment.get(deployment.id);
    const plan = planByDeployment.get(deployment.id) || planByRole.get(deployment.sowRoleId);
    const plannedQuantity = Number(plan?.plannedQuantity ?? role?.plannedHours ?? 0);
    if (!actual) {
      summary.missing += 1;
    } else if (Number(actual.actualQuantity || 0) !== plannedQuantity) {
      summary.variance += 1;
    } else {
      summary.entered += 1;
    }
    summary.total += 1;
    return summary;
  }, { entered: 0, missing: 0, variance: 0, total: 0 });
  const resourceUtilization = summarizeCurrentResourceStatuses(scopedResourcesWithState);
  const upcomingRollOffs = scopedResourcesWithState
    .filter((resource) => resource.employmentStatus === "ACTIVE" && resource.currentDeliveryStatus !== "AVAILABLE" && resource.deliveryRollOffDate)
    .map((resource) => {
      const rollOffDate = new Date(resource.deliveryRollOffDate);
      const daysUntil = Number.isNaN(rollOffDate.getTime())
        ? null
        : Math.ceil((rollOffDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: resource.id,
        resourceNumber: resource.number,
        resourceName: `${resource.firstName || ""} ${resource.lastName || ""}`.trim() || resource.number,
        currentSowName: resource.currentSowName || "",
        rollOffDate: resource.deliveryRollOffDate,
        daysUntil,
        bucket: daysUntil === null ? "No date" : daysUntil <= 30 ? "0-30 days" : daysUntil <= 60 ? "31-60 days" : "61+ days"
      };
    })
    .filter((item) => item.daysUntil === null || item.daysUntil >= 0)
    .sort((a, b) => (a.daysUntil ?? 9999) - (b.daysUntil ?? 9999))
    .slice(0, 8);
  const alerts = [
    {
      id: "active-zero-revenue",
      name: "Active SOWs with zero visible revenue",
      count: zeroRevenueActiveSows.length,
      priority: zeroRevenueActiveSows.length ? "High" : "Low",
      target: "/sows"
    },
    {
      id: "partial-resources",
      name: "Partially deployed resources",
      count: partiallyDeployedCount,
      priority: partiallyDeployedCount ? "Medium" : "Low",
      target: "/resources"
    },
    {
      id: "milestones-due",
      name: "Milestones due in 30 days",
      count: milestones.length,
      priority: milestones.length ? "High" : "Low",
      target: "/sows"
    },
    {
      id: "actuals-month",
      name: "Actual hours entered this month",
      count: Number(actualFinancials.actualHours.toFixed(2)),
      priority: actualFinancials.actualHours ? "Low" : "Medium",
      target: "/actuals"
    }
  ];

  res.json({
    kpis: {
      activeOpportunities: openOpportunities.length,
      weightedPipeline,
      activeSows: activeSows.length,
      activeResources: scopedResourcesWithState.filter((item) => item.employmentStatus === "ACTIVE").length,
      benchCount,
      partiallyDeployedCount,
      actualHours: Number(actualFinancials.actualHours.toFixed(2)),
      visibleRevenue,
      visibleCost,
      grossMargin: Number((visibleRevenue - visibleCost).toFixed(2))
    },
    currentMonth,
    scope: {
      role: user.role || "Unknown",
      userName: user.name || "Unknown",
      mode: user.role === "COO" ? "Portfolio" : "Assigned"
    },
    alerts,
    charts: {
      revenueCostTrend,
      actualsCompletion,
      resourceUtilization,
      upcomingRollOffs
    },
    pipelineByStage: [...pipelineByStage.values()],
    opportunities: [...openOpportunities]
      .sort((a, b) => Number(b.weightedValue || 0) - Number(a.weightedValue || 0))
      .slice(0, 5),
    sows: [...activeSows]
      .sort((a, b) => Number(b.visibleRevenue || 0) - Number(a.visibleRevenue || 0))
      .slice(0, 5),
    resources: [...scopedResourcesWithState]
      .sort((a, b) => Number(b.currentDeployedPercent || 0) - Number(a.currentDeployedPercent || 0))
      .slice(0, 5),
    milestones: milestones.slice(0, 5)
  });
});

export default router;
