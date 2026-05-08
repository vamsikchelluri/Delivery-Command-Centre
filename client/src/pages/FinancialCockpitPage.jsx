import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { DataTable, Section } from "../components.jsx";

function money(value) {
  const number = Number(value || 0);
  const prefix = number < 0 ? "-$" : "$";
  return `${prefix}${Math.abs(number).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function moneyPrecise(value) {
  const number = Number(value || 0);
  const prefix = number < 0 ? "-$" : "$";
  return `${prefix}${Math.abs(number).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function percent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function points(value) {
  return `${Number(value || 0).toFixed(1)} pts`;
}

function clamp(value, min = 0, max = 120) {
  return Math.max(min, Math.min(max, Number(value || 0)));
}

function gaugeAngle(value) {
  return -90 + (clamp(value) / 120) * 180;
}

function GaugeCard({ gauge, active, onClick }) {
  const angle = gaugeAngle(gauge.value);
  return (
    <button className={`gauge-card gauge-${gauge.status}${active ? " active" : ""}`} type="button" onClick={onClick}>
      <span className="gauge-label">{gauge.label}</span>
      <div className="gauge-face" aria-hidden="true">
        <div className="gauge-zone gauge-zone-red" />
        <div className="gauge-zone gauge-zone-amber" />
        <div className="gauge-zone gauge-zone-green" />
        <i className="gauge-needle" style={{ transform: `rotate(${angle}deg)` }} />
        <b>{gauge.displayValue}</b>
      </div>
      <strong>{gauge.caption}</strong>
      <small>{gauge.detailLabel || "Open drilldown"}</small>
    </button>
  );
}

function SignalCard({ id, active, title, value, note, status, onClick }) {
  return (
    <button className={`signal-card signal-${status}${active ? " active" : ""}`} type="button" onClick={() => onClick(id)}>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{note}</small>
      <i />
    </button>
  );
}

function ClientConcentration({ rows, activeClient, onClick }) {
  const topRows = rows.slice(0, 5);
  const max = Math.max(1, ...topRows.map((row) => Number(row.actualRevenue || row.plannedRevenue || 0)));
  if (!topRows.length) return <div className="empty-state">No client concentration signal for this scope.</div>;
  return (
    <div className="client-concentration">
      {topRows.map((row) => {
        const value = Number(row.actualRevenue || row.plannedRevenue || 0);
        return (
          <button className={activeClient === row.id ? "active" : ""} type="button" key={row.id} onClick={() => onClick(row)}>
            <span>{row.id}</span>
            <div><i style={{ width: `${(value / max) * 100}%` }} /></div>
            <strong>{money(value)}</strong>
          </button>
        );
      })}
    </div>
  );
}

function PortfolioMix({ rows, activeMix, onClick }) {
  const totals = rows.reduce((map, row) => {
    const key = row.billingModel || "Unknown";
    const current = map.get(key) || { id: key, count: 0, actualRevenue: 0, plannedRevenue: 0 };
    current.count += 1;
    current.actualRevenue += Number(row.actualRevenue || 0);
    current.plannedRevenue += Number(row.plannedRevenue || 0);
    map.set(key, current);
    return map;
  }, new Map());
  const values = [...totals.values()].sort((a, b) => b.actualRevenue - a.actualRevenue);
  const total = values.reduce((sum, row) => sum + Number(row.actualRevenue || row.plannedRevenue || 0), 0) || 1;
  if (!values.length) return <div className="empty-state">No portfolio mix available for this scope.</div>;
  return (
    <div className="portfolio-mix">
      {values.map((row) => {
        const value = Number(row.actualRevenue || row.plannedRevenue || 0);
        return (
          <button className={activeMix === row.id ? "active" : ""} type="button" key={row.id} onClick={() => onClick(row)}>
            <span>{row.id}</span>
            <strong>{percent((value / total) * 100)}</strong>
            <em>{row.count} SOWs</em>
            <i style={{ width: `${(value / total) * 100}%` }} />
          </button>
        );
      })}
    </div>
  );
}

function makeExceptions(rows) {
  const exceptions = [];
  rows.forEach((row) => {
    if (row.actualRevenue > 0 && row.marginPointVariance < 0) {
      exceptions.push({
        ...row,
        id: `${row.sowId}-margin`,
        severity: Math.abs(row.marginPointVariance) >= 5 ? "Red" : "Amber",
        issue: "Margin below plan",
        impact: `${points(row.marginPointVariance)} / ${money(row.grossMarginVariance)}`
      });
    }
    if (row.costVariance > 0) {
      exceptions.push({
        ...row,
        id: `${row.sowId}-cost`,
        severity: Math.abs(row.costVariance) > 5000 ? "Red" : "Amber",
        issue: "Cost over plan",
        impact: money(row.costVariance)
      });
    }
    if (row.revenueVariance < 0) {
      exceptions.push({
        ...row,
        id: `${row.sowId}-revenue`,
        severity: Math.abs(row.revenueVariance) > 10000 ? "Red" : "Amber",
        issue: "Revenue shortfall",
        impact: money(row.revenueVariance)
      });
    }
  });
  return exceptions
    .sort((a, b) => (a.severity === "Red" ? -1 : 1) - (b.severity === "Red" ? -1 : 1))
    .slice(0, 12);
}

function detailConfig(activeDetail, context, navigate) {
  const { sowRows, clientRows, missingActuals, exceptions, selectedClient, selectedMix } = context;
  const openSow = (row) => row.sowId && navigate(`/sows/${row.sowId}`);
  const sowColumns = [
    { key: "sowNumber", label: "SOW" },
    { key: "clientName", label: "Client" },
    { key: "deliveryManagerName", label: "Owner" }
  ];
  const filteredSows = sowRows.filter((row) => {
    if (activeDetail === "clients" && selectedClient) return row.clientName === selectedClient.id;
    if (activeDetail === "mix" && selectedMix) return row.billingModel === selectedMix.id;
    return true;
  });

  if (activeDetail === "revenue") {
    return {
      title: "Revenue Attainment Drilldown",
      rows: filteredSows,
      onRowClick: openSow,
      columns: [
        ...sowColumns,
        { key: "plannedRevenue", label: "Planned Revenue", render: (row) => money(row.plannedRevenue) },
        { key: "actualRevenue", label: "Actual Revenue", render: (row) => money(row.actualRevenue) },
        { key: "revenueVariance", label: "Variance", render: (row) => money(row.revenueVariance) }
      ]
    };
  }
  if (activeDetail === "cost") {
    return {
      title: "Cost Burn Drilldown",
      rows: filteredSows,
      onRowClick: openSow,
      columns: [
        ...sowColumns,
        { key: "plannedCost", label: "Planned Cost", render: (row) => moneyPrecise(row.plannedCost) },
        { key: "actualCost", label: "Actual Cost", render: (row) => moneyPrecise(row.actualCost) },
        { key: "costVariance", label: "Variance", render: (row) => moneyPrecise(row.costVariance) }
      ]
    };
  }
  if (activeDetail === "margin") {
    return {
      title: "Margin Health Drilldown",
      rows: filteredSows,
      onRowClick: openSow,
      columns: [
        ...sowColumns,
        { key: "plannedMarginPercent", label: "Planned GM %", render: (row) => percent(row.plannedMarginPercent) },
        { key: "actualMarginPercent", label: "Actual GM %", render: (row) => percent(row.actualMarginPercent) },
        { key: "marginPointVariance", label: "Variance", render: (row) => points(row.marginPointVariance) },
        { key: "grossMarginVariance", label: "GM $ Variance", render: (row) => money(row.grossMarginVariance) }
      ]
    };
  }
  if (activeDetail === "actuals") {
    return {
      title: "Actuals Confidence Drilldown",
      rows: missingActuals,
      onRowClick: openSow,
      columns: [
        { key: "monthLabel", label: "Month" },
        { key: "sowNumber", label: "SOW" },
        { key: "clientName", label: "Client" },
        { key: "roleTitle", label: "Role" },
        { key: "plannedHours", label: "Planned Hrs" }
      ]
    };
  }
  if (activeDetail === "clients") {
    return {
      title: selectedClient ? `${selectedClient.id} Drilldown` : "Client Concentration Drilldown",
      rows: selectedClient ? filteredSows : clientRows,
      onRowClick: selectedClient ? openSow : undefined,
      columns: selectedClient
        ? [
          ...sowColumns,
          { key: "actualRevenue", label: "Actual Revenue", render: (row) => money(row.actualRevenue) },
          { key: "actualMarginPercent", label: "GM %", render: (row) => percent(row.actualMarginPercent) }
        ]
        : [
          { key: "id", label: "Client" },
          { key: "actualRevenue", label: "Actual Revenue", render: (row) => money(row.actualRevenue) },
          { key: "actualCost", label: "Actual Cost", render: (row) => money(row.actualCost) },
          { key: "actualMarginPercent", label: "GM %", render: (row) => percent(row.actualMarginPercent) }
        ]
    };
  }
  if (activeDetail === "mix") {
    return {
      title: selectedMix ? `${selectedMix.id} Portfolio Mix Drilldown` : "Portfolio Mix Drilldown",
      rows: filteredSows,
      onRowClick: openSow,
      columns: [
        ...sowColumns,
        { key: "billingModel", label: "Billing Model" },
        { key: "actualRevenue", label: "Actual Revenue", render: (row) => money(row.actualRevenue) },
        { key: "actualMarginPercent", label: "GM %", render: (row) => percent(row.actualMarginPercent) }
      ]
    };
  }
  return {
    title: "Financial Exception Queue",
    rows: exceptions,
    onRowClick: openSow,
    columns: [
      { key: "severity", label: "Severity", render: (row) => <span className={`status-chip status-${String(row.severity || "").toLowerCase()}`}>{row.severity}</span> },
      { key: "sowNumber", label: "SOW" },
      { key: "clientName", label: "Client" },
      { key: "deliveryManagerName", label: "Owner" },
      { key: "issue", label: "Issue" },
      { key: "impact", label: "Impact" }
    ]
  };
}

export function FinancialCockpitPage() {
  const navigate = useNavigate();
  const [activeDetail, setActiveDetail] = useState("exceptions");
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedMix, setSelectedMix] = useState(null);
  const [filters, setFilters] = useState({
    client: "All",
    deliveryManager: "All",
    billingModel: "All",
    monthFrom: "",
    monthTo: ""
  });
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "All") params.set(key, value);
    });
    return params.toString();
  }, [filters]);
  const { data, isLoading, error } = useQuery({
    queryKey: ["financials", queryString],
    queryFn: () => apiFetch(`/financials${queryString ? `?${queryString}` : ""}`)
  });

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function resetFilters() {
    setFilters({ client: "All", deliveryManager: "All", billingModel: "All", monthFrom: "", monthTo: "" });
    setActiveDetail("exceptions");
    setSelectedClient(null);
    setSelectedMix(null);
  }

  if (isLoading) return <div className="loading">Loading financial cockpit...</div>;
  if (error) return <div className="error-banner">{error.message}</div>;

  const kpis = data.kpis || {};
  const filtersData = data.filters || {};
  const tables = data.tables || {};
  const sowRows = tables.sowPerformance || [];
  const clientRows = data.charts?.revenueByClient || [];
  const exceptions = makeExceptions(sowRows);
  const detail = detailConfig(activeDetail, {
    sowRows,
    clientRows,
    missingActuals: tables.missingActuals || [],
    exceptions,
    selectedClient,
    selectedMix
  }, navigate);

  return (
    <div className="financial-cockpit-page refined">
      <section className="hero-panel financial-cockpit-hero refined">
        <div className="financial-cockpit-title">
          <p className="eyebrow">Financial Cockpit</p>
          <h2>Portfolio financial health: <span>{data.scope?.mode} view for {data.scope?.userName}. Graphics open the focused detail below.</span></h2>
        </div>
        <div className="financial-filter-panel">
          <div>
            <strong>Filters apply to entire cockpit</strong>
            <small>Cards, graphics, exceptions, and drilldowns use this scope.</small>
          </div>
          <div className="financial-filter-grid refined">
            <label><span>Period From</span><input type="month" value={filters.monthFrom} onChange={(event) => updateFilter("monthFrom", event.target.value)} /></label>
            <label><span>Period To</span><input type="month" value={filters.monthTo} onChange={(event) => updateFilter("monthTo", event.target.value)} /></label>
            <label><span>Client</span><select value={filters.client} onChange={(event) => updateFilter("client", event.target.value)}>{(filtersData.clients || ["All"]).map((option) => <option key={option}>{option}</option>)}</select></label>
            <label><span>Delivery Manager</span><select value={filters.deliveryManager} onChange={(event) => updateFilter("deliveryManager", event.target.value)}>{(filtersData.deliveryManagers || ["All"]).map((option) => <option key={option}>{option}</option>)}</select></label>
            <label><span>Billing Model</span><select value={filters.billingModel} onChange={(event) => updateFilter("billingModel", event.target.value)}>{(filtersData.billingModels || ["All"]).map((option) => <option key={option}>{option}</option>)}</select></label>
            <button className="secondary-button" type="button" onClick={resetFilters}>Clear</button>
          </div>
        </div>
      </section>

      <section className="financial-gauge-row" aria-label="Portfolio health gauges">
        {(kpis.gauges || []).map((gauge) => (
          <GaugeCard
            key={gauge.id}
            gauge={gauge}
            active={activeDetail === gauge.id}
            onClick={() => {
              setActiveDetail(gauge.id);
              setSelectedClient(null);
              setSelectedMix(null);
            }}
          />
        ))}
      </section>

      <section className="financial-signal-row" aria-label="Financial variance signals">
        <SignalCard id="revenue" active={activeDetail === "revenue"} title="Revenue Variance" value={money(kpis.revenueVariance)} note="Actual minus planned" status={kpis.revenueVariance >= 0 ? "green" : "amber"} onClick={setActiveDetail} />
        <SignalCard id="cost" active={activeDetail === "cost"} title="Cost Variance" value={moneyPrecise(kpis.costVariance)} note="Actual minus planned" status={kpis.costVariance <= 0 ? "green" : "red"} onClick={setActiveDetail} />
        <SignalCard id="margin" active={activeDetail === "margin"} title="GM $ Variance" value={money(kpis.grossMarginVariance)} note="Actual GM minus planned GM" status={kpis.grossMarginVariance >= 0 ? "green" : "red"} onClick={setActiveDetail} />
        <SignalCard id="margin" active={activeDetail === "margin"} title="Margin % Variance" value={points(kpis.marginPointVariance)} note="Actual margin minus planned margin" status={kpis.marginPointVariance >= 0 ? "green" : "red"} onClick={setActiveDetail} />
      </section>

      <div className="cockpit-grid financial-insight-grid">
        <Section title="Client Concentration">
          <ClientConcentration
            rows={clientRows}
            activeClient={selectedClient?.id}
            onClick={(row) => {
              setActiveDetail("clients");
              setSelectedClient(row);
              setSelectedMix(null);
            }}
          />
        </Section>
        <Section title="Portfolio Mix">
          <PortfolioMix
            rows={sowRows}
            activeMix={selectedMix?.id}
            onClick={(row) => {
              setActiveDetail("mix");
              setSelectedMix(row);
              setSelectedClient(null);
            }}
          />
        </Section>
        <Section title="Exception Queue">
          <div className="exception-preview">
            {exceptions.length ? exceptions.slice(0, 4).map((row) => (
              <button key={row.id} type="button" onClick={() => setActiveDetail("exceptions")}>
                <span className={`severity-dot severity-${String(row.severity).toLowerCase()}`} />
                <strong>{row.issue}</strong>
                <small>{row.sowNumber} / {row.impact}</small>
              </button>
            )) : <div className="empty-state">No red or amber financial exceptions for this scope.</div>}
          </div>
        </Section>
      </div>

      <Section title={detail.title} actions={<button className="secondary-button" type="button" onClick={() => setActiveDetail("exceptions")}>Show Exceptions</button>}>
        <DataTable columns={detail.columns} rows={detail.rows} onRowClick={detail.onRowClick} />
      </Section>
    </div>
  );
}
