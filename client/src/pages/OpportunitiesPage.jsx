import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { DataTable, PageHeaderCard, Section, StatCard } from "../components.jsx";

export function OpportunitiesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("All Stages");
  const [sourceFilter, setSourceFilter] = useState("All Sources");
  const [dmFilter, setDmFilter] = useState("All DMs");
  const { data = [], isLoading } = useQuery({
    queryKey: ["opportunities"],
    queryFn: () => apiFetch("/opportunities")
  });

  const stageOptions = ["All Stages", ...new Set(data.map((item) => item.stage || "Unknown"))];
  const sourceOptions = ["All Sources", ...new Set(data.map((item) => item.source || "Unknown"))];
  const dmOptions = ["All DMs", ...new Set(data.map((item) => item.deliveryManagerName || "Unknown"))];
  const filtered = data.filter((row) => {
    const text = `${row.name} ${row.client?.name || ""} ${row.source || ""}`.toLowerCase();
    const matchesSearch = !search || text.includes(search.toLowerCase());
    const matchesStage = stageFilter === "All Stages" || (row.stage || "Unknown") === stageFilter;
    const matchesSource = sourceFilter === "All Sources" || (row.source || "Unknown") === sourceFilter;
    const matchesDm = dmFilter === "All DMs" || (row.deliveryManagerName || "Unknown") === dmFilter;
    return matchesSearch && matchesStage && matchesSource && matchesDm;
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
          <div className="register-header-actions">
            <div className="register-filter-bar">
              <input placeholder="Search client, project..." value={search} onChange={(event) => setSearch(event.target.value)} />
              <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}>
                {stageOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
              <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
                {sourceOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
              <select value={dmFilter} onChange={(event) => setDmFilter(event.target.value)}>
                {dmOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </div>
            <button onClick={() => navigate("/opportunities/new")}>Add Opportunity</button>
          </div>
        }
      />
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
