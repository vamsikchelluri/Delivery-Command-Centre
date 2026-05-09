import { Router } from "express";
import { getCollection } from "../data/store.js";

const router = Router();
const STANDARD_MONTH_HOURS = 168;

function monthStart(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function monthKey(date) {
  return date.toISOString().slice(0, 10);
}

function lastDayOfMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function daysInclusive(start, end) {
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function monthsBetween(startValue, endValue) {
  const start = monthStart(startValue);
  const end = monthStart(endValue);
  if (!start || !end || start > end) {
    return [];
  }

  const months = [];
  const current = new Date(start);
  while (current <= end) {
    months.push(new Date(current));
    current.setUTCMonth(current.getUTCMonth() + 1);
  }
  return months;
}

function latestDateValue(...values) {
  const dates = values
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()));
  if (!dates.length) {
    return "";
  }
  return new Date(Math.max(...dates.map((date) => date.getTime()))).toISOString();
}

function latestPlanMonthEnd({ role, deployment, actuals, deploymentPlans }) {
  const monthValues = [
    ...deploymentPlans
      .filter((item) =>
        (item.deploymentId && item.deploymentId === deployment.id) ||
        (!item.deploymentId && item.sowRoleId === role.id)
      )
      .map((item) => item.month),
    ...actuals
      .filter((item) => item.deploymentId === deployment.id)
      .map((item) => item.month)
  ];
  const monthStarts = monthValues
    .map(monthStart)
    .filter(Boolean);
  if (!monthStarts.length) {
    return "";
  }
  const latestMonth = new Date(Math.max(...monthStarts.map((date) => date.getTime())));
  return lastDayOfMonth(latestMonth).toISOString();
}

function quantityToHours(quantity, unit) {
  const value = Number(quantity || 0);
  return unit === "MAN_MONTHS" ? value * STANDARD_MONTH_HOURS : value;
}

function marginPercent(revenue, cost) {
  const value = Number(revenue || 0);
  if (!value) {
    return 0;
  }
  return Number((((value - Number(cost || 0)) / value) * 100).toFixed(2));
}

