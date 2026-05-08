import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import { DataTable, PageHeaderCard, Section, StatCard } from "../components.jsx";

function formatDate(value) {
  return value ? String(value).slice(0, 10) : "-";
}

function csvValue(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadCsv(rows, reportType = "open") {
  const openPositionColumns = [
    ["sourceType", "Demand Source"],
    ["clientName", "Client"],
    ["sourceNumber", "Opportunity / SOW Number"],
    ["sourceName", "Opportunity / SOW Name"],
    ["stageOrStatus", "Stage / Status"],
    ["probability", "Probability %"],
    ["expectedStartDate", "Expected Start Date"],
    ["expectedEndDate", "Expected End Date"],
    ["roleTitle", "Role Title"],
    ["skill", "SAP Module"],
    ["locationRequirement", "Location Requirement"],
    ["requiredAllocationPercent", "Required Allocation %"],
    ["requiredHours", "Required Hours"],
    ["requiredCount", "Required Count"],
    ["assignedCount", "Assigned Count"],
    ["openCount", "Open Count"],
    ["matchingResourceCount", "Matching Active Resources"],
    ["bestCandidate", "Best Candidate"],
    ["candidateAvailablePercent", "Candidate Available %"],
    ["candidateRollOffDate", "Candidate Roll-off Date"],
    ["planningStatus", "Planning Status"],
    ["riskNotes", "Risk Notes"]
  ];
  const activeDeploymentColumns = [
    ["clientName", "Client"],
    ["sowNumber", "SOW"],
    ["sowName", "SOW Name"],
    ["roleTitle", "Role"],
    ["skill", "SAP Module"],
    ["locationRequirement", "Location"],
    ["resourceName", "Resource"],
    ["allocationPercent", "Allocation %"],
    ["startDate", "Start Date"],
    ["endDate", "End Date"],
    ["rollOffDate", "Roll-off Date"]
  ];
  const columns = reportType === "active" ? activeDeploymentColumns : openPositionColumns;
  const lines = [
    columns.map(([, label]) => csvValue(label)).join(","),
    ...rows.map((row) => columns.map(([key]) => {
      if (key.includes("Date")) return csvValue(formatDate(row[key]));
      return csvValue(row[key]);
    }).join(","))
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = reportType === "active"
    ? "resource-planning-active-deployments.csv"
    : "resource-planning-open-position-report.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ResourcePlanningPage() {
  const [activeTab, setActiveTab] = useState("Open Positions");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [sourceFilter, setSourceFilter] = useState("All Sources");
  const [skillFilter, setSkillFilter] = useState("All SAP Modules");
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["resource-planning"],
    queryFn: () => apiFetch("/resource-planning")
  });

  const rows = data?.rows || [];
  const activeDeployments = data?.activeDeployments || [];
  const kpis = data?.kpis || {};
  const statusOptions = ["All Statuses", ...new Set(rows.map((row) => row.planningStatus || "Unknown"))];
  const sourceOptions = ["All Sources", ...new Set(rows.map((row) => row.sourceType || "Unknown"))];
  const skillOptions = ["All SAP Modules", ...new Set(rows.map((row) => row.skill || "Unknown"))];
  const filteredRows = useMemo(() => rows.filter((row) => {
    const text = `${row.clientName} ${row.sourceNumber} ${row.sourceName} ${row.roleTitle} ${row.skill} ${row.bestCandidate}`.toLowerCase();
    return (
      (!search || text.includes(search.toLowerCase())) &&
      (statusFilter === "All Statuses" || row.planningStatus === statusFilter) &&
      (sourceFilter === "All Sources" || row.sourceType === sourceFilter) &&
      (skillFilter === "All SAP Modules" || row.skill === skillFilter)
    );
  }), [rows, search, statusFilter, sourceFilter, skillFilter]);

  return (
    <div className="workspace">
      <PageHeaderCard
        eyebrow="Resource Planning"
        title="Open Position Report"
        subtitle="Read-only demand and supply view for high-probability pipeline, won demand, open SOW roles, and upcoming resource availability."
        actions={<button type="button" onClick={() => downloadCsv(activeTab === "Open Positions" ? filteredRows : activeDeployments, activeTab === "Open Positions" ? "open" : "active")} disabled={activeTab === "Open Positions" ? !filteredRows.length : !activeDeployments.length}>Download CSV</button>}
      />

      <div className="stats-grid register-kpi-row">
        <StatCard label="Total Demand Roles" value={kpis.totalDemandRoles || 0} />
        <StatCard label="Open Positions" value={kpis.openPositions || 0} />
        <StatCard label="Confirmed Open" value={kpis.confirmedOpenPositions || 0} />
        <StatCard label="At Risk" value={kpis.atRiskPositions || 0} />
        <StatCard label="Roll-off 30 Days" value={kpis.rollOff30 || 0} />
      </div>

      <div className="tabs" role="tablist">
        {["Open Positions", "Active Resource Deployment"].map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? "tab active" : "tab"}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Open Positions" ? (
      <Section title="Open Positions Report">
        <div className="register-filter-bar planning-filter-bar">
          <input placeholder="Search client, role, module, candidate..." value={search} onChange={(event) => setSearch(event.target.value)} />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            {statusOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
            {sourceOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
          <select value={skillFilter} onChange={(event) => setSkillFilter(event.target.value)}>
            {skillOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
        </div>
        {isLoading ? (
          <div className="loading">Loading resource planning report...</div>
        ) : (
          <DataTable
            columns={[
              { key: "sourceType", label: "Demand Source" },
              { key: "clientName", label: "Client" },
              { key: "sourceNumber", label: "Opp / SOW" },
              { key: "sourceName", label: "Name" },
              { key: "stageOrStatus", label: "Stage / Status" },
              { key: "probability", label: "Probability %" },
              { key: "expectedStartDate", label: "Start", render: (row) => formatDate(row.expectedStartDate) },
              { key: "roleTitle", label: "Role" },
              { key: "skill", label: "SAP Module" },
              { key: "locationRequirement", label: "Location" },
              { key: "requiredAllocationPercent", label: "Req Allocation %" },
              { key: "openCount", label: "Open Count" },
              { key: "matchingResourceCount", label: "Matches" },
              { key: "bestCandidate", label: "Best Candidate" },
              { key: "candidateAvailablePercent", label: "Candidate Available %" },
              { key: "candidateRollOffDate", label: "Roll-off", render: (row) => formatDate(row.candidateRollOffDate) },
              { key: "planningStatus", label: "Planning Status" },
              { key: "riskNotes", label: "Risk Notes" }
            ]}
            rows={filteredRows}
          />
        )}
      </Section>
      ) : null}

      {activeTab === "Active Resource Deployment" ? (
        <Section title="Active Resource Deployment by SOW">
          {isLoading ? (
            <div className="loading">Loading active deployments...</div>
          ) : (
            <DataTable
              columns={[
                { key: "clientName", label: "Client" },
                { key: "sowNumber", label: "SOW" },
                { key: "sowName", label: "SOW Name" },
                { key: "roleTitle", label: "Role" },
                { key: "skill", label: "SAP Module" },
                { key: "locationRequirement", label: "Location" },
                { key: "resourceName", label: "Resource" },
                { key: "allocationPercent", label: "Allocation %" },
                { key: "startDate", label: "Start", render: (row) => formatDate(row.startDate) },
                { key: "endDate", label: "End", render: (row) => formatDate(row.endDate) },
                { key: "rollOffDate", label: "Roll-off", render: (row) => formatDate(row.rollOffDate) }
              ]}
              rows={activeDeployments}
            />
          )}
        </Section>
      ) : null}
    </div>
  );
}
