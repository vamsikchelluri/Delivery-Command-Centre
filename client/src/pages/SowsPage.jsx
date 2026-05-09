import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { can, currentUser } from "../lib/permissions";
import { DataTable, PageHeaderCard, Section, StatCard } from "../components.jsx";

export function SowsPage() {
  const navigate = useNavigate();
  const user = currentUser();
  const canCreate = can(user, "sows", "create");
  const canEdit = can(user, "sows", "edit");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [billingFilter, setBillingFilter] = useState("All Billing");
  const [dmFilter, setDmFilter] = useState("All DMs");
  const { data = [], isLoading } = useQuery({
    queryKey: ["sows"],
    queryFn: () => apiFetch("/sows")
  });

  const statusOptions = ["All Status", ...new Set(data.map((item) => item.status || "Unknown"))];
  const billingOptions = ["All Billing", ...new Set(data.map((item) => item.billingModel || "Unknown"))];
  const dmOptions = ["All DMs", ...new Set(data.map((item) => item.deliveryManagerName || "Unknown"))];
  const filtered = data.filter((row) => {
    const text = `${row.name} ${row.account?.name || ""} ${row.billingModel || ""}`.toLowerCase();
    const matchesSearch = !search || text.includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All Status" || (row.status || "Unknown") === statusFilter;
    const matchesBilling = billingFilter === "All Billing" || (row.billingModel || "Unknown") === billingFilter;
    const matchesDm = dmFilter === "All DMs" || (row.deliveryManagerName || "Unknown") === dmFilter;
    return matchesSearch && matchesStatus && matchesBilling && matchesDm;
  });
  const activeCount = filtered.filter((item) => item.status === "ACTIVE").length;
  const contractValue = filtered.reduce((sum, item) => sum + Number(item.contractValue || 0), 0);
  const tmCount = filtered.filter((item) => item.billingModel === "TM_HOURLY").length;
  const fixedBidCount = filtered.filter((item) => item.billingModel === "FIXED_BID").length;

  return (
    <div className="workspace">
      <PageHeaderCard
        eyebrow="SOW"
        title="SOW Management"
        subtitle="Track active engagements, client ownership, commercial visibility, and delivery health."
        actions={
          <div className="register-header-actions">
            <div className="register-filter-bar">
              <input placeholder="Search client, engagement..." value={search} onChange={(event) => setSearch(event.target.value)} />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {statusOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
              <select value={billingFilter} onChange={(event) => setBillingFilter(event.target.value)}>
                {billingOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
              <select value={dmFilter} onChange={(event) => setDmFilter(event.target.value)}>
                {dmOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </div>
            {canCreate ? <button onClick={() => navigate("/sows/new")}>Add SOW</button> : null}
          </div>
        }
      />
      <div className="stats-grid register-kpi-row">
        <StatCard label="Active SOWs" value={activeCount} />
        <StatCard label="Contract Value" value={`$${contractValue.toLocaleString()}`} />
        <StatCard label="T&M SOWs" value={tmCount} />
        <StatCard label="Fixed Bid SOWs" value={fixedBidCount} />
      </div>
      <Section title="SOW Register">
        {isLoading ? (
          <div className="loading">Loading SOWs...</div>
        ) : (
          <DataTable
            columns={[
              { key: "number", label: "SOW Number" },
              { key: "client", label: "Client Name", render: (row) => row.account?.name || "-" },
              { key: "name", label: "Engagement" },
              { key: "billingModel", label: "Billing Model" },
              { key: "status", label: "Status" },
              { key: "projectHealth", label: "Health" },
              { key: "contractValue", label: "Contract Value", render: (row) => `$${row.contractValue.toLocaleString()}` },
              { key: "deliveryManagerName", label: "DM" },
              { key: "projectManagerName", label: "PM" },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <div className="row-actions">
                    <button
                      className="tiny-button secondary"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/sows/${row.id}`);
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
                          navigate(`/sows/${row.id}/edit`);
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
            onRowClick={(row) => navigate(`/sows/${row.id}`)}
          />
        )}
      </Section>
    </div>
  );
}
