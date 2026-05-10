import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, downloadFile } from "../lib/api";
import { DataTable, PageHeaderCard, Section, StatCard } from "../components.jsx";

function money(value) {
  const number = Number(value || 0);
  const prefix = number < 0 ? "-$" : "$";
  return `${prefix}${Math.abs(number).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function hours(value) {
  return Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function queryFromFilters(filters) {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.client) params.set("client", filters.client);
  if (filters.deliveryManager) params.set("deliveryManager", filters.deliveryManager);
  if (filters.sowIds.length) params.set("sowIds", filters.sowIds.join(","));
  return params.toString();
}

export function ReportsPage() {
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    client: "",
    deliveryManager: "",
    sowIds: []
  });
  const [exportError, setExportError] = useState("");
  const queryString = useMemo(() => queryFromFilters(filters), [filters]);
  const { data, isLoading, error } = useQuery({
    queryKey: ["reports", "resource-profitability", queryString],
    queryFn: () => apiFetch(`/reports/resource-profitability${queryString ? `?${queryString}` : ""}`)
  });

  const effectiveFilters = data?.scope || {};
  const filterOptions = data?.filters || {};
  const rows = data?.rows || [];
  const totals = data?.totals || {};

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function updateSowSelection(event) {
    const selected = Array.from(event.target.selectedOptions).map((option) => option.value);
    updateFilter("sowIds", selected);
  }

  function resetFilters() {
    setFilters({ dateFrom: "", dateTo: "", client: "", deliveryManager: "", sowIds: [] });
  }

  async function exportCsv() {
    setExportError("");
    try {
      await downloadFile(`/reports/resource-profitability.csv${queryString ? `?${queryString}` : ""}`, "resource-profitability-report.csv");
    } catch (downloadError) {
      setExportError(downloadError.message || "Unable to export report.");
    }
  }

  return (
    <div className="workspace">
      <PageHeaderCard
        eyebrow="Reports"
        title="Resource Profitability Report"
        subtitle="Resource-level planned hours, actual hours, billed revenue, cost, and PTO / fixed-bid uplift by SOW."
        actions={<button type="button" onClick={exportCsv}>Export CSV</button>}
      />

      <div className="financial-filter-panel resource-filter-panel">
        <div>
          <strong>Filters apply to Resource Profitability Report</strong>
          <small>Defaults use SOW start through the last actuals month end. SOW scope includes ACTIVE and COMPLETED.</small>
        </div>
        <div className="financial-filter-grid report-filter-grid refined">
          <label><span>Date From</span><input type="date" value={filters.dateFrom || effectiveFilters.dateFrom || ""} onChange={(event) => updateFilter("dateFrom", event.target.value)} /></label>
          <label><span>Date To</span><input type="date" value={filters.dateTo || effectiveFilters.dateTo || ""} onChange={(event) => updateFilter("dateTo", event.target.value)} /></label>
          <label><span>Client</span><select value={filters.client} onChange={(event) => updateFilter("client", event.target.value)}><option value="">All Clients</option>{(filterOptions.clients || []).map((option) => <option key={option}>{option}</option>)}</select></label>
          <label><span>Delivery Manager</span><select value={filters.deliveryManager} onChange={(event) => updateFilter("deliveryManager", event.target.value)}><option value="">All DMs</option>{(filterOptions.deliveryManagers || []).map((option) => <option key={option}>{option}</option>)}</select></label>
          <label className="wide-filter"><span>SOW</span><select multiple value={filters.sowIds} onChange={updateSowSelection}>{(filterOptions.sows || []).map((sow) => <option key={sow.id} value={sow.id}>{sow.number} / {sow.name}</option>)}</select></label>
          <button className="secondary-button" type="button" onClick={resetFilters}>Clear</button>
        </div>
      </div>

      {exportError ? <div className="error-banner">{exportError}</div> : null}

      <div className="stats-grid register-kpi-row">
        <StatCard label="Planned Hours" value={hours(totals.plannedHours)} />
        <StatCard label="Actual Hours" value={hours(totals.actualHours)} />
        <StatCard label="Revenue" value={money(totals.revenue)} />
        <StatCard label="Total Cost" value={money(totals.totalCost)} />
        <StatCard label="Profit" value={money(totals.profit)} />
        <StatCard label="Total Billed" value={money(totals.totalRevenueBilledToCustomer)} />
      </div>

      <Section title="Resource Profitability">
        {isLoading ? (
          <div className="loading">Loading report...</div>
        ) : error ? (
          <div className="error-banner">{error.message}</div>
        ) : (
          <DataTable
            columns={[
              { key: "candidateFirstName", label: "First Name" },
              { key: "candidateLastName", label: "Last Name" },
              { key: "engagementType", label: "Engagement Type" },
              { key: "plannedHours", label: "Planned Hours", render: (row) => hours(row.plannedHours) },
              { key: "actualHours", label: "Actual Hours", render: (row) => hours(row.actualHours) },
              { key: "billRate", label: "Bill Rate", render: (row) => money(row.billRate) },
              { key: "revenue", label: "Revenue", render: (row) => money(row.revenue) },
              { key: "costBasisAmountHourlyUsd", label: "Cost Basis /hr USD", render: (row) => money(row.costBasisAmountHourlyUsd) },
              { key: "overhead", label: "Overhead" },
              { key: "estimatedCostRate", label: "Estimated Cost Rate", render: (row) => money(row.estimatedCostRate) },
              { key: "totalCost", label: "Total Cost", render: (row) => money(row.totalCost) },
              { key: "profit", label: "Profit", render: (row) => money(row.profit) },
              { key: "profitFromPtoFixedBid", label: "Profit from PTO / Fixed Bid", render: (row) => money(row.profitFromPtoFixedBid) },
              { key: "totalRevenueBilledToCustomer", label: "Total Revenue Billed", render: (row) => money(row.totalRevenueBilledToCustomer) },
              { key: "sowNumber", label: "SOW Number" },
              { key: "resourceStartDate", label: "Resource Start Date" },
              { key: "resourceEndDate", label: "Resource End Date" }
            ]}
            rows={rows}
          />
        )}
      </Section>
    </div>
  );
}
