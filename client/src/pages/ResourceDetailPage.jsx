import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { DataTable, Section, StatCard } from "../components.jsx";

function formatDate(value) {
  return value ? String(value).slice(0, 10) : "-";
}

export function ResourceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Overview");
  const { data: resource, isLoading } = useQuery({
    queryKey: ["resource", id],
    queryFn: () => apiFetch(`/resources/${id}`)
  });

  if (isLoading) return <div className="loading">Loading resource...</div>;

  const deploymentRows = resource.deployments || [];
  const currentDeployedPercent = Number(resource.currentDeployedPercent || 0);
  const currentAvailablePercent = Number(resource.currentAvailablePercent || 0);
  const currentActiveSow = resource.currentActiveSowName || "None";
  const currentDeliveryStatus = resource.currentDeliveryStatusLabel || resource.currentDeliveryStatus || "Available";
  const costFormulaHint =
    resource.costCalculationMode === "Offshore Employee"
      ? "(CTC / FX / hours) * overhead"
      : resource.costCalculationMode === "Onsite Employee"
        ? "(Salary / hours) * overhead"
        : "Rate converted to USD if needed";

  return (
    <div className="workspace resource-detail-page">
      <Link className="back-link" to="/resources">Back to Resources</Link>
      <section className="workspace-header detail-header">
        <div className="detail-header-copy">
          <p className="eyebrow">{resource.number}</p>
          <h2>{resource.firstName} {resource.lastName}</h2>
          <div className="detail-meta-row">
            <span className="detail-meta-chip">{resource.primarySkill}</span>
            <span className="detail-meta-chip">{resource.primarySubModules?.length ? resource.primarySubModules.join(", ") : resource.subModule || "General"}</span>
            <span className="detail-meta-chip">{resource.location || "Location not set"}</span>
            <span className="detail-meta-chip">{resource.contactEmail || "No email"}</span>
            <span className="detail-meta-chip">{resource.contactNumber || "No phone"}</span>
          </div>
        </div>
        <div className="status-stack">
          <span className="pill">{resource.employmentStatusLabel || resource.employmentStatus}</span>
          <span className="pill accent">{currentDeliveryStatus}</span>
          <button onClick={() => navigate(`/resources/${resource.id}/edit`)} type="button">Edit</button>
        </div>
      </section>

      <div className="stats-grid detail-kpi-row">
        <StatCard label="Current Deployed %" value={`${currentDeployedPercent}%`} />
        <StatCard label="Current Available %" value={`${currentAvailablePercent}%`} />
        <StatCard label="Cost Rate" value={`$${resource.costRate}/hr`} />
        <StatCard label="Current Active SOW" value={currentActiveSow} />
      </div>

      <div className="tabs" role="tablist">
        {["Overview", "Identity and Skills", "Employment and Compensation", "Deployments", "Linked Opportunities", "Audit Trail"].map((tab) => (
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

      {activeTab === "Overview" ? (
        <div className="two-column detail-section-grid">
          <Section title="Current Deployment Snapshot">
            <div className="info-grid">
              <div><span>Current Delivery Status</span><strong>{currentDeliveryStatus}</strong></div>
              <div><span>Current Deployed %</span><strong>{currentDeployedPercent}%</strong></div>
              <div><span>Current Available %</span><strong>{currentAvailablePercent}%</strong></div>
              <div><span>Current Active SOW</span><strong>{currentActiveSow}</strong></div>
              <div><span>Availability Date</span><strong>{resource.availabilityDate?.slice(0, 10) || "-"}</strong></div>
              <div><span>Delivery Roll-Off</span><strong>{resource.deliveryRollOffDate?.slice(0, 10) || "-"}</strong></div>
            </div>
          </Section>
          <Section title="Recent Cost History">
            <DataTable
              columns={[
                { key: "effectiveDate", label: "Effective Date" },
                { key: "costRate", label: "Cost Rate", render: (row) => `$${row.costRate}` },
                { key: "reason", label: "Reason" }
              ]}
              rows={resource.costHistory}
            />
          </Section>
        </div>
      ) : null}

      {activeTab === "Identity and Skills" ? (
        <div className="two-column detail-section-grid">
          <Section title="Identity">
            <div className="info-grid">
              <div><span>Resource Number</span><strong>{resource.number}</strong></div>
              <div><span>Resource Name</span><strong>{resource.firstName} {resource.lastName}</strong></div>
              <div><span>Contact Email</span><strong>{resource.contactEmail || "-"}</strong></div>
              <div><span>Contact Number</span><strong>{resource.contactNumber || "-"}</strong></div>
            </div>
          </Section>
          <Section title="Skills">
            <div className="info-grid">
              <div><span>Primary Skill</span><strong>{resource.primarySkill}</strong></div>
              <div><span>Primary Sub-Modules</span><strong>{resource.primarySubModules?.length ? resource.primarySubModules.join(", ") : resource.subModule || "-"}</strong></div>
              <div><span>Secondary Skills</span><strong>{resource.secondarySkills?.length ? resource.secondarySkills.map((item) => `${item.skill}${item.subModule ? ` / ${item.subModule}` : ""}`).join(", ") : "-"}</strong></div>
              <div><span>Reporting Manager</span><strong>{resource.reportingManager || "-"}</strong></div>
            </div>
          </Section>
        </div>
      ) : null}

      {activeTab === "Employment and Compensation" ? (
        <div className="workspace detail-section-stack">
          <Section title="Employment">
            <div className="info-grid">
              <div><span>Location</span><strong>{resource.location || "-"}</strong></div>
              <div><span>Location Type</span><strong>{resource.locationType || "-"}</strong></div>
              <div><span>Employment Type</span><strong>{resource.employmentType || "-"}</strong></div>
              <div><span>Employment Status</span><strong>{resource.employmentStatus || "-"}</strong></div>
              <div><span>Joining Date</span><strong>{resource.joiningDate?.slice(0, 10) || "-"}</strong></div>
              <div><span>Notice Period</span><strong>{resource.noticePeriod || "-"}</strong></div>
              <div><span>Visa / Work Authorization</span><strong>{resource.visaWorkAuthorization || "-"}</strong></div>
              <div><span>Background Check</span><strong>{resource.backgroundCheck || "-"}</strong></div>
            </div>
          </Section>
          <Section title="Availability and Roll-off">
            <div className="info-grid">
              <div><span>Availability Date</span><strong>{resource.availabilityDate?.slice(0, 10) || "-"}</strong></div>
              <div><span>Delivery Roll-Off</span><strong>{resource.deliveryRollOffDate?.slice(0, 10) || "-"}</strong></div>
              <div><span>Not Available From</span><strong>{resource.notAvailableFrom?.slice(0, 10) || "-"}</strong></div>
              <div><span>Not Available To</span><strong>{resource.notAvailableTo?.slice(0, 10) || "-"}</strong></div>
              <div><span>Not Available Reason</span><strong>{resource.notAvailableReason || "-"}</strong></div>
            </div>
          </Section>
          <Section title="Compensation and Payment">
            <div className="info-grid">
              <div><span>Compensation Input Type</span><strong>{resource.compensationInputType || "-"}</strong></div>
              <div><span>Compensation Value</span><strong>{resource.compensationValue || 0}</strong></div>
              <div><span>Compensation Currency</span><strong>{resource.compensationCurrency || "-"}</strong></div>
              <div><span>Payment Terms</span><strong>{resource.paymentTerms || "-"}</strong></div>
              <div><span>Payment Currency</span><strong>{resource.paymentCurrency || "-"}</strong></div>
            </div>
          </Section>
          <Section title="Derived System Outputs">
            <div className="info-grid">
              <div><span>Current Delivery Status</span><strong>{currentDeliveryStatus}</strong></div>
              <div><span>Current Deployed %</span><strong>{currentDeployedPercent}%</strong></div>
              <div><span>Current Available %</span><strong>{currentAvailablePercent}%</strong></div>
              <div><span>Cost Calculation Mode</span><strong>{resource.costCalculationMode || "-"}</strong></div>
              <div><span>Derived Cost Rate</span><strong>${resource.costRate}/hr</strong></div>
              <div><span>FX Rate Used</span><strong>{resource.fxRateUsed || "-"} {resource.compensationCurrency || "USD"}/USD</strong></div>
              <div><span>Standard Hours Per Year</span><strong>1800</strong></div>
              <div><span>Overhead Multiplier</span><strong>1.2</strong></div>
              <div><span>Cost Formula Hint</span><strong>{costFormulaHint}</strong></div>
            </div>
          </Section>
        </div>
      ) : null}

      {activeTab === "Deployments" ? (
        <Section title="Deployment History">
          <DataTable
            columns={[
              { key: "number", label: "Deployment" },
              { key: "sow", label: "SOW", render: (row) => row.sow?.name || "-" },
              { key: "role", label: "Role", render: (row) => row.role?.title || "-" },
              { key: "startDate", label: "Start Date", render: (row) => formatDate(row.startDate) },
              { key: "endDate", label: "End Date", render: (row) => formatDate(row.endDate) },
              { key: "allocationPercent", label: "Allocation %" },
              { key: "currentState", label: "Current State" }
            ]}
            rows={deploymentRows}
          />
        </Section>
      ) : null}

      {activeTab === "Linked Opportunities" ? (
        <Section title="Linked Opportunities">
        <DataTable
          columns={[
            { key: "number", label: "Role" },
            { key: "opportunity", label: "Opportunity", render: (row) => row.opportunity?.name || "-" },
            { key: "title", label: "Role Title" },
            { key: "resourceIdentificationStatus", label: "Status" }
          ]}
          rows={resource.linkedOpportunities}
        />
      </Section>
      ) : null}

      {activeTab === "Audit Trail" ? (
        <Section title="Audit Trail">
          <DataTable
            columns={[
              { key: "number", label: "Audit" },
              { key: "actionType", label: "Action" },
              { key: "actor", label: "Actor" },
              { key: "sourceScreen", label: "Source" },
              { key: "createdAt", label: "Time", render: (row) => row.createdAt?.slice(0, 16) || "-" }
            ]}
            rows={resource.auditTrail}
          />
        </Section>
      ) : null}
    </div>
  );
}
