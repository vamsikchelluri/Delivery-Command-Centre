import { Router } from "express";
import { getCollection } from "../data/store.js";
import { getEngagementOverheadRules, removeOverheadFromLoadedCost } from "../lib/overheadRules.js";
import { standardManMonthHours } from "../lib/masterSettings.js";

const router = Router();
const INCLUDED_SOW_STATUSES = new Set(["ACTIVE", "COMPLETED"]);

function monthKey(value) {
  return String(value || "").slice(0, 7);
}

function monthStart(value) {
  const key = monthKey(value);
  if (!key) return null;
  const date = new Date(`${key}-01T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthEnd(value) {
  const start = monthStart(value);
  if (!start) return null;
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
}

function dateKey(value) {
  return value ? String(value).slice(0, 10) : "";
}

function latestDateKey(...values) {
  return values.map(dateKey).filter(Boolean).sort().at(-1) || "";
}

function earliestDateKey(...values) {
  return values.map(dateKey).filter(Boolean).sort()[0] || "";
}

function effectiveDeploymentStart(deployment, role, sow) {
  return latestDateKey(deployment.startDate, role.startDate) || dateKey(sow.startDate);
}

function effectiveDeploymentEnd(deployment, role, sow) {
  return earliestDateKey(deployment.endDate, role.endDate) || dateKey(sow.endDate);
}

function monthsBetween(startValue, endValue) {
  const start = monthStart(startValue);
  const end = monthStart(endValue);
  if (!start || !end || start > end) return [];
  const months = [];
  const current = new Date(start);
  while (current <= end) {
    months.push(current.toISOString().slice(0, 7));
    current.setUTCMonth(current.getUTCMonth() + 1);
  }
  return months;
}

function monthInRange(month, from, to) {
  const key = monthKey(month);
  return key && (!from || key >= monthKey(from)) && (!to || key <= monthKey(to));
}

function overlapMonthRange(startDate, endDate, from, to) {
  const starts = [monthKey(startDate), monthKey(from)].filter(Boolean).sort();
  const ends = [monthKey(endDate), monthKey(to)].filter(Boolean).sort();
  const start = starts.at(-1);
  const end = ends.at(0);
  if (!start || !end || start > end) return [];
  return monthsBetween(start, end);
}

function quantityToHours(quantity, unit) {
  const value = Number(quantity || 0);
  return unit === "MAN_MONTHS" ? value * standardManMonthHours() : value;
}

function round(value) {
  return Number(Number(value || 0).toFixed(2));
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function selectedSet(value) {
  return new Set(String(value || "").split(",").map((item) => item.trim()).filter(Boolean));
}

function isFullTimeEngagement(value) {
  return String(value || "").trim().toLowerCase() === "full-time";
}

function defaultDateRange(sows, deployments, actuals) {
  const sowStartDates = sows.map((sow) => sow.startDate).filter(Boolean).sort();
  const deploymentStartDates = deployments.map((deployment) => deployment.startDate).filter(Boolean).sort();
  const deploymentEndDates = deployments.map((deployment) => deployment.endDate).filter(Boolean).sort();
  const deploymentIds = new Set(deployments.map((deployment) => deployment.id));
  const actualMonthEnds = actuals
    .filter((actual) => deploymentIds.has(actual.deploymentId))
    .map((actual) => monthEnd(actual.month)?.toISOString())
    .filter(Boolean)
    .sort();
  const fallbackEndDates = sows.map((sow) => sow.endDate).filter(Boolean).sort();
  const dateFrom = dateKey(deploymentStartDates[0] || sowStartDates[0]);
  const dateTo = dateKey(actualMonthEnds.at(-1) || deploymentEndDates.at(-1) || fallbackEndDates.at(-1));
  if (dateFrom && dateTo && dateFrom > dateTo) {
    return {
      dateFrom: dateKey(deploymentStartDates[0] || sowStartDates[0]),
      dateTo: dateKey(deploymentEndDates.at(-1) || fallbackEndDates.at(-1) || dateFrom)
    };
  }
  return {
    dateFrom,
    dateTo
  };
}

function buildFilterOptions(sows, accounts) {
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  return {
    clients: [...new Set(sows.map((sow) => accountById.get(sow.accountId)?.name).filter(Boolean))].sort(),
    sows: sows
      .map((sow) => ({ id: sow.id, number: sow.number, name: sow.name, clientName: accountById.get(sow.accountId)?.name || "" }))
      .sort((a, b) => String(a.number).localeCompare(String(b.number))),
    deliveryManagers: [...new Set(sows.map((sow) => sow.deliveryManagerName).filter(Boolean))].sort()
  };
}

async function resourceProfitabilityPayload(query) {
  const accounts = getCollection("accounts");
  const sows = getCollection("sows").filter((sow) => INCLUDED_SOW_STATUSES.has(sow.status));
  const roles = getCollection("sowRoles");
  const deployments = getCollection("deployments").filter((deployment) => deployment.status !== "CANCELLED");
  const resources = getCollection("resources");
  const actuals = getCollection("actuals");
  const deploymentPlans = getCollection("deploymentPlans");
  const overheadRules = await getEngagementOverheadRules();

  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const rolesById = new Map(roles.map((role) => [role.id, role]));
  const resourcesById = new Map(resources.map((resource) => [resource.id, resource]));
  const selectedSowIds = selectedSet(query.sowIds);

  const initialScopedSows = sows.filter((sow) =>
    (!query.client || accountsById.get(sow.accountId)?.name === query.client) &&
    (!query.deliveryManager || sow.deliveryManagerName === query.deliveryManager) &&
    (!selectedSowIds.size || selectedSowIds.has(sow.id))
  );
  const initialScopedSowIds = new Set(initialScopedSows.map((sow) => sow.id));
  const initialScopedRoleIds = new Set(roles.filter((role) => initialScopedSowIds.has(role.sowId)).map((role) => role.id));
  const initialScopedDeployments = deployments.filter((deployment) => initialScopedRoleIds.has(deployment.sowRoleId));
  const defaults = defaultDateRange(initialScopedSows, initialScopedDeployments, actuals);
  const dateFrom = query.dateFrom || defaults.dateFrom;
  const dateTo = query.dateTo || defaults.dateTo;

  const rowMap = new Map();

  function ensureRow(sow, deployment, role, resource) {
    const account = accountsById.get(sow.accountId);
    const key = `${sow.id}:${resource.id}`;
    const existing = rowMap.get(key) || {
      id: key,
      candidateFirstName: resource.firstName || "",
      candidateLastName: resource.lastName || "",
      engagementType: resource.employmentType || role.engagementType || "",
      plannedHours: 0,
      actualHours: 0,
      billRate: 0,
      revenue: 0,
      costBasisAmountHourlyUsd: 0,
      overheadAmountPerHour: 0,
      estimatedCostRate: Number(resource.costRate || role.costRate || role.loadedCostGuidance || 0),
      totalCost: 0,
      profit: 0,
      ptoFixedBidHours: 0,
      profitFromPtoFixedBid: 0,
      totalRevenueBilledToCustomer: 0,
      sowId: sow.id,
      sowNumber: sow.number,
      sowName: sow.name,
      clientName: account?.name || "",
      deliveryManagerName: sow.deliveryManagerName || "",
      resourceStartDate: effectiveDeploymentStart(deployment, role, sow),
      resourceEndDate: effectiveDeploymentEnd(deployment, role, sow),
      _billRateHours: 0,
      _costRateHours: 0,
      _basisHours: 0,
      _weightedEstimatedCostRate: 0,
      _weightedCostBasisAmountHourlyUsd: 0,
      _weightedOverheadAmountPerHour: 0
    };

    const start = effectiveDeploymentStart(deployment, role, sow);
    const end = effectiveDeploymentEnd(deployment, role, sow);
    if (!existing.resourceStartDate || (start && start < existing.resourceStartDate)) {
      existing.resourceStartDate = start;
    }
    if (!existing.resourceEndDate || (end && end > existing.resourceEndDate)) {
      existing.resourceEndDate = end;
    }
    rowMap.set(key, existing);
    return existing;
  }

  for (const deployment of initialScopedDeployments) {
    const role = rolesById.get(deployment.sowRoleId);
    const sow = initialScopedSows.find((item) => item.id === role?.sowId);
    const resource = resourcesById.get(deployment.resourceId);
    if (!role || !sow || !resource) continue;

    const row = ensureRow(sow, deployment, role, resource);
    const effectiveStartDate = effectiveDeploymentStart(deployment, role, sow);
    const effectiveEndDate = effectiveDeploymentEnd(deployment, role, sow);
    const effectiveMonths = overlapMonthRange(effectiveStartDate, effectiveEndDate, dateFrom, dateTo);
    const actualRows = actuals.filter((actual) =>
      actual.deploymentId === deployment.id &&
      monthInRange(actual.month, dateFrom, dateTo) &&
      monthInRange(actual.month, effectiveStartDate, effectiveEndDate)
    );
    const actualHours = actualRows.reduce((sum, actual) => sum + quantityToHours(actual.actualQuantity, actual.actualUnit || role.measurementUnit || "HOURS"), 0);
    const billRate = Number(role.billRate || deployment.lockedBillRate || 0);
    const estimatedCostRate = Number(resource.costRate || deployment.lockedCostRate || role.costRate || role.loadedCostGuidance || 0);
    const costBasisAmountHourlyUsd = removeOverheadFromLoadedCost(estimatedCostRate, overheadRules, resource.employmentType || role.engagementType, resource.locationType || role.locationRequirement);
    const overheadAmountPerHour = Math.max(0, estimatedCostRate - costBasisAmountHourlyUsd);

    let plannedHours = 0;
    for (const month of effectiveMonths) {
      const deploymentPlan = deploymentPlans.find((plan) => plan.deploymentId === deployment.id && monthKey(plan.month) === month);
      const rolePlan = deploymentPlans.find((plan) => !plan.deploymentId && plan.sowRoleId === role.id && monthKey(plan.month) === month);
      const plan = deploymentPlan || rolePlan;
      plannedHours += plan
        ? quantityToHours(plan.plannedQuantity, plan.plannedUnit || role.measurementUnit || "HOURS")
        : quantityToHours(role.plannedHours || 0, role.measurementUnit || "HOURS");
    }

    row.plannedHours += plannedHours;
    row.actualHours += actualHours;
    row.revenue += actualHours * billRate;
    row.totalCost += actualHours * estimatedCostRate;
    row._billRateHours += actualHours || plannedHours;
    row.billRate += billRate * (actualHours || plannedHours);
    row._costRateHours += actualHours || plannedHours;
    row._weightedEstimatedCostRate += estimatedCostRate * (actualHours || plannedHours);
    row._basisHours += actualHours || plannedHours;
    row._weightedCostBasisAmountHourlyUsd += costBasisAmountHourlyUsd * (actualHours || plannedHours);
    row._weightedOverheadAmountPerHour += overheadAmountPerHour * (actualHours || plannedHours);
  }

  const rows = [...rowMap.values()]
    .map((row) => {
      const billRate = row._billRateHours ? row.billRate / row._billRateHours : row.billRate;
      const estimatedCostRate = row._costRateHours ? row._weightedEstimatedCostRate / row._costRateHours : row.estimatedCostRate;
      const costBasisAmountHourlyUsd = row._basisHours ? row._weightedCostBasisAmountHourlyUsd / row._basisHours : row.costBasisAmountHourlyUsd;
      const overheadAmountPerHour = row._basisHours ? row._weightedOverheadAmountPerHour / row._basisHours : row.overheadAmountPerHour;
      const ptoFixedBidHours = Math.max(row.plannedHours - row.actualHours, 0);
      const plannedBillingUpliftHours = isFullTimeEngagement(row.engagementType) ? 0 : ptoFixedBidHours;
      const profitFromPtoFixedBid = plannedBillingUpliftHours * billRate;
      const revenue = row.actualHours * billRate;
      const totalCost = row.actualHours * estimatedCostRate;
      const profit = revenue - totalCost;
      const totalRevenueBilledToCustomer = revenue + profitFromPtoFixedBid;
      const marginPercent = totalRevenueBilledToCustomer ? (profit + profitFromPtoFixedBid) / totalRevenueBilledToCustomer * 100 : 0;
      const { _billRateHours, _costRateHours, _basisHours, _weightedEstimatedCostRate, _weightedCostBasisAmountHourlyUsd, _weightedOverheadAmountPerHour, ...clean } = row;
      return {
        ...clean,
        plannedHours: round(row.plannedHours),
        actualHours: round(row.actualHours),
        billRate: round(billRate),
        revenue: round(revenue),
        costBasisAmountHourlyUsd: round(costBasisAmountHourlyUsd),
        overheadAmountPerHour: round(overheadAmountPerHour),
        estimatedCostRate: round(estimatedCostRate),
        totalCost: round(totalCost),
        profit: round(profit),
        ptoFixedBidHours: round(plannedBillingUpliftHours),
        profitFromPtoFixedBid: round(profitFromPtoFixedBid),
        totalRevenueBilledToCustomer: round(totalRevenueBilledToCustomer),
        marginPercent: round(marginPercent)
      };
    })
    .filter((row) => row.plannedHours || row.actualHours)
    .sort((a, b) => `${a.clientName} ${a.sowNumber} ${a.candidateLastName}`.localeCompare(`${b.clientName} ${b.sowNumber} ${b.candidateLastName}`));

  const totals = rows.reduce((summary, row) => {
    summary.plannedHours += row.plannedHours;
    summary.actualHours += row.actualHours;
    summary.revenue += row.revenue;
    summary.totalCost += row.totalCost;
    summary.profit += row.profit;
    summary.ptoFixedBidHours += row.ptoFixedBidHours;
    summary.profitFromPtoFixedBid += row.profitFromPtoFixedBid;
    summary.totalRevenueBilledToCustomer += row.totalRevenueBilledToCustomer;
    return summary;
  }, {
    plannedHours: 0,
    actualHours: 0,
    revenue: 0,
    totalCost: 0,
    profit: 0,
    ptoFixedBidHours: 0,
    profitFromPtoFixedBid: 0,
    totalRevenueBilledToCustomer: 0
  });

  Object.keys(totals).forEach((key) => {
    totals[key] = round(totals[key]);
  });
  totals.marginPercent = totals.totalRevenueBilledToCustomer
    ? round(((totals.profit + totals.profitFromPtoFixedBid) / totals.totalRevenueBilledToCustomer) * 100)
    : 0;

  return {
    filters: buildFilterOptions(sows, accounts),
    scope: {
      dateFrom,
      dateTo,
      includedStatuses: [...INCLUDED_SOW_STATUSES],
      client: query.client || "",
      deliveryManager: query.deliveryManager || "",
      sowIds: [...selectedSowIds]
    },
    totals,
    rows
  };
}

router.get("/resource-profitability", async (req, res) => {
  res.json(await resourceProfitabilityPayload(req.query));
});

router.get("/resource-profitability.csv", async (req, res) => {
  const payload = await resourceProfitabilityPayload(req.query);
  const columns = [
    ["candidateFirstName", "Candidate First Name"],
    ["candidateLastName", "Candidate Last Name"],
    ["engagementType", "Engagement Type"],
    ["plannedHours", "Planned Hours"],
    ["actualHours", "Actual Hours"],
    ["billRate", "Bill Rate"],
    ["revenue", "Revenue"],
    ["costBasisAmountHourlyUsd", "Cost Basis Amount in /hr USD"],
    ["overheadAmountPerHour", "Overhead /hr"],
    ["estimatedCostRate", "Estimated Cost Rate"],
    ["totalCost", "Total Cost"],
    ["profit", "Profit"],
    ["ptoFixedBidHours", "PTO / Fixed Bid Hours"],
    ["profitFromPtoFixedBid", "Planned Billing Uplift"],
    ["totalRevenueBilledToCustomer", "Total Revenue Billed to Customer"],
    ["marginPercent", "Margin %"],
    ["sowNumber", "SOW Number"],
    ["resourceStartDate", "Resource Start Date"],
    ["resourceEndDate", "Resource End Date"],
    ["clientName", "Client"],
    ["deliveryManagerName", "Delivery Manager"]
  ];
  const criteriaRows = [
    ["Resource Profitability Report"],
    ["Date From", payload.scope.dateFrom],
    ["Date To", payload.scope.dateTo],
    ["Client", payload.scope.client || "All Clients"],
    ["Delivery Manager", payload.scope.deliveryManager || "All DMs"],
    ["SOW Count Selected", payload.scope.sowIds.length || "All SOWs"],
    ["Included SOW Statuses", payload.scope.includedStatuses.join(", ")],
    []
  ];
  const csv = [
    ...criteriaRows.map((row) => row.map(csvEscape).join(",")),
    columns.map(([, label]) => csvEscape(label)).join(","),
    ...payload.rows.map((row) => columns.map(([key]) => csvEscape(row[key])).join(","))
  ].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=resource-profitability-report.csv");
  res.send(csv);
});

export default router;
