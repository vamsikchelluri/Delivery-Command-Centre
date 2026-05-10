import { Router } from "express";
import { getCollection } from "../data/store.js";
import { findOverheadRule, getEngagementOverheadRules, removeOverheadFromLoadedCost } from "../lib/overheadRules.js";

const router = Router();
const STANDARD_MONTH_HOURS = 168;
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
  return unit === "MAN_MONTHS" ? value * STANDARD_MONTH_HOURS : value;
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

function overheadLabel(rule) {
  if (!rule) return "";
  const percent = Number(rule.overheadPercent || 0);
  const hourlyAddOn = Number(rule.hourlyAddOn || 0);
  return `${percent}% + $${hourlyAddOn}/hr`;
}

function selectedSet(value) {
  return new Set(String(value || "").split(",").map((item) => item.trim()).filter(Boolean));
}

function defaultDateRange(sows, deployments, actuals) {
  const sowStartDates = sows.map((sow) => sow.startDate).filter(Boolean).sort();
  const deploymentIds = new Set(deployments.map((deployment) => deployment.id));
  const actualMonthEnds = actuals
    .filter((actual) => deploymentIds.has(actual.deploymentId))
    .map((actual) => monthEnd(actual.month)?.toISOString())
    .filter(Boolean)
    .sort();
  const fallbackEndDates = sows.map((sow) => sow.endDate).filter(Boolean).sort();
  return {
    dateFrom: dateKey(sowStartDates[0]),
    dateTo: dateKey(actualMonthEnds.at(-1) || fallbackEndDates.at(-1))
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
  const deploymentsById = new Map(deployments.map((deployment) => [deployment.id, deployment]));
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
      overhead: "",
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
      resourceStartDate: dateKey(deployment.startDate),
      resourceEndDate: dateKey(deployment.endDate),
      _billRateHours: 0,
      _costRateHours: 0,
      _basisHours: 0,
      _weightedEstimatedCostRate: 0,
      _weightedCostBasisAmountHourlyUsd: 0
    };

    const start = dateKey(deployment.startDate);
    const end = dateKey(deployment.endDate);
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
    const effectiveMonths = overlapMonthRange(deployment.startDate || role.startDate || sow.startDate, deployment.endDate || role.endDate || sow.endDate, dateFrom, dateTo);
    const actualRows = actuals.filter((actual) => actual.deploymentId === deployment.id && monthInRange(actual.month, dateFrom, dateTo));
    const actualHours = actualRows.reduce((sum, actual) => sum + quantityToHours(actual.actualQuantity, actual.actualUnit || role.measurementUnit || "HOURS"), 0);
    const billRate = Number(role.billRate || deployment.lockedBillRate || 0);
    const estimatedCostRate = Number(resource.costRate || deployment.lockedCostRate || role.costRate || role.loadedCostGuidance || 0);
    const rule = findOverheadRule(overheadRules, resource.employmentType || role.engagementType, resource.locationType || role.locationRequirement);
    const costBasisAmountHourlyUsd = removeOverheadFromLoadedCost(estimatedCostRate, overheadRules, resource.employmentType || role.engagementType, resource.locationType || role.locationRequirement);

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
    row.overhead = row.overhead || overheadLabel(rule);
  }

  const rows = [...rowMap.values()]
    .map((row) => {
      const billRate = row._billRateHours ? row.billRate / row._billRateHours : row.billRate;
      const estimatedCostRate = row._costRateHours ? row._weightedEstimatedCostRate / row._costRateHours : row.estimatedCostRate;
      const costBasisAmountHourlyUsd = row._basisHours ? row._weightedCostBasisAmountHourlyUsd / row._basisHours : row.costBasisAmountHourlyUsd;
      const ptoFixedBidHours = Math.max(row.plannedHours - row.actualHours, 0);
      const profitFromPtoFixedBid = ptoFixedBidHours * billRate;
      const revenue = row.actualHours * billRate;
      const totalCost = row.actualHours * estimatedCostRate;
      const profit = revenue - totalCost;
      const { _billRateHours, _costRateHours, _basisHours, _weightedEstimatedCostRate, _weightedCostBasisAmountHourlyUsd, ...clean } = row;
      return {
        ...clean,
        plannedHours: round(row.plannedHours),
        actualHours: round(row.actualHours),
        billRate: round(billRate),
        revenue: round(revenue),
        costBasisAmountHourlyUsd: round(costBasisAmountHourlyUsd),
        estimatedCostRate: round(estimatedCostRate),
        totalCost: round(totalCost),
        profit: round(profit),
        ptoFixedBidHours: round(ptoFixedBidHours),
        profitFromPtoFixedBid: round(profitFromPtoFixedBid),
        totalRevenueBilledToCustomer: round(revenue + profitFromPtoFixedBid)
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

  return {
    filters: buildFilterOptions(sows, accounts),
    scope: {
      dateFrom,
      dateTo,
      includedStatuses: [...INCLUDED_SOW_STATUSES]
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
    ["overhead", "Overhead"],
    ["estimatedCostRate", "Estimated Cost Rate"],
    ["totalCost", "Total Cost"],
    ["profit", "Profit"],
    ["ptoFixedBidHours", "PTO / Fixed Bid Hours"],
    ["profitFromPtoFixedBid", "Profit from PTO / Fixed Bid"],
    ["totalRevenueBilledToCustomer", "Total Revenue Billed to Customer"],
    ["sowNumber", "SOW Number"],
    ["resourceStartDate", "Resource Start Date"],
    ["resourceEndDate", "Resource End Date"],
    ["clientName", "Client"],
    ["deliveryManagerName", "Delivery Manager"]
  ];
  const csv = [
    columns.map(([, label]) => csvEscape(label)).join(","),
    ...payload.rows.map((row) => columns.map(([key]) => csvEscape(row[key])).join(","))
  ].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=resource-profitability-report.csv");
  res.send(csv);
});

export default router;