function formatMonthLabel(value) {
  const date = monthStart(value);
  if (!date) {
    return "-";
  }
  return date.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

function derivePlannedQuantity(role, deployment, month) {
  const deploymentStart = new Date(deployment.startDate);
  const deploymentEnd = new Date(deployment.endDate);
  if (Number.isNaN(deploymentStart.getTime()) || Number.isNaN(deploymentEnd.getTime())) {
    return 0;
  }

  const monthStartDate = monthStart(month);
  const monthEndDate = lastDayOfMonth(monthStartDate);
  const effectiveStart = deploymentStart > monthStartDate ? deploymentStart : monthStartDate;
  const effectiveEnd = deploymentEnd < monthEndDate ? deploymentEnd : monthEndDate;

  if (effectiveStart > effectiveEnd) {
    return 0;
  }

  const overlapDays = daysInclusive(effectiveStart, effectiveEnd);
  const totalDeploymentDays = daysInclusive(deploymentStart, deploymentEnd);
  if (totalDeploymentDays <= 0) {
    return 0;
  }

  if (role.measurementUnit === "MAN_MONTHS") {
    const allocationRatio = Number(deployment.allocationPercent || role.plannedAllocationPercent || 100) / 100;
    const monthDays = daysInclusive(monthStartDate, monthEndDate);
    return Number(((overlapDays / monthDays) * allocationRatio).toFixed(2));
  }

  const plannedHours = Number(role.plannedHours || 0);
  if (!plannedHours) {
    return 0;
  }
  return Number(((plannedHours * overlapDays) / totalDeploymentDays).toFixed(2));
}

function rowStatus(planned, actualQuantity) {
  if (actualQuantity === null || actualQuantity === undefined) {
    return "Not Entered";
  }
  if (Number(actualQuantity) !== Number(planned)) {
    return "Variance";
  }
  return "Entered";
}

function hydrateDeploymentActuals({ sow, role, deployment, resource, actuals, deploymentPlans }) {
  const billRate = Number(deployment.lockedBillRate || role.billRate || 0);
  const costRate = Number(deployment.lockedCostRate || resource?.costRate || role.costRate || role.loadedCostGuidance || 0);
  const effectiveStartDate = deployment.startDate || role.startDate || sow.startDate;
  const uncappedEndDate = latestDateValue(
    deployment.endDate,
    role.endDate,
    latestPlanMonthEnd({ role, deployment, actuals, deploymentPlans })
  );
  const effectiveEndDate = uncappedEndDate || sow.endDate;
  const monthRows = monthsBetween(effectiveStartDate, effectiveEndDate).map((month) => {
    const monthId = monthKey(month);
    const actual = actuals.find((item) => item.deploymentId === deployment.id && String(item.month || "").slice(0, 10) === monthId);
    const deploymentPlan = deploymentPlans.find((item) =>
      item.deploymentId === deployment.id && String(item.month || "").slice(0, 10) === monthId
    ) || deploymentPlans.find((item) =>
      !item.deploymentId && item.sowRoleId === role.id && String(item.month || "").slice(0, 10) === monthId
    );
    const plannedQuantity = deploymentPlan ? Number(deploymentPlan.plannedQuantity || 0) : derivePlannedQuantity(role, deployment, month);
    const actualQuantity = actual ? Number(actual.actualQuantity || 0) : null;
    return {
      id: `${deployment.id}-${monthId}`,
      month: monthId,
      monthLabel: formatMonthLabel(monthId),
      planId: deploymentPlan?.id || "",
      planNumber: deploymentPlan?.number || "",
      plannedQuantity,
      plannedUnit: deploymentPlan?.plannedUnit || role.measurementUnit || "HOURS",
      plannedNotes: deploymentPlan?.notes || "",
      planSource: deploymentPlan ? "Manual Plan" : "Derived",
      actualId: actual?.id || "",
      actualQuantity,
      actualUnit: actual?.actualUnit || role.measurementUnit || "HOURS",
      remarks: actual?.remarks || "",
      uploadBatchRef: actual?.uploadBatchRef || "",
      variance: actualQuantity === null ? null : Number((actualQuantity - plannedQuantity).toFixed(2)),
      status: rowStatus(plannedQuantity, actualQuantity)
    };
  });

  const enteredRows = monthRows.filter((row) => row.actualQuantity !== null).length;
  const missingRows = monthRows.length - enteredRows;
  const plannedTotal = Number(monthRows.reduce((sum, row) => sum + Number(row.plannedQuantity || 0), 0).toFixed(2));
  const actualTotal = Number(monthRows.reduce((sum, row) => sum + Number(row.actualQuantity || 0), 0).toFixed(2));
  const plannedHours = Number(monthRows.reduce((sum, row) => sum + quantityToHours(row.plannedQuantity, row.plannedUnit), 0).toFixed(2));
  const actualHours = Number(monthRows.reduce((sum, row) => {
    if (row.actualQuantity === null || row.actualQuantity === undefined) {
      return sum;
    }
    return sum + quantityToHours(row.actualQuantity, row.actualUnit);
  }, 0).toFixed(2));
  const plannedRevenue = Number((plannedHours * billRate).toFixed(2));
  const plannedCost = Number((plannedHours * costRate).toFixed(2));
  const actualRevenue = Number((actualHours * billRate).toFixed(2));
  const actualCost = Number((actualHours * costRate).toFixed(2));

  return {
    id: deployment.id,
    deploymentId: deployment.id,
    deploymentNumber: deployment.number,
    roleId: role.id,
    roleNumber: role.number,
    roleTitle: role.title,
    resourceId: resource?.id || "",
    resourceName: `${resource?.firstName || ""} ${resource?.lastName || ""}`.trim() || resource?.number || "-",
    measurementUnit: role.measurementUnit || "HOURS",
    allocationPercent: deployment.allocationPercent,
    billRate,
    costRate,
    plannedTotal,
    actualTotal,
    plannedHours,
    actualHours,
    plannedRevenue,
    plannedCost,
    plannedGrossMargin: Number((plannedRevenue - plannedCost).toFixed(2)),
    plannedGrossMarginPercent: marginPercent(plannedRevenue, plannedCost),
    actualRevenue,
    actualCost,
    actualGrossMargin: Number((actualRevenue - actualCost).toFixed(2)),
    actualGrossMarginPercent: marginPercent(actualRevenue, actualCost),
    missingRows,
    status: missingRows ? "Not Entered" : monthRows.some((row) => row.status === "Variance") ? "Variance" : "Entered",
    monthRows
  };
}

function hydrateRolePlan({ sow, role, deploymentPlans }) {
  const startDate = role.startDate || sow.startDate;
  const endDate = role.endDate || sow.endDate;
  const monthRows = monthsBetween(startDate, endDate).map((month) => {
    const monthId = monthKey(month);
    const rolePlan = deploymentPlans.find((item) =>
      !item.deploymentId && item.sowRoleId === role.id && String(item.month || "").slice(0, 10) === monthId
    );
    const plannedQuantity = rolePlan ? Number(rolePlan.plannedQuantity || 0) : 0;
    return {
      id: `${role.id}-${monthId}`,
      month: monthId,
      monthLabel: formatMonthLabel(monthId),
      planId: rolePlan?.id || "",
      planNumber: rolePlan?.number || "",
      plannedQuantity,
      plannedUnit: rolePlan?.plannedUnit || role.measurementUnit || "HOURS",
      plannedNotes: rolePlan?.notes || "",
      planSource: rolePlan ? "Manual Plan" : "Role Template",
      status: rolePlan ? "Planned" : "Not Planned"
    };
  });
  const plannedTotal = Number(monthRows.reduce((sum, row) => sum + Number(row.plannedQuantity || 0), 0).toFixed(2));

  return {
    id: role.id,
    roleId: role.id,
    roleNumber: role.number,
    roleTitle: role.title,
    skill: role.skill || "",
    subModule: role.subModule || "",
    locationRequirement: role.locationRequirement || "",
    measurementUnit: role.measurementUnit || "HOURS",
    plannedAllocationPercent: Number(role.plannedAllocationPercent || 0),
    plannedHours: Number(role.plannedHours || 0),
    plannedTotal,
    monthRows
  };
}

router.get("/sows", async (_req, res) => {
  const sows = getCollection("sows");
  const accounts = getCollection("accounts");
  const roles = getCollection("sowRoles");
  const deployments = getCollection("deployments");

  const rows = sows
    .map((sow) => {
      const sowRoles = roles.filter((role) => role.sowId === sow.id);
      const sowDeployments = deployments.filter((deployment) => sowRoles.some((role) => role.id === deployment.sowRoleId));
      return {
        id: sow.id,
        number: sow.number,
        clientName: accounts.find((account) => account.id === sow.accountId)?.name || "-",
        name: sow.name,
        billingModel: sow.billingModel,
        projectManagerName: sow.projectManagerName || "-",
        deliveryManagerName: sow.deliveryManagerName || "-",
        status: sow.status,
        activeDeploymentCount: sowDeployments.filter((deployment) => deployment.status !== "CANCELLED").length
      };
    })
    .filter((row) => row.activeDeploymentCount > 0 || row.status === "ACTIVE")
    .sort((a, b) => a.name.localeCompare(b.name));

  res.json(rows);
});

router.get("/sows/:id", async (req, res) => {
  const sow = getCollection("sows").find((item) => item.id === req.params.id);
  if (!sow) {
    return res.status(404).json({ message: "SOW not found" });
  }

  const roles = getCollection("sowRoles").filter((role) => role.sowId === sow.id);
  const deployments = getCollection("deployments").filter((deployment) => roles.some((role) => role.id === deployment.sowRoleId));
  const resources = getCollection("resources");
  const actuals = getCollection("actuals");
  const deploymentPlans = getCollection("deploymentPlans");
  const account = getCollection("accounts").find((item) => item.id === sow.accountId) || null;

  const deploymentRows = deployments
    .map((deployment) => {
      const role = roles.find((item) => item.id === deployment.sowRoleId);
      const resource = resources.find((item) => item.id === deployment.resourceId);
      if (!role) {
        return null;
      }
      return hydrateDeploymentActuals({ sow, role, deployment, resource, actuals, deploymentPlans });
    })
    .filter(Boolean);
  const rolePlanRows = roles.map((role) => hydrateRolePlan({ sow, role, deploymentPlans }));

  const planRowsForTotals = rolePlanRows.length ? rolePlanRows : deploymentRows;
  const totalPlanned = Number(planRowsForTotals.reduce((sum, row) => sum + row.plannedTotal, 0).toFixed(2));
  const totalActual = Number(deploymentRows.reduce((sum, row) => sum + row.actualTotal, 0).toFixed(2));
  const missingRows = deploymentRows.reduce((sum, row) => sum + row.missingRows, 0);
  const financials = deploymentRows.reduce((totals, row) => ({
    plannedHours: totals.plannedHours + Number(row.plannedHours || 0),
    actualHours: totals.actualHours + Number(row.actualHours || 0),
    plannedRevenue: totals.plannedRevenue + Number(row.plannedRevenue || 0),
    plannedCost: totals.plannedCost + Number(row.plannedCost || 0),
    actualRevenue: totals.actualRevenue + Number(row.actualRevenue || 0),
    actualCost: totals.actualCost + Number(row.actualCost || 0)
  }), {
    plannedHours: 0,
    actualHours: 0,
    plannedRevenue: 0,
    plannedCost: 0,
    actualRevenue: 0,
    actualCost: 0
  });
  financials.plannedGrossMargin = Number((financials.plannedRevenue - financials.plannedCost).toFixed(2));
  financials.actualGrossMargin = Number((financials.actualRevenue - financials.actualCost).toFixed(2));
  financials.plannedGrossMarginPercent = marginPercent(financials.plannedRevenue, financials.plannedCost);
  financials.actualGrossMarginPercent = marginPercent(financials.actualRevenue, financials.actualCost);

  res.json({
    ...sow,
    account,
    rolePlanRows,
    deploymentRows,
    summary: {
      deploymentCount: deploymentRows.length,
      totalPlanned,
      totalActual,
      missingRows
    },
    financials
  });
});

router.get("/", async (_req, res) => {
  const deployments = getCollection("deployments");
  const resources = getCollection("resources");
  const sowRoles = getCollection("sowRoles");
  const sows = getCollection("sows");

  const actuals = getCollection("actuals").map((actual) => {
    const deployment = deployments.find((item) => item.id === actual.deploymentId);
    const role = sowRoles.find((item) => item.id === deployment?.sowRoleId);
    const sow = sows.find((item) => item.id === role?.sowId);
    const resource = resources.find((item) => item.id === deployment?.resourceId);

    return {
      ...actual,
      deployment,
      role,
      sow,
      resource
    };
  });

  res.json(actuals);
});

export default router;
