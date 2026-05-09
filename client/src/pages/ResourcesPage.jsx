import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { can, canViewResourceCost, currentUser } from "../lib/permissions";
import { DataTable, PageHeaderCard, Section, StatCard } from "../components.jsx";

export function ResourcesPage() {
  const navigate = useNavigate();
  const user = currentUser();
  const canViewCost = canViewResourceCost(user);
  const canCreate = can(user, "resources", "create");
  const canEdit = can(user, "resources", "edit");
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("All Locations");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [clientFilter, setClientFilter] = useState("All Clients");
  const [pmFilter, setPmFilter] = useState("All PMs");
  const [dmFilter, setDmFilter] = useState("All DMs");
  const { data = [], isLoading } = useQuery({
    queryKey: ["resources"],
    queryFn: () => apiFetch("/resources")
  });

  const locationOptions = ["All Locations", ...new Set(data.map((item) => item.location || "Unassigned"))];
  const statusOptions = ["All Status", ...new Set(data.map((item) => item.currentDeliveryStatusLabel || item.deliveryStatus || "Unknown"))];
  const clientOptions = ["All Clients", ...new Set(data.map((item) => item.currentClientName || "Unassigned"))];
  const pmOptions = ["All PMs", ...new Set(data.map((item) => item.currentProjectManagerName || "Unassigned"))];
  const dmOptions = ["All DMs", ...new Set(data.map((item) => item.currentDeliveryManagerName || "Unassigned"))];
  const filtered = data.filter((row) => {
    const text = `${row.firstName} ${row.lastName} ${row.primarySkill} ${row.subModule || ""} ${(row.primarySubModules || []).join(" ")}`.toLowerCase();
    const matchesSearch = !search || text.includes(search.toLowerCase());
    const matchesLocation = locationFilter === "All Locations" || (row.location || "Unassigned") === locationFilter;
    const matchesStatus = statusFilter === "All Status" || (row.currentDeliveryStatusLabel || row.deliveryStatus || "Unknown") === statusFilter;
    const matchesClient = clientFilter === "All Clients" || (row.currentClientName || "Unassigned") === clientFilter;
    const matchesPm = pmFilter === "All PMs" || (row.currentProjectManagerName || "Unassigned") === pmFilter;
    const matchesDm = dmFilter === "All DMs" || (row.currentDeliveryManagerName || "Unassigned") === dmFilter;
    return matchesSearch && matchesLocation && matchesStatus && matchesClient && matchesPm && matchesDm;
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
          canCreate ? <button onClick={() => navigate("/resources/new")}>Add Resource</button> : null
        }
      />
      <div className="financial-filter-panel resource-filter-panel">
        <div>
          <strong>Filters apply to resource register</strong>
          <small>Client, PM, and DM use the current active SOW assignment.</small>
        </div>
        <div className="financial-filter-grid resource-filter-grid refined">
          <label><span>Search</span><input placeholder="Name, skill..." value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <label><span>Location</span><select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}>{locationOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
          <label><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>{statusOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
          <label><span>Client</span><select value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}>{clientOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
          <label><span>Project Manager</span><select value={pmFilter} onChange={(event) => setPmFilter(event.target.value)}>{pmOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
          <label><span>Delivery Manager</span><select value={dmFilter} onChange={(event) => setDmFilter(event.target.value)}>{dmOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
        </div>
      </div>
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
                    {canEdit ? (
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
                    ) : null}
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
