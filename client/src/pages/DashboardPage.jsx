import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { DataTable, Section, StatCard } from "../components.jsx";

function formatMoney(value) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function formatMonth(value) {
  if (!value) {
    return "Current month";
  }
  const date = new Date(`${value}-01T00:00:00.000Z`);
  return date.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function DonutChart({ segments, centerValue, centerLabel }) {
  const total = segments.reduce((sum, segment) => sum + Number(segment.value || 0), 0);
  let offset = 0;
  const gradient = total
    ? segments.map((segment) => {
      const start = offset;
      const end = offset + (Number(segment.value || 0) / total) * 100;
      offset = end;
      return `${segment.color} ${start}% ${end}%`;
    }).join(", ")
    : "#e8eef3 0% 100%";

  return (
    <div className="donut-chart" style={{ "--donut-gradient": `conic-gradient(${gradient})` }}>
      <div className="donut-core">
        <strong>{centerValue}</strong>
        <span>{centerLabel}</span>
      </div>
    </div>
  );
}

function ChartLegend({ items }) {
  return (
    <div className="chart-legend">
      {items.map((item) => (
        <span key={item.label}>
          <i style={{ background: item.color }} />
          {item.label}: <strong>{item.value}</strong>
        </span>
      ))}
    </div>
  );
}

function FinancialMixChart({ row }) {
  const selected = row || {
    label: "No month",
    revenue: 0,
    cost: 0,
    grossMargin: 0,
    marginPercent: 0
  };
  const segments = [
    { label: "Revenue", value: Number(selected.revenue || 0), color: "#2563eb" },
    { label: "Cost", value: Number(selected.cost || 0), color: "#dc2626" },
    { label: "Gross Margin", value: Math.max(0, Number(selected.grossMargin || 0)), color: "#16a34a" }
  ];
  return (
    <div className="financial-mix-panel">
      <DonutChart segments={segments} centerValue={formatPercent(selected.marginPercent)} centerLabel="margin" />
      <div className="financial-mix-values">
        <span className="basis-chip">Basis: {selected.basis || "Actual"}</span>
        <ChartLegend items={segments.map((segment) => ({ ...segment, value: formatMoney(segment.value) }))} />
        <div className="financial-mix-note">
          <span>{selected.label}</span>
          <strong>{formatMoney(selected.revenue)}</strong>
        </div>
      </div>
    </div>
  );
}

function ActualsCompletionChart({ summary }) {
  const total = Number(summary?.total || 0);
  const segments = [
    { label: "Entered", value: Number(summary?.entered || 0), color: "#0f8a5f" },
    { label: "Variance", value: Number(summary?.variance || 0), color: "#b7791f" },
    { label: "Missing", value: Number(summary?.missing || 0), color: "#c2413a" }
  ];
  return (
    <div className="donut-panel">
      <DonutChart segments={segments} centerValue={total} centerLabel="rows" />
      <ChartLegend items={segments.map((segment) => ({ ...segment, value: segment.value }))} />
    </div>
  );
}

function ResourceUtilizationChart({ summary }) {
  const total = Number(summary?.total || 0);
  const segments = [
    { label: "Fully Deployed", value: Number(summary?.fullyDeployed || 0), color: "#0f8a5f" },
    { label: "Partially Deployed", value: Number(summary?.partiallyDeployed || 0), color: "#2b7cff" },
    { label: "Available", value: Number(summary?.available || 0), color: "#b7791f" },
    { label: "On Leave", value: Number(summary?.onLeave || 0), color: "#7c3aed" }
  ];
  return (
    <div className="donut-panel">
      <DonutChart segments={segments} centerValue={total} centerLabel="resources" />
      <ChartLegend items={segments.map((segment) => ({ ...segment, value: segment.value }))} />
    </div>
  );
}

function AlertList({ rows, onSelect }) {
  if (!rows.length) {
    return <div className="empty-state">No active alerts for this scope.</div>;
  }

  return (
    <div className="alert-list">
      {rows.map((row) => (
        <button className="alert-item" key={row.id} onClick={() => onSelect(row)} type="button">
          <span>{row.name}</span>
          <strong>{row.count}</strong>
          <em className={`status-chip status-${String(row.priority || "").toLowerCase()}`}>{row.priority}</em>
        </button>
      ))}
    </div>
  );
}

function RollOffTimeline({ rows, onClick }) {
  if (!rows.length) {
    return <div className="empty-state">No upcoming roll-offs are available for this scope.</div>;
  }

  return (
    <div className="rolloff-timeline">
      {rows.map((row) => (
        <button key={row.id} className="rolloff-item" onClick={() => onClick(row)} type="button">
          <span>{row.bucket}</span>
          <strong>{row.resourceName}</strong>
          <small>{String(row.rollOffDate || "").slice(0, 10)}{row.currentSowName ? ` / ${row.currentSowName}` : ""}</small>
        </button>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [selectedFinancialMonth, setSelectedFinancialMonth] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch("/dashboard")
  });

  if (isLoading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  const kpis = data.kpis;
  const currentMonthLabel = formatMonth(data.currentMonth);
  const alertRows = data.alerts || [];
  const charts = data.charts || {};
  const scope = data.scope || { role: "COO", mode: "Portfolio", userName: "Aarav COO" };
  const financialMonths = charts.revenueCostTrend || [];
  const effectiveFinancialMonth = selectedFinancialMonth || financialMonths.at(-1)?.month || data.currentMonth;
  const selectedFinancialRow = financialMonths.find((row) => row.month === effectiveFinancialMonth) || financialMonths.at(-1);

  const benchRows = data.resources
    .filter((resource) => resource.currentDeliveryStatus === "AVAILABLE")
    .map((resource) => ({
      ...resource,
      agingBucket: "> 30 days",
      availablePercent: resource.currentAvailablePercent
    }));

  return (
    <div className="dashboard-cockpit">
      <section className="hero-panel command-strip">
        <div>
          <p className="eyebrow">Command Center</p>
          <h2>{scope.role} review cockpit</h2>
          <p className="muted">
            {scope.mode} view for {scope.userName}: pipeline, delivery, actuals, resources, and revenue.
          </p>
        </div>
        <div className="filter-bar compact">
          <span>Scope: {scope.mode}</span>
          <span>Role: {scope.role}</span>
          <span>Month: {currentMonthLabel}</span>
        </div>
      </section>

      <section className="stats-grid kpi-row">
        <StatCard label={`${currentMonthLabel} Revenue`} value={formatMoney(kpis.visibleRevenue)} note="Actual effort driven" onClick={() => navigate("/actuals")} />
        <StatCard label={`${currentMonthLabel} Cost`} value={formatMoney(kpis.visibleCost)} note="Locked resource rates" onClick={() => navigate("/actuals")} />
        <StatCard label="Gross Margin" value={formatMoney(kpis.grossMargin)} note="Actuals financials" onClick={() => navigate("/actuals")} />
        <StatCard label="Active SOWs" value={kpis.activeSows} note="Open SOW register" onClick={() => navigate("/sows")} />
        <StatCard label="Open Weighted Pipeline" value={formatMoney(kpis.weightedPipeline)} note="Excludes won/lost" onClick={() => navigate("/opportunities")} />
      </section>

      <div className="visual-cockpit-grid">
        <Section
          title="Revenue vs Cost vs Gross Margin"
          actions={
            <select className="section-control" value={selectedFinancialRow?.month || ""} onChange={(event) => setSelectedFinancialMonth(event.target.value)}>
              {financialMonths.map((row) => <option key={row.month} value={row.month}>{row.label}</option>)}
            </select>
          }
        >
          <FinancialMixChart row={selectedFinancialRow} />
        </Section>

        <Section title={`${currentMonthLabel} Actuals Completion`} actions={<Link className="text-link" to="/actuals">Open</Link>}>
          <ActualsCompletionChart summary={charts.actualsCompletion} />
        </Section>

        <Section title="Resource Utilization Mix" actions={<Link className="text-link" to="/resources">View all</Link>}>
          <ResourceUtilizationChart summary={charts.resourceUtilization} />
        </Section>
      </div>

      <div className="cockpit-grid dashboard-ops-grid">
        <Section title="Alerts" actions={<Link className="text-link" to="/actuals">Actuals</Link>}>
          <AlertList rows={alertRows} onSelect={(row) => navigate(row.target || "/")} />
        </Section>

        <Section title="Bench Aging" actions={<Link className="text-link" to="/resources">View all</Link>}>
          <DataTable
            columns={[
              { key: "agingBucket", label: "Aging Bucket" },
              { key: "name", label: "Resource", render: (row) => `${row.firstName} ${row.lastName}` },
              { key: "primarySkill", label: "Skill" },
              { key: "availablePercent", label: "Available %" }
            ]}
            rows={benchRows}
            onRowClick={(row) => navigate(`/resources/${row.id}`)}
          />
        </Section>

        <Section title="Upcoming Roll-Off Timeline" actions={<Link className="text-link" to="/resources">View all</Link>}>
          <RollOffTimeline rows={charts.upcomingRollOffs || []} onClick={(row) => navigate(`/resources/${row.id}`)} />
        </Section>
      </div>

      <Section title="Priority Opportunities" actions={<Link className="text-link" to="/opportunities">View all</Link>}>
        <DataTable
          columns={[
            { key: "number", label: "Opportunity" },
            { key: "name", label: "Name" },
            { key: "stage", label: "Stage" },
            { key: "weightedValue", label: "Weighted Value", render: (row) => formatMoney(row.weightedValue) }
          ]}
          rows={data.opportunities}
          onRowClick={(row) => navigate(`/opportunities/${row.id}`)}
        />
      </Section>

      <Section title="Active SOWs" actions={<Link className="text-link" to="/sows">View all</Link>}>
        <DataTable
          columns={[
            { key: "number", label: "SOW" },
            { key: "name", label: "Engagement" },
            { key: "status", label: "Status" },
            { key: "visibleRevenue", label: "Visible Revenue", render: (row) => formatMoney(row.visibleRevenue) }
          ]}
          rows={data.sows}
          onRowClick={(row) => navigate(`/sows/${row.id}`)}
        />
      </Section>

      <Section title="Resource Snapshot" actions={<Link className="text-link" to="/resources">View all</Link>}>
        <DataTable
          columns={[
            { key: "number", label: "Resource" },
            { key: "primarySkill", label: "Primary Skill" },
            { key: "currentDeliveryStatusLabel", label: "Current Status" },
            { key: "currentDeployedPercent", label: "Current Deployed %" }
          ]}
          rows={data.resources}
          onRowClick={(row) => navigate(`/resources/${row.id}`)}
        />
      </Section>
    </div>
  );
}
