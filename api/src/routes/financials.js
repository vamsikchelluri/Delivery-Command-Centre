import { Router } from "express";
import { getCollection } from "../data/store.js";
import { permissionsForRole } from "../lib/permissions.js";

const router = Router();
const STANDARD_MONTH_HOURS = 168;
const BROAD_PORTFOLIO_ROLES = new Set(["COO", "Vice President", "Director", "Finance Viewer", "Super Admin"]);

function hasPermission(user, key) {
  const permissions = user?.permissions?.length ? user.permissions : permissionsForRole(user?.role);
  return permissions.includes(key);
}

function monthKey(value) {
  return String(value || "").slice(0, 7);
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

function monthLabel(value) {
  const date = new Date(`${value}-01T00:00:00.000Z`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

function quantityToHours(quantity, unit) {
  const value = Number(quantity || 0);
  return unit === "MAN_MONTHS" ? value * STANDARD_MONTH_HOURS : value;
}

function round(value) {
  return Number(Number(value || 0).toFixed(2));
}

function dollar(value) {
  return `$${round(value).toLocaleString("en-US")}`;
}

function percent(numerator, denominator) {
  return denominator ? round((Number(numerator || 0) / Number(denominator || 0)) * 100) : 0;
}

function statusFor(value, { green, amber, reverse = false }) {
  if (reverse) {
    if (value <= green) return "green";
    if (value <= amber) return "amber";
    return "red";
  }
  if (value >= green) return "green";
  if (value >= amber) return "amber";
  return "red";
}

function marginPercent(revenue, cost) {
  return revenue ? round(((Number(revenue || 0) - Number(cost || 0)) / Number(revenue || 0)) * 100) : 0;
}

function addFinancials(target, values) {
  target.plannedHours += Number(values.plannedHours || 0);
  target.actualHours += Number(values.actualHours || 0);
  target.plannedRevenue += Number(values.plannedRevenue || 0);
  target.actualRevenue += Number(values.actualRevenue || 0);
  target.plannedCost += Number(values.plannedCost || 0);
  target.actualCost += Number(values.actualCost || 0);
  return target;
}

function emptyTotals(id = "") {
  return {
    id,
    plannedHours: 0,
    actualHours: 0,
    plannedRevenue: 0,
    actualRevenue: 0,
    plannedCost: 0,
    actualCost: 0
  };
}

function finalizeTotals(row) {
  const plannedGrossMargin = row.plannedRevenue - row.plannedCost;
  const actualGrossMargin = row.actualRevenue - row.actualCost;
  return {
    ...row,
    plannedHours: round(row.plannedHours),
    actualHours: round(row.actualHours),
    plannedRevenue: round(row.plannedRevenue),
    actualRevenue: round(row.actualRevenue),
    plannedCost: round(row.plannedCost),
    actualCost: round(row.actualCost),
    plannedGrossMargin: round(plannedGrossMargin),
    actualGrossMargin: round(actualGrossMargin),
    plannedMarginPercent: marginPercent(row.plannedRevenue, row.plannedCost),
    actualMarginPercent: marginPercent(row.actualRevenue, row.actualCost),
    revenueVariance: round(row.actualRevenue - row.plannedRevenue),
    costVariance: round(row.actualCost - row.plannedCost),
    grossMarginVariance: round(actualGrossMargin - plannedGrossMargin),
    marginPointVariance: round(marginPercent(row.actualRevenue, row.actualCost) - marginPercent(row.plannedRevenue, row.plannedCost))
  };
}

function matchesScope(record, user) {
  if (!user?.name || BROAD_PORTFOLIO_ROLES.has(user.role)) {
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

function matchesFilters(sow, account, query) {
  return (
    (!query.client || query.client === "All" || account?.name === query.client) &&
    (!query.projectManager || query.projectManager === "All" || sow.projectManagerName === query.projectManager) &&
    (!query.deliveryManager || query.deliveryManager === "All" || sow.deliveryManagerName === query.deliveryManager) &&
    (!query.billingModel || query.billingModel === "All" || sow.billingModel === query.billingModel) &&
    (!query.status || query.status === "All" || sow.status === query.status)
  );
}

function monthInRange(month, query) {
  return (!query.monthFrom || month >= query.monthFrom) && (!query.monthTo || month <= query.monthTo);
}

function plannedRow(plan, { rolesById, deploymentsById, resourcesById }) {
  const deployment = plan.deploymentId ? deploymentsById.get(plan.deploymentId) : null;
  const role = rolesById.get(plan.sowRoleId || deployment?.sowRoleId);
  const resource = deployment ? resourcesById.get(deployment.resourceId) : null;
  if (!role) return null;
  if (!monthWithinRange(plan.month, deployment?.startDate || role.startDate, deployment?.endDate || role.endDate)) return null;
  const hours = quantityToHours(plan.plannedQuantity, plan.plannedUnit || role.measurementUnit || "HOURS");
  const billRate = Number(deployment?.lockedBillRate || role.billRate || 0);
  const costRate = Number(deployment?.lockedCostRate || resource?.costRate || role.costRate || role.loadedCostGuidance || role.costGuidance || 0);
  return {
    sowId: role.sowId,
    roleId: role.id,
    deploymentId: deployment?.id || "",
    month: monthKey(plan.month),
    plannedHours: hours,
    plannedRevenue: hours * billRate,
    plannedCost: hours * costRate
  };
}

function actualRow(actual, { rolesById, deploymentsById, resourcesById }) {
  const deployment = deploymentsById.get(actual.deploymentId);
  const role = rolesById.get(deployment?.sowRoleId);
  const resource = resourcesById.get(deployment?.resourceId);
  if (!deployment || !role) return null;
  const hours = quantityToHours(actual.actualQuantity, actual.actualUnit || role.measurementUnit || "HOURS");
  const billRate = Number(deployment.lockedBillRate || role.billRate || 0);
  const costRate = Number(deployment.lockedCostRate || resource?.costRate || role.costRate || role.loadedCostGuidance || role.costGuidance || 0);
  return {
    sowId: role.sowId,
    roleId: role.id,
    deploymentId: deployment.id,
    month: monthKey(actual.month),
    actualHours: hours,
    actualRevenue: hours * billRate,
    actualCost: hours * costRate
  };
}

function uniqueSorted(rows, selector) {
  return [...new Set(rows.map(selector).filter(Boolean))].sort();
}

router.get("/", (req, res) => {
  if (!hasPermission(req.user, "financialCockpit:view") && !hasPermission(req.user, "sowFinancials:view")) {
    return res.status(403).json({ message: "Financial Cockpit access is not enabled for this role." });
  }

  const accounts = getCollection("accounts");
  const sows = getCollection("sows");
  const roles = getCollection("sowRoles");
  const deployments = getCollection("deployments");
  const resources = getCollection("resources");
  const actuals = getCollection("actuals");
  const deploymentPlans = getCollection("deploymentPlans");

  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const rolesById = new Map(roles.map((role) => [role.id, role]));
  const deploymentsById = new Map(deployments.map((deployment) => [deployment.id, deployment]));
  const resourcesById = new Map(resources.map((resource) => [resource.id, resource]));

  const scopedSows = sows
    .filter((sow) => matchesScope(sow, req.user))
    .filter((sow) => sow.status === "ACTIVE")
    .filter((sow) => matchesFilters(sow, accountsById.get(sow.accountId), req.query));
  const scopedSowIds = new Set(scopedSows.map((sow) => sow.id));
  const scopedRoleIds = new Set(roles.filter((role) => scopedSowIds.has(role.sowId)).map((role) => role.id));
  const scopedDeploymentIds = new Set(deployments.filter((deployment) => scopedRoleIds.has(deployment.sowRoleId)).map((deployment) => deployment.id));

  const plannedRows = deploymentPlans
    .map((plan) => plannedRow(plan, { rolesById, deploymentsById, resourcesById }))
    .filter((row) => row && scopedSowIds.has(row.sowId) && monthInRange(row.month, req.query));
  const actualRows = actuals
    .map((actual) => actualRow(actual, { rolesById, deploymentsById, resourcesById }))
    .filter((row) => row && scopedDeploymentIds.has(row.deploymentId) && monthInRange(row.month, req.query));
  const actualMonthKeys = new Set(actualRows.map((row) => `${row.sowId}:${row.month}`));
  const comparisonPlannedRows = actualRows.length
    ? plannedRows.filter((row) => actualMonthKeys.has(`${row.sowId}:${row.month}`))
    : plannedRows;
  const summary = finalizeTotals([
    ...comparisonPlannedRows,
    ...actualRows
  ].reduce((totals, row) => addFinancials(totals, row), emptyTotals("portfolio")));

  const months = [...new Set([...plannedRows, ...actualRows].map((row) => row.month).filter(Boolean))].sort();
  const monthlyFinancials = months.map((month) => {
    const totals = emptyTotals(month);
    plannedRows.filter((row) => row.month === month).forEach((row) => addFinancials(totals, row));
    actualRows.filter((row) => row.month === month).forEach((row) => addFinancials(totals, row));
    return finalizeTotals({ ...totals, month, label: monthLabel(month) });
  });

  const clientMap = new Map();
  const sowMap = new Map();
  scopedSows.forEach((sow) => {
    const account = accountsById.get(sow.accountId);
    clientMap.set(account?.name || "Unknown", emptyTotals(account?.name || "Unknown"));
    sowMap.set(sow.id, {
      ...emptyTotals(sow.id),
      sowId: sow.id,
      sowNumber: sow.number,
      sowName: sow.name,
      clientName: account?.name || "-",
      projectManagerName: sow.projectManagerName,
      deliveryManagerName: sow.deliveryManagerName,
      billingModel: sow.billingModel,
      status: sow.status
    });
  });
  comparisonPlannedRows.forEach((row) => {
    const sow = sows.find((item) => item.id === row.sowId);
    const account = accountsById.get(sow?.accountId);
    addFinancials(sowMap.get(row.sowId), row);
    addFinancials(clientMap.get(account?.name || "Unknown"), row);
  });
  actualRows.forEach((row) => {
    const sow = sows.find((item) => item.id === row.sowId);
    const account = accountsById.get(sow?.accountId);
    addFinancials(sowMap.get(row.sowId), row);
    addFinancials(clientMap.get(account?.name || "Unknown"), row);
  });

  const sowPerformance = [...sowMap.values()]
    .map(finalizeTotals)
    .sort((a, b) => b.actualRevenue - a.actualRevenue);
  const marginLeakage = sowPerformance
    .filter((row) => row.actualRevenue > 0 && row.marginPointVariance < 0)
    .sort((a, b) => a.marginPointVariance - b.marginPointVariance)
    .slice(0, 8);
  const topRevenueSows = sowPerformance.slice(0, 8);
  const revenueByClient = [...clientMap.values()]
    .map(finalizeTotals)
    .filter((row) => row.actualRevenue > 0 || row.plannedRevenue > 0)
    .sort((a, b) => b.actualRevenue - a.actualRevenue)
    .slice(0, 8);

  const actualKeys = new Set(actualRows.map((row) => `${row.deploymentId}:${row.month}`));
  const missingActuals = plannedRows
    .filter((row) => row.deploymentId && !actualKeys.has(`${row.deploymentId}:${row.month}`))
    .map((row) => {
      const sow = sows.find((item) => item.id === row.sowId);
      const role = rolesById.get(row.roleId);
      const account = accountsById.get(sow?.accountId);
      return {
        id: `${row.deploymentId}-${row.month}`,
        month: row.month,
        monthLabel: monthLabel(row.month),
        sowId: row.sowId,
        sowNumber: sow?.number || "-",
        sowName: sow?.name || "-",
        clientName: account?.name || "-",
        roleTitle: role?.title || "-",
        plannedHours: round(row.plannedHours),
        plannedRevenue: round(row.plannedRevenue)
      };
    })
    .slice(0, 12);

  const actualsCompletion = {
    plannedRows: plannedRows.length,
    actualRows: actualRows.length,
    missingRows: missingActuals.length,
    completionPercent: percent(actualRows.length, plannedRows.length || actualRows.length)
  };
  const revenueAttainment = percent(summary.actualRevenue, summary.plannedRevenue);
  const costBurn = percent(summary.actualCost, summary.plannedCost);
  const marginTarget = summary.plannedMarginPercent;

  return res.json({
    scope: {
      role: req.user?.role || "Unknown",
      userName: req.user?.name || "Unknown",
      mode: BROAD_PORTFOLIO_ROLES.has(req.user?.role) ? "Portfolio" : "Assigned"
    },
    filters: {
      clients: ["All", ...uniqueSorted(scopedSows, (sow) => accountsById.get(sow.accountId)?.name)],
      projectManagers: ["All", ...uniqueSorted(scopedSows, (sow) => sow.projectManagerName)],
      deliveryManagers: ["All", ...uniqueSorted(scopedSows, (sow) => sow.deliveryManagerName)],
      billingModels: ["All", ...uniqueSorted(scopedSows, (sow) => sow.billingModel)],
      statuses: ["All", ...uniqueSorted(scopedSows, (sow) => sow.status)]
    },
    kpis: {
      ...summary,
      actualsCompletion,
      gauges: [
        {
          id: "revenue",
          label: "Revenue Attainment",
          value: revenueAttainment,
          displayValue: `${revenueAttainment.toFixed(1)}%`,
          caption: `${dollar(summary.actualRevenue)} actual / ${dollar(summary.plannedRevenue)} planned`,
          detailLabel: "Open revenue drilldown",
          status: statusFor(revenueAttainment, { green: 95, amber: 85 })
        },
        {
          id: "cost",
          label: "Cost Burn",
          value: costBurn,
          displayValue: `${costBurn.toFixed(1)}%`,
          caption: `${dollar(summary.actualCost)} actual / ${dollar(summary.plannedCost)} planned`,
          detailLabel: "Open cost drilldown",
          status: statusFor(costBurn, { green: 100, amber: 110, reverse: true })
        },
        {
          id: "margin",
          label: "Margin Health",
          value: summary.actualMarginPercent,
          displayValue: `${summary.actualMarginPercent.toFixed(1)}%`,
          caption: `Actual GM% vs planned ${marginTarget.toFixed(1)}%`,
          detailLabel: "Open margin drilldown",
          status: statusFor(summary.actualMarginPercent, { green: marginTarget, amber: marginTarget - 5 })
        },
        {
          id: "actuals",
          label: "Actuals Confidence",
          value: actualsCompletion.completionPercent,
          displayValue: `${actualsCompletion.completionPercent.toFixed(1)}%`,
          caption: `${actualsCompletion.actualRows} entered / ${actualsCompletion.plannedRows} planned rows`,
          detailLabel: "Open actuals drilldown",
          status: statusFor(actualsCompletion.completionPercent, { green: 95, amber: 80 })
        }
      ]
    },
    charts: {
      monthlyFinancials,
      revenueByClient
    },
    tables: {
      sowPerformance,
      marginLeakage,
      missingActuals,
      topRevenueSows
    }
  });
});

export default router;
