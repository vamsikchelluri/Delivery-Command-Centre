import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { DataTable, Section, StatCard } from "../components.jsx";

export function OpportunityDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Engagement");
  const { data: opportunity, isLoading } = useQuery({
    queryKey: ["opportunity", id],
    queryFn: () => apiFetch(`/opportunities/${id}`)
  });

  if (isLoading) return <div className="loading">Loading opportunity...</div>;
  if (!opportunity) return <div className="error-banner">Unable to load opportunity.</div>;

  return (
    <div className="workspace detail-layout">
      <Link className="back-link" to="/opportunities">Back to Pipeline</Link>
      <section className="workspace-header">
        <div>
          <p className="eyebrow">{opportunity.number} / {opportunity.client?.name}</p>
          <h2>{opportunity.name}</h2>
          <p className="muted">AM: {opportunity.accountManagerName} / DM: {opportunity.deliveryManagerName}</p>
        </div>
        <div className="status-stack">
          <span className="pill accent">{opportunity.stage}</span>
          {opportunity.stage === "WON" ? (
            <button className="secondary-button" onClick={() => navigate(`/sows/new?sourceOpportunityId=${opportunity.id}`)} type="button">
              Create SOW
            </button>
          ) : null}
          <button onClick={() => navigate(`/opportunities/${opportunity.id}/edit`)} type="button">Edit</button>
        </div>
      </section>

      <div className="stats-grid compact-stats">
        <StatCard label="Estimated Revenue" value={`$${Number(opportunity.estimatedRevenue || 0).toLocaleString()}`} />
        <StatCard label="Role Revenue" value={`$${Number(opportunity.roleEstimatedRevenue || 0).toLocaleString()}`} />
        <StatCard label="Target Margin" value={`${opportunity.targetMargin ?? 0}%`} />
        <StatCard label="Weighted Value" value={`$${Number(opportunity.weightedValue || 0).toLocaleString()}`} />
      </div>

      <div className="tabs" role="tablist">
        {["Engagement", "Timeline & Financials", "Roles", "Notes"].map((tab) => (
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

      {activeTab === "Engagement" ? (
        <Section title="Engagement">
          <div className="info-grid">
            <div><span>Client Name</span><strong>{opportunity.client?.name || "-"}</strong></div>
            <div><span>Project / Opportunity Name</span><strong>{opportunity.name}</strong></div>
            <div><span>Source of Opportunity</span><strong>{opportunity.source || "-"}</strong></div>
            <div><span>Deal Type</span><strong>{opportunity.dealType || "-"}</strong></div>
            <div><span>Stage</span><strong>{opportunity.stage}</strong></div>
            <div><span>Probability</span><strong>{opportunity.probability}%</strong></div>
            <div><span>Account Manager</span><strong>{opportunity.accountManagerName}</strong></div>
            <div><span>Delivery Manager</span><strong>{opportunity.deliveryManagerName}</strong></div>
          </div>
        </Section>
      ) : null}

      {activeTab === "Timeline & Financials" ? (
        <div className="two-column">
          <Section title="Timeline and Financials">
            <div className="info-grid">
              <div><span>Estimated Revenue</span><strong>${Number(opportunity.estimatedRevenue || 0).toLocaleString()}</strong></div>
              <div><span>Target Margin %</span><strong>{opportunity.targetMargin ?? 0}%</strong></div>
              <div><span>Currency</span><strong>{opportunity.currency}</strong></div>
              <div><span>Expected Close</span><strong>{String(opportunity.expectedCloseDate || "").slice(0, 10) || "-"}</strong></div>
              <div><span>Expected Start</span><strong>{String(opportunity.expectedStartDate || "").slice(0, 10) || "-"}</strong></div>
              <div><span>Expected End</span><strong>{String(opportunity.expectedEndDate || "").slice(0, 10) || "-"}</strong></div>
              <div><span>Role Revenue</span><strong>${Number(opportunity.roleEstimatedRevenue || 0).toLocaleString()}</strong></div>
              <div><span>Weighted Value</span><strong>${Number(opportunity.weightedValue || 0).toLocaleString()}</strong></div>
            </div>
          </Section>

          <Section title="Conversion History">
            <DataTable
              columns={[
                { key: "number", label: "SOW" },
                { key: "name", label: "Name" },
                { key: "status", label: "Status" },
                { key: "contractValue", label: "Value", render: (row) => `$${Number(row.contractValue || 0).toLocaleString()}` }
              ]}
              rows={opportunity.conversionHistory || []}
            />
          </Section>
        </div>
      ) : null}

      {activeTab === "Roles" ? (
        <Section title="Opportunity Roles" actions={<button onClick={() => navigate(`/opportunities/${opportunity.id}/roles/new`)}>Add Role</button>}>
          <DataTable
            columns={[
              { key: "number", label: "Role Number" },
              { key: "title", label: "Role Title" },
              { key: "skill", label: "SAP Module" },
              { key: "subModule", label: "Sub-Module" },
              { key: "roleLocation", label: "Location" },
              { key: "experienceLevel", label: "Experience" },
              { key: "engagementType", label: "Type" },
              { key: "estimatedHours", label: "Est. Hours" },
              { key: "billRate", label: "Bill Rate", render: (row) => `$${Number(row.billRate || 0).toLocaleString()}` },
              { key: "targetMargin", label: "Target Margin %", render: (row) => `${row.targetMargin ?? 0}%` },
              { key: "loadedCostGuidance", label: "Loaded Cost", render: (row) => `$${Number(row.loadedCostGuidance || row.costGuidance || 0).toLocaleString()}` },
              { key: "baseCostGuidance", label: "Base Cost", render: (row) => `$${Number(row.baseCostGuidance || 0).toLocaleString()}` },
              { key: "resourceIdentificationStatus", label: "Readiness" },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <button className="tiny-button" type="button" onClick={() => navigate(`/opportunities/${opportunity.id}/roles/${row.id}/edit`)}>
                    Edit
                  </button>
                )
              }
            ]}
            rows={opportunity.roles || []}
          />
        </Section>
      ) : null}

      {activeTab === "Notes" ? (
        <div className="two-column">
          <Section title="Engagement Notes">
            <p className="muted">{opportunity.notes || "No summary notes captured yet."}</p>
            <div className="timeline-list">
              {(opportunity.notesHistory || []).length ? opportunity.notesHistory.map((item) => (
                <div key={item.id} className="timeline-entry">
                  <strong>{item.author}</strong>
                  <span>{item.timestamp?.slice(0, 16)?.replace("T", " ")}</span>
                  <p>{item.note}</p>
                </div>
              )) : <p className="muted">No dated notes yet.</p>}
            </div>
          </Section>

          <Section title="Audit Trail">
            <DataTable
              columns={[
                { key: "number", label: "Audit" },
                { key: "actionType", label: "Action" },
                { key: "actor", label: "Actor" },
                { key: "sourceScreen", label: "Source" },
                { key: "createdAt", label: "Time", render: (row) => row.createdAt?.slice(0, 16) || "-" }
              ]}
              rows={opportunity.auditTrail || []}
            />
          </Section>
        </div>
      ) : null}
    </div>
  );
}
