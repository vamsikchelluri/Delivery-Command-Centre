import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { canViewResourceCost, currentUser } from "../lib/permissions";
import { DataTable, PageHeaderCard, Section, StatCard } from "../components.jsx";

export function ResourcesPage() {
  const navigate = useNavigate();
  const user = currentUser();
  const canViewCost = canViewResourceCost(user);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("All Locations");
  const [typeFilter, setTypeFilter] = useState("All Engagement Types");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const { data = [], isLoading } = useQuery({
    queryKey: ["resources"],
    queryFn: () => apiFetch("/resources")
  });

  const locationOptions = ["All Locations", ...new Set(data.map((item) => item.location || "Unassigned"))];
  const typeOptions = ["All Engagement Types", ...new Set(data.map((item) => item.employmentType || "Unknown"))];
  const statusOptions = ["All Status", ...new Set(data.map((item) => item.currentDeliveryStatusLabel || item.deliveryStatus || "Unknown"))];
  const filtered = data.filter((row) => {
    const text = `${row.firstName} ${row.lastName} ${row.primarySkill} ${row.subModule || ""} ${(row.primarySubModules || []).join(" ")}`.toLowerCase();
    const matchesSearch = !search || text.includes(search.toLowerCase());
    const matchesLocation = locationFilter === "All Locations" || (row.location || "Unassigned") === locationFilter;
    const matchesType = typeFilter === "All Engagement Types" || (row.employmentType || "Unknown") === typeFilter;
    const matchesStatus = statusFilter === "All Status" || (row.currentDeliveryStatusLabel || row.deliveryStatus || "Unknown") === statusFilter;
    return matchesSearch && matchesLocation && matchesType && matchesStatus;
  });
  const totalCount = filtered.length;
  const statusCounts = {
    fully: filtered.filter((item) => item.currentDeliveryStatus === "FULLY_DEPLOYED").length,
    partial: filtered.filter((item) => item.currentDeliveryStatus === "PARTIALLY_DEPLOYED").length,
    available: filtered.filter((item) => item.currentDeliveryStatus === "AVAILABLE").length,
    onLeave: filtered.filter((item) => item.currentDeliveryStatus === "ON_LEAVE").length
  };

  return (
    <div className="workspace">
      <PageHeaderCard
        eyebrow="Resource Master"
        title="Resource Management"
        subtitle="Resource profiles, skills, capacity, and deployment history."
        actions={
          <div className="register-header-actions">
            <div className="register-filter-bar">
              <input placeholder="Search name, skill..." value={search} onChange={(event) => setSearch(event.target.value)} />
              <select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}>
                {locationOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                {typeOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {statusOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </div>
            <button onClick={() => navigate("/resources/new")}>Add Resource</button>
          </div>
        }
      />
      <div className="stats-grid register-kpi-row">
        <StatCard label="Total" value={totalCount} />
        <StatCard label="Fully Deployed" value={statusCounts.fully} />
        <StatCard label="Partially Deployed" value={statusCounts.partial} />
        <StatCard label="Available" value={statusCounts.available} />
        <StatCard label="On Leave" value={statusCounts.onLeave} />
      </div>
      <Section title="Resource Register">
        {isLoading ? (
          <div className="loading">Loading resources...</div>
        ) : (
          <DataTable
            columns={[
              { key: "number", label: "Resource ID" },
              {
                key: "name",
                label: "Resource Name",
                render: (row) => `${row.firstName} ${row.lastName}`
              },
              { key: "primarySkill", label: "Primary Skill" },
              { key: "primarySubModules", label: "Sub-Modules", render: (row) => row.primarySubModules?.length ? row.primarySubModules.join(", ") : row.subModule || "-" },
              { key: "currentDeliveryStatusLabel", label: "Current Status" },
              { key: "currentDeployedPercent", label: "Current Allocation %" },
              ...(canViewCost ? [{ key: "costRate", label: "Estimated Cost Rate", render: (row) => `$${row.costRate}` }] : []),
              { key: "currentActiveSowName", label: "Current SOW" },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <div className="row-actions">
                    <button
                      className="tiny-button secondary"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/resources/${row.id}`);
                      }}
                      type="button"
                    >
                      View
                    </button>
                    <button
                      className="tiny-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/resources/${row.id}/edit`);
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
            onRowClick={(row) => navigate(`/resources/${row.id}`)}
          />
        )}
      </Section>
    </div>
  );
}
