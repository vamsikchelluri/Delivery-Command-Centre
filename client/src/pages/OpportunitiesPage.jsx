import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { can, currentUser } from "../lib/permissions";
import { DataTable, PageHeaderCard, Section, StatCard } from "../components.jsx";

export function OpportunitiesPage() {
  const navigate = useNavigate();
  const user = currentUser();
  const canCreate = can(user, "opportunities", "create");
  const canEdit = can(user, "opportunities", "edit");
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("All Clients");
  const [stageFilter, setStageFilter] = useState("All Stages");
  const [sourceFilter, setSourceFilter] = useState("All Sources");
  const [amFilter, setAmFilter] = useState("All AMs");
  const [dmFilter, setDmFilter] = useState("All DMs");
  const { data = [], isLoading } = useQuery({
    queryKey: ["opportunities"],
    queryFn: () => apiFetch("/opportunities")
  });

  const clientOptions = ["All Clients", ...new Set(data.map((item) => item.client?.name || "Unassigned"))];
  const stageOptions = ["All Stages", ...new Set(data.map((item) => item.stage || "Unknown"))];
  const sourceOptions = ["All Sources", ...new Set(data.map((item) => item.source || "Unknown"))];
  const amOptions = ["All AMs", ...new Set(data.map((item) => item.accountManagerName || "Unassigned"))];
  const dmOptions = ["All DMs", ...new Set(data.map((item) => item.deliveryManagerName || "Unknown"))];
  const filtered = data.filter((row) => {
    const text = `${row.name} ${row.client?.name || ""} ${row.source || ""}`.toLowerCase();
    const matchesSearch = !search || text.includes(search.toLowerCase());
    const matchesClient = clientFilter === "All Clients" || (row.client?.name || "Unassigned") === clientFilter;
    const matchesStage = stageFilter === "All Stages" || (row.stage || "Unknown") === stageFilter;
    const matchesSource = sourceFilter === "All Sources" || (row.source || "Unknown") === sourceFilter;
    const matchesAm = amFilter === "All AMs" || (row.accountManagerName || "Unassigned") === amFilter;
    const matchesDm = dmFilter === "All DMs" || (row.deliveryManagerName || "Unknown") === dmFilter;
    return matchesSearch && matchesClient && matchesStage && matchesSource && matchesAm && matchesDm;
  });
  const totalOpen = filtered.filter((item) => !["WON", "LOST"].includes(item.stage)).length;
  const nonLost = filtered.filter((item) => item.stage !== "LOST");
  const weightedPipeline = nonLost.reduce((sum, item) => sum + Number(item.weightedValue || 0), 0);
  const estimatedRevenue = nonLost.reduce((sum, item) => sum + Number(item.estimatedRevenue || 0), 0);
  const avgMargin = filtered.length ? (filtered.reduce((sum, item) => sum + Number(item.targetMargin || 0), 0) / filtered.length).toFixed(1) : "0.0";

  return (
    <div className="workspace">
      <PageHeaderCard
        eyebrow="Pipeline"
        title="Pipeline Management"
        subtitle="Track client opportunities, engagement ownership, target margin, and weighted pipeline."
        actions={
          canCreate ? <button onClick={() => navigate("/opportunities/new")}>Add Opportunity</button> : null
        }
      />
      <div className="financial-filter-panel resource-filter-panel">
        <div>
          <strong>Filters apply to opportunity register</strong>
          <small>Client, AM, and DM narrow the pipeline list and KPI totals below.</small>
        </div>
        <div className="financial-filter-grid resource-filter-grid refined">
          <label><span>Search</span><input placeholder="Client, opportunity..." value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <label><span>Client</span><select value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}>{clientOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
          <label><span>Stage</span><select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}>{stageOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
          <label><span>Source</span><select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>{sourceOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
          <label><span>Account Manager</span><select value={amFilter} onChange={(event) => setAmFilter(event.target.value)}>{amOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
          <label><span>Delivery Manager</span><select value={dmFilter} onChange={(event) => setDmFilter(event.target.value)}>{dmOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
        </div>
      </div>
      <div className="stats-grid register-kpi-row">
        <StatCard label="Open Opportunities" value={totalOpen} />
        <StatCard label="Weighted Pipeline" value={`$${weightedPipeline.toLocaleString()}`} />
        <StatCard label="Estimated Revenue" value={`$${estimatedRevenue.toLocaleString()}`} />
        <StatCard label="Avg Target Margin" value={`${avgMargin}%`} />
      </div>
      <Section title="Opportunity Register">
        {isLoading ? (
          <div className="loading">Loading opportunities...</div>
        ) : (
          <DataTable
            columns={[
              { key: "number", label: "Opportunity Number" },
              { key: "client", label: "Client Name", render: (row) => row.client?.name || "-" },
              { key: "name", label: "Project / Opportunity Name" },
              { key: "source", label: "Source" },
              { key: "stage", label: "Stage" },
              { key: "probability", label: "Probability %" },
              { key: "estimatedRevenue", label: "Estimated Revenue", render: (row) => `$${row.estimatedRevenue.toLocaleString()}` },
              { key: "targetMargin", label: "Target Margin %", render: (row) => `${row.targetMargin ?? 0}%` },
              { key: "roleEstimatedRevenue", label: "Role Revenue", render: (row) => `$${row.roleEstimatedRevenue.toLocaleString()}` },
              { key: "weightedValue", label: "Weighted Value", render: (row) => `$${row.weightedValue.toLocaleString()}` },
              { key: "accountManagerName", label: "AM" },
              { key: "deliveryManagerName", label: "DM" },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <div className="row-actions">
                    <button
                      className="tiny-button secondary"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/opportunities/${row.id}`);
                      }}
                      type="button"
                    >
                      View
                    </button>
                    {canEdit ? (
                      <button
                        className="tiny-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/opportunities/${row.id}/edit`);
                        }}
                        type="button"
                      >
                        Edit
                      </button>
                    ) : null}
                  </div>
                )
              }
            ]}
            rows={filtered}
            onRowClick={(row) => navigate(`/opportunities/${row.id}`)}
          />
        )}
      </Section>
    </div>
  );
}
