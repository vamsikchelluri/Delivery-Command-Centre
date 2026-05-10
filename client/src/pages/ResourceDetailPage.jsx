import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { canEditResourceCost, canViewResourceCost, currentUser } from "../lib/permissions";
import { DEFAULT_OVERHEAD_RULES, findOverheadRule } from "../lib/overheadRules";
import { DataTable, Section, StatCard } from "../components.jsx";

function formatDate(value) {
  return value ? String(value).slice(0, 10) : "-";
}

function overheadRuleLabel(rule, engagementType, locationType) {
  const percent = Number(rule?.overheadPercent || 0);
  const hourlyAddOn = Number(rule?.hourlyAddOn || 0);
  return `${engagementType || "Default"} / ${locationType || "Default"}: ${percent}% + $${hourlyAddOn}/hr`;
}

export function ResourceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Overview");
  const { data: resource, isLoading } = useQuery({
    queryKey: ["resource", id],
    queryFn: () => apiFetch(`/resources/${id}`)
  });
  const { data: overheadRules = DEFAULT_OVERHEAD_RULES } = useQuery({
    queryKey: ["admin", "overhead-rules"],
    queryFn: () => apiFetch("/admin/overhead-rules")
  });

  if (isLoading) return <div className="loading">Loading resource...</div>;

  const deploymentRows = resource.deployments || [];
  const user = currentUser();
  const canViewCost = canViewResourceCost(user);
  const canEditCost = canEditResourceCost(user);
  const currentDeployedPercent = Number(resource.currentDeployedPercent || 0);
  const currentAvailablePercent = Number(resource.currentAvailablePercent || 0);
  const currentActiveSow = resource.currentActiveSowName || "None";
  const currentDeliveryStatus = resource.currentDeliveryStatusLabel || resource.currentDeliveryStatus || "Available";
  const configuredOverheadRule = findOverheadRule(overheadRules, resource.employmentType, resource.locationType);
  const configuredOverheadLabel = overheadRuleLabel(configuredOverheadRule, resource.employmentType, resource.locationType);
  const costFormulaHint =
    resource.costCalculationMode === "Offshore Employee"
      ? "(CTC / FX / hours) + configured overhead"
      : resource.costCalculationMode === "Onsite Employee"
        ? "(Salary / hours) + configured overhead"
        : resource.costCalculationMode === "Manual estimated cost rate"
          ? "Direct hourly cost rate"
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
          </div>
        </div>
        <div className="status-stack">
          <span className="pill">{resource.employmentStatus === "ACTIVE" ? "Active" : resource.currentDeliveryStatusLabel || "Unavailable"}</span>
          <span className="pill accent">{currentDeliveryStatus}</span>
          <button onClick={() => navigate(`/resources/${resource.id}/edit`)} type="button">Edit</button>
        </div>
      </section>

      <div className="stats-grid detail-kpi-row">
        <StatCard label="Current Allocation %" value={`${currentDeployedPercent}%`} />
        <StatCard label="Remaining Capacity %" value={`${currentAvailablePercent}%`} />
        {canViewCost ? <StatCard label="Estimated Cost Rate" value={`$${resource.costRate}/hr`} /> : null}
        <StatCard label="Current Active SOW" value={currentActiveSow} />
      </div>

      <div className="tabs" role="tablist">
        {["Overview", "Resource Profile", "Resource Planning and Costing", "Deployments", "Linked Opportunities"].map((tab) => (
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
              <div><span>Current Allocation %</span><strong>{currentDeployedPercent}%</strong></div>
              <div><span>Remaining Capacity %</span><strong>{currentAvailablePercent}%</strong></div>
              <div><span>Current Active SOW</span><strong>{currentActiveSow}</strong></div>
              <div><span>Availability Date</span><strong>{resource.availabilityDate?.slice(0, 10) || "-"}</strong></div>
              <div><span>Current Engagement Roll-Off</span><strong>{resource.deliveryRollOffDate?.slice(0, 10) || "-"}</strong></div>
            </div>
          </Section>
          {canViewCost ? <Section title="Recent Cost History">
            <DataTable
              columns={[
                { key: "effectiveDate", label: "Effective Date" },
                { key: "costRate", label: "Estimated Cost Rate", render: (row) => `$${row.costRate}` },
                { key: "reason", label: "Reason" }
              ]}
              rows={resource.costHistory}
            />
          </Section> : null}
        </div>
      ) : null}

      {activeTab === "Resource Profile" ? (
        <div className="two-column detail-section-grid">
          <Section title="Resource Profile">
            <div className="info-grid">
              <div><span>Resource Number</span><strong>{resource.number}</strong></div>
              <div><span>Resource Name</span><strong>{resource.firstName} {resource.lastName}</strong></div>
              <div><span>Contact Email</span><strong>{resource.contactEmail || "-"}</strong></div>
              <div><span>Contact Number</span><strong>{resource.contactNumber || "-"}</strong></div>
              <div><span>Location</span><strong>{resource.location || "-"}</strong></div>
              <div><span>Location Type</span><strong>{resource.locationType || "-"}</strong></div>
              <div><span>Engagement Type</span><strong>{resource.employmentType || "-"}</strong></div>
              <div><span>Engagement Status</span><strong>{resource.employmentStatus === "ACTIVE" ? "Active" : resource.currentDeliveryStatusLabel || "Unavailable"}</strong></div>
              <div><span>Reporting Manager</span><strong>{resource.reportingManager || "-"}</strong></div>
            </div>
          </Section>
          <Section title="Skills">
            <div className="info-grid">
              <div><span>Primary Skill</span><strong>{resource.primarySkill}</strong></div>
              <div><span>Primary Sub-Modules</span><strong>{resource.primarySubModules?.length ? resource.primarySubModules.join(", ") : resource.subModule || "-"}</strong></div>
              <div><span>Secondary Skills</span><strong>{resource.secondarySkills?.length ? resource.secondarySkills.map((item) => `${item.skill}${item.subModule ? ` / ${item.subModule}` : ""}`).join(", ") : "-"}</strong></div>
            </div>
          </Section>
        </div>
      ) : null}

      {activeTab === "Resource Planning and Costing" ? (
        <div className="workspace detail-section-stack">
          <Section title="Planning and Costing">
            <div className="info-grid">
              <div><span>Availability Date</span><strong>{resource.availabilityDate?.slice(0, 10) || "-"}</strong></div>
              <div><span>Current Engagement Roll-Off</span><strong>{resource.deliveryRollOffDate?.slice(0, 10) || "-"}</strong></div>
              <div><span>Current Allocation %</span><strong>{currentDeployedPercent}%</strong></div>
              <div><span>Remaining Capacity %</span><strong>{currentAvailablePercent}%</strong></div>
              <div><span>Availability Exception From</span><strong>{resource.notAvailableFrom?.slice(0, 10) || "-"}</strong></div>
              <div><span>Availability Exception To</span><strong>{resource.notAvailableTo?.slice(0, 10) || "-"}</strong></div>
              <div><span>Availability Exception Type</span><strong>{resource.notAvailableReason || "-"}</strong></div>
            </div>
          </Section>
          {canEditCost ? <Section title="Restricted Cost Setup">
            <div className="info-grid">
              <div><span>Costing Type</span><strong>{resource.compensationInputType || "Direct estimated cost rate"}</strong></div>
              <div><span>Cost Basis Amount</span><strong>{resource.compensationValue || 0}</strong></div>
              <div><span>Cost Currency</span><strong>{resource.compensationCurrency || "-"}</strong></div>
            </div>
          </Section> : null}
          {canViewCost ? <Section title="Costing Calculation Reference">
            <div className="info-grid">
              <div><span>Current Delivery Status</span><strong>{currentDeliveryStatus}</strong></div>
              <div><span>Current Allocation %</span><strong>{currentDeployedPercent}%</strong></div>
              <div><span>Remaining Capacity %</span><strong>{currentAvailablePercent}%</strong></div>
              <div><span>Cost Calculation Mode</span><strong>{resource.costCalculationMode || "-"}</strong></div>
              <div><span>Estimated Cost Rate</span><strong>${resource.costRate}/hr</strong></div>
              <div><span>FX Rate Used</span><strong>{resource.fxRateUsed || "-"} {resource.compensationCurrency || "USD"}/USD</strong></div>
              <div><span>Standard Hours Per Year</span><strong>1800</strong></div>
              <div><span>Configured Overhead Rule</span><strong>{configuredOverheadLabel}</strong></div>
              <div><span>Cost Formula Hint</span><strong>{costFormulaHint}</strong></div>
            </div>
          </Section> : null}
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
    </div>
  );
}
