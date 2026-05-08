import { Fragment, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { apiFetch, deleteJson, patchJson, postJson } from "../lib/api";
import { DataTable, Field, Section, StatCard } from "../components.jsx";
import { SaveBar } from "./FormPages.jsx";

function formatDate(value) {
  return value ? String(value).slice(0, 10) : "-";
}

function formatMoney(value) {
  const amount = Number(value || 0);
  const absolute = Math.abs(amount).toLocaleString();
  return amount < 0 ? `-$${absolute}` : `$${absolute}`;
}

function formatQuantity(value, unit) {
  if (unit === "MAN_MONTHS") {
    return Number(value || 0).toFixed(2);
  }
  return Number(value || 0).toLocaleString();
}

function formatMonth(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value || "-";
  }
  return date.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

const STANDARD_MONTH_HOURS = 168;

function quantityAsHours(value, unit) {
  const quantity = Number(value || 0);
  return unit === "MAN_MONTHS" ? quantity * STANDARD_MONTH_HOURS : quantity;
}

function quantityAsManMonths(value, unit) {
  const quantity = Number(value || 0);
  return unit === "MAN_MONTHS" ? quantity : quantity / STANDARD_MONTH_HOURS;
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function roleStaffingStatus(role) {
  const assignedCount = role.deployments?.filter((deployment) => deployment.status !== "CANCELLED").length || 0;
  const requiredCount = Number(role.quantity || 1);
  if (assignedCount >= requiredCount) {
    return "Fully Staffed";
  }
  if (assignedCount > 0) {
    return "Partially Staffed";
  }
  return "Open";
}

export function SowWorkspacePage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Roles");
  const [financialTab, setFinancialTab] = useState("Project Summary");
  const { data: sow, isLoading, error } = useQuery({
    queryKey: ["sow", id],
    queryFn: () => apiFetch(`/sows/${id}`)
  });
  const { data: actualsPlan, refetch: refetchMonthlySummary } = useQuery({
    queryKey: ["actuals", "sow", id, "summary"],
    queryFn: () => apiFetch(`/actuals/sows/${id}`),
    enabled: Boolean(id)
  });
  const { data: deploymentPlanDetail, refetch: refetchDeploymentPlan } = useQuery({
    queryKey: ["actuals", "sow", id, "deployment-plan"],
    queryFn: () => apiFetch(`/actuals/sows/${id}`),
    enabled: Boolean(id)
  });
  const isEditMode = location.pathname.endsWith("/edit");
  const [form, setForm] = useState({
    sourceOpportunityId: "",
    accountId: "",
    name: "",
    billingModel: "TM_HOURLY",
    status: "DRAFT",
    currency: "USD",
    startDate: "",
    endDate: "",
    contractValue: 0,
    visibleRevenue: 0,
    visibleCost: 0,
    travelExpensesAllowed: false,
    travelExpensesBillingType: "Not Billable",
    travelExpensesCapAmount: 0,
    travelExpensesApprovalRequired: false,
    travelExpensesNotes: "",
    projectManagerName: "",
    deliveryManagerName: "",
    accountManagerName: "",
    projectHealth: "Green",
    targetMargin: 0
  });

  const roles = sow?.roles || [];
  const milestones = sow?.milestones || [];
  const assignmentRows = useMemo(() => roles.flatMap((role) => (role.deployments || []).map((deployment) => ({
    id: deployment.id,
    number: deployment.number,
    roleNumber: role.number,
    roleTitle: role.title,
    resourceName: `${deployment.resource?.firstName || ""} ${deployment.resource?.lastName || ""}`.trim() || deployment.resource?.number || "-",
    allocationPercent: deployment.allocationPercent,
    startDate: deployment.startDate,
    endDate: deployment.endDate,
    status: deployment.status,
    billable: deployment.billable,
    lockedBillRate: deployment.lockedBillRate ?? role.billRate ?? 0,
    lockedCostRate: deployment.lockedCostRate ?? 0
  }))), [roles]);
  const showMilestones = sow?.billingModel !== "TM_HOURLY";
  const workspaceTabs = ["Overview", "Roles", "Assignments", "Deployment Plan", "Monthly Summary", ...(showMilestones ? ["Milestones"] : []), "Financials", "Attachments"];
  const editRevenue = Number(form.visibleRevenue || 0);
  const editCost = Number(form.visibleCost || 0);
  const editGrossMargin = editRevenue - editCost;
  const editGrossMarginPercent = editRevenue ? Number(((editGrossMargin / editRevenue) * 100).toFixed(2)) : 0;
  const monthlySummaryRows = useMemo(() => {
    const rowsByMonth = new Map();
    const planRows = actualsPlan?.rolePlanRows?.length ? actualsPlan.rolePlanRows : actualsPlan?.deploymentRows || [];
    for (const planRow of planRows) {
      for (const monthRow of planRow.monthRows || []) {
        const current = rowsByMonth.get(monthRow.month) || {
          id: monthRow.month,
          month: monthRow.month,
          plannedTotal: 0,
          actualTotal: 0,
          missingRows: 0,
          deploymentRows: 0,
          units: new Set()
        };
        current.plannedTotal += Number(monthRow.plannedQuantity || 0);
        current.deploymentRows += actualsPlan?.rolePlanRows?.length ? 0 : 1;
        current.units.add(monthRow.plannedUnit || planRow.measurementUnit || "HOURS");
        rowsByMonth.set(monthRow.month, current);
      }
    }
    for (const deploymentRow of actualsPlan?.deploymentRows || []) {
      for (const monthRow of deploymentRow.monthRows || []) {
        const current = rowsByMonth.get(monthRow.month) || {
          id: monthRow.month,
          month: monthRow.month,
          plannedTotal: 0,
          actualTotal: 0,
          missingRows: 0,
          deploymentRows: 0,
          units: new Set()
        };
        current.actualTotal += Number(monthRow.actualQuantity || 0);
        current.missingRows += monthRow.actualQuantity === null || monthRow.actualQuantity === undefined ? 1 : 0;
        current.deploymentRows += 1;
        current.units.add(monthRow.actualUnit || deploymentRow.measurementUnit || "HOURS");
        rowsByMonth.set(monthRow.month, current);
      }
    }

    return [...rowsByMonth.values()]
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((row) => {
        const units = [...row.units];
        const unit = units.length === 1 ? units[0] : "MIXED";
        return {
          ...row,
          unit,
          plannedTotal: Number(row.plannedTotal.toFixed(2)),
          actualTotal: Number(row.actualTotal.toFixed(2)),
          variance: Number((row.actualTotal - row.plannedTotal).toFixed(2))
        };
      });
  }, [actualsPlan]);
  const financialSummary = actualsPlan?.financials || {
    plannedHours: 0,
    actualHours: 0,
    plannedRevenue: 0,
    plannedCost: 0,
    plannedGrossMargin: 0,
    plannedGrossMarginPercent: 0,
    actualRevenue: 0,
    actualCost: 0,
    actualGrossMargin: 0,
    actualGrossMarginPercent: 0
  };
  const actualCommercialSnapshot = {
    visibleRevenue: Number(financialSummary.actualRevenue || 0),
    visibleCost: Number(financialSummary.actualCost || 0),
    grossMargin: Number(financialSummary.actualGrossMargin || 0),
    grossMarginPercent: Number(financialSummary.actualGrossMarginPercent || 0)
  };
  const monthlyFinancialRows = useMemo(() => {
    const rowsByMonth = new Map();
    const rolePlans = actualsPlan?.rolePlanRows || [];
    for (const rolePlan of rolePlans) {
      const role = roles.find((item) => item.id === rolePlan.roleId);
      const billRate = Number(role?.billRate || 0);
      const costRate = Number(role?.loadedCostGuidance || role?.costRate || 0);
      for (const monthRow of rolePlan.monthRows || []) {
        const current = rowsByMonth.get(monthRow.month) || {
          id: monthRow.month,
          month: monthRow.month,
          plannedHours: 0,
          plannedRevenue: 0,
          plannedCost: 0,
          actualHours: 0,
          actualRevenue: 0,
          actualCost: 0,
          actualEntryCount: 0
        };
        const plannedHours = quantityAsHours(monthRow.plannedQuantity, monthRow.plannedUnit || rolePlan.measurementUnit);
        current.plannedHours += plannedHours;
        current.plannedRevenue += plannedHours * billRate;
        current.plannedCost += plannedHours * costRate;
        rowsByMonth.set(monthRow.month, current);
      }
    }
    if (!rolePlans.length) {
      for (const deploymentRow of actualsPlan?.deploymentRows || []) {
        for (const monthRow of deploymentRow.monthRows || []) {
          const current = rowsByMonth.get(monthRow.month) || {
            id: monthRow.month,
            month: monthRow.month,
            plannedHours: 0,
            plannedRevenue: 0,
            plannedCost: 0,
            actualHours: 0,
            actualRevenue: 0,
            actualCost: 0,
            actualEntryCount: 0
          };
          const plannedHours = quantityAsHours(monthRow.plannedQuantity, monthRow.plannedUnit || deploymentRow.measurementUnit);
          current.plannedHours += plannedHours;
          current.plannedRevenue += plannedHours * Number(deploymentRow.billRate || 0);
          current.plannedCost += plannedHours * Number(deploymentRow.costRate || 0);
          rowsByMonth.set(monthRow.month, current);
        }
      }
    }
    for (const deploymentRow of actualsPlan?.deploymentRows || []) {
      for (const monthRow of deploymentRow.monthRows || []) {
        const current = rowsByMonth.get(monthRow.month) || {
          id: monthRow.month,
          month: monthRow.month,
          plannedHours: 0,
          plannedRevenue: 0,
          plannedCost: 0,
          actualHours: 0,
          actualRevenue: 0,
          actualCost: 0,
          actualEntryCount: 0
        };
        const hasActual = monthRow.actualQuantity !== null && monthRow.actualQuantity !== undefined;
        const actualHours = !hasActual
          ? 0
          : quantityAsHours(monthRow.actualQuantity, monthRow.actualUnit || deploymentRow.measurementUnit);
        current.actualEntryCount += hasActual ? 1 : 0;
        current.actualHours += actualHours;
        current.actualRevenue += actualHours * Number(deploymentRow.billRate || 0);
        current.actualCost += actualHours * Number(deploymentRow.costRate || 0);
        rowsByMonth.set(monthRow.month, current);
      }
    }
    return [...rowsByMonth.values()]
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((row) => ({
        ...row,
        plannedHours: Number(row.plannedHours.toFixed(2)),
        plannedRevenue: Number(row.plannedRevenue.toFixed(2)),
        plannedCost: Number(row.plannedCost.toFixed(2)),
        plannedGrossMargin: Number((row.plannedRevenue - row.plannedCost).toFixed(2)),
        plannedGrossMarginPercent: row.plannedRevenue ? Number((((row.plannedRevenue - row.plannedCost) / row.plannedRevenue) * 100).toFixed(2)) : 0,
        actualHours: Number(row.actualHours.toFixed(2)),
        actualRevenue: Number(row.actualRevenue.toFixed(2)),
        actualCost: Number(row.actualCost.toFixed(2)),
        actualGrossMargin: Number((row.actualRevenue - row.actualCost).toFixed(2)),
        actualGrossMarginPercent: row.actualRevenue ? Number((((row.actualRevenue - row.actualCost) / row.actualRevenue) * 100).toFixed(2)) : 0,
        varianceHours: Number((row.plannedHours - row.actualHours).toFixed(2)),
        varianceRevenue: Number((row.plannedRevenue - row.actualRevenue).toFixed(2)),
        varianceCost: Number((row.plannedCost - row.actualCost).toFixed(2)),
        varianceGrossMargin: Number(((row.plannedRevenue - row.plannedCost) - (row.actualRevenue - row.actualCost)).toFixed(2)),
        varianceGrossMarginPercent: Number((
          (row.plannedRevenue ? ((row.plannedRevenue - row.plannedCost) / row.plannedRevenue) * 100 : 0) -
          (row.actualRevenue ? ((row.actualRevenue - row.actualCost) / row.actualRevenue) * 100 : 0)
        ).toFixed(2))
      }));
  }, [actualsPlan, roles]);
  const projectFinancialSummary = useMemo(() => {
    const actualizedRows = monthlyFinancialRows.filter((row) => Number(row.actualEntryCount || 0) > 0);
    const totals = actualizedRows.reduce((summary, row) => ({
      plannedRevenue: summary.plannedRevenue + Number(row.plannedRevenue || 0),
      plannedCost: summary.plannedCost + Number(row.plannedCost || 0),
      actualRevenue: summary.actualRevenue + Number(row.actualRevenue || 0),
      actualCost: summary.actualCost + Number(row.actualCost || 0),
      actualEntryCount: summary.actualEntryCount + Number(row.actualEntryCount || 0)
    }), {
      plannedRevenue: 0,
      plannedCost: 0,
      actualRevenue: 0,
      actualCost: 0,
      actualEntryCount: 0
    });
    const plannedGrossMargin = totals.plannedRevenue - totals.plannedCost;
    const actualGrossMargin = totals.actualRevenue - totals.actualCost;
    return {
      actualizedRows,
      actualizedPeriod: actualizedRows.length
        ? `${formatMonth(actualizedRows[0].month)} - ${formatMonth(actualizedRows[actualizedRows.length - 1].month)}`
        : "-",
      actualizedMonthCount: actualizedRows.length,
      actualEntryCount: totals.actualEntryCount,
      plannedRevenue: Number(totals.plannedRevenue.toFixed(2)),
      plannedCost: Number(totals.plannedCost.toFixed(2)),
      plannedGrossMargin,
      plannedGrossMarginPercent: totals.plannedRevenue ? Number(((plannedGrossMargin / totals.plannedRevenue) * 100).toFixed(2)) : 0,
      actualRevenue: Number(totals.actualRevenue.toFixed(2)),
      actualCost: Number(totals.actualCost.toFixed(2)),
      actualGrossMargin,
      actualGrossMarginPercent: totals.actualRevenue ? Number(((actualGrossMargin / totals.actualRevenue) * 100).toFixed(2)) : 0,
      varianceRevenue: Number((totals.plannedRevenue - totals.actualRevenue).toFixed(2)),
      varianceCost: Number((totals.plannedCost - totals.actualCost).toFixed(2)),
      varianceGrossMargin: Number((plannedGrossMargin - actualGrossMargin).toFixed(2)),
      varianceGrossMarginPercent: Number((
        (totals.plannedRevenue ? (plannedGrossMargin / totals.plannedRevenue) * 100 : 0) -
        (totals.actualRevenue ? (actualGrossMargin / totals.actualRevenue) * 100 : 0)
      ).toFixed(2))
    };
  }, [monthlyFinancialRows]);

  useEffect(() => {
    if (!sow) {
      return;
    }
    setForm({
      sourceOpportunityId: sow.sourceOpportunityId || "",
      accountId: sow.accountId || "",
      name: sow.name || "",
      billingModel: sow.billingModel || "TM_HOURLY",
      status: sow.status || "DRAFT",
      currency: sow.currency || "USD",
      startDate: String(sow.startDate || "").slice(0, 10),
      endDate: String(sow.endDate || "").slice(0, 10),
      contractValue: sow.contractValue ?? 0,
      visibleRevenue: sow.visibleRevenue ?? 0,
      visibleCost: sow.visibleCost ?? 0,
      travelExpensesAllowed: sow.travelExpensesAllowed ?? false,
      travelExpensesBillingType: sow.travelExpensesBillingType || "Not Billable",
      travelExpensesCapAmount: sow.travelExpensesCapAmount ?? 0,
      travelExpensesApprovalRequired: sow.travelExpensesApprovalRequired ?? false,
      travelExpensesNotes: sow.travelExpensesNotes || "",
      projectManagerName: sow.projectManagerName || "",
      deliveryManagerName: sow.deliveryManagerName || "",
      accountManagerName: sow.accountManagerName || "",
      projectHealth: sow.projectHealth || "Green",
      targetMargin: sow.targetMargin ?? 0
    });
  }, [sow]);

  useEffect(() => {
    if (sow?.billingModel === "TM_HOURLY" && activeTab === "Milestones") {
      setActiveTab("Overview");
    }
  }, [sow?.billingModel, activeTab]);

  if (error) return <div className="error-banner">{error.message}</div>;
  if (isLoading) return <div className="loading">Loading SOW...</div>;
  if (!sow) return <div className="error-banner">Unable to load SOW.</div>;

  async function updateStatus(nextStatus) {
    await patchJson(`/sows/${sow.id}`, { status: nextStatus });
    window.location.reload();
  }

  async function saveWorkspace(event) {
    event.preventDefault();
    await patchJson(`/sows/${sow.id}`, form);
    navigate(`/sows/${sow.id}`);
  }

  const headerStats = isEditMode ? [
    { label: "Visible Revenue", value: formatMoney(form.visibleRevenue) },
    { label: "Visible Cost", value: formatMoney(form.visibleCost) },
    { label: "Gross Margin", value: formatMoney(editGrossMargin) },
    { label: "Margin %", value: `${editGrossMarginPercent}%` }
  ] : [
    { label: "Actual Revenue", value: formatMoney(financialSummary.actualRevenue) },
    { label: "Actual Cost", value: formatMoney(financialSummary.actualCost) },
    { label: "Actual Gross Margin", value: formatMoney(financialSummary.actualGrossMargin) },
    { label: "Actual Margin %", value: formatPercent(financialSummary.actualGrossMarginPercent) }
  ];

  return (
    <form className="workspace detail-layout" onSubmit={saveWorkspace}>
      <Link className="back-link" to="/sows">Back to SOWs</Link>
      <section className="workspace-header">
        <div>
          <p className="eyebrow">{sow.number} / {sow.account?.name}</p>
          <h2>{isEditMode ? `Edit SOW ${sow.number}` : sow.name}</h2>
          <p className="muted">Start: {formatDate(isEditMode ? form.startDate : sow.startDate)} / End: {formatDate(isEditMode ? form.endDate : sow.endDate)} / Contract: {formatMoney(isEditMode ? form.contractValue : sow.contractValue)}</p>
        </div>
        <div className="status-stack">
          {isEditMode ? (
            <span className="pill accent">{form.status.replaceAll("_", " ")}</span>
          ) : (
            <select value={sow.status} onChange={(event) => updateStatus(event.target.value)}>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
              <option value="TERMINATED">Terminated</option>
            </select>
          )}
          <span className="pill">{isEditMode ? form.billingModel : sow.billingModel}</span>
          {isEditMode ? (
            <button className="secondary-button" onClick={() => navigate(`/sows/${sow.id}`)} type="button">View</button>
          ) : (
            <button onClick={() => navigate(`/sows/${sow.id}/edit`)} type="button">Edit</button>
          )}
        </div>
      </section>

      <div className="stats-grid compact-stats">
        {headerStats.map((card) => <StatCard key={card.label} label={card.label} value={card.value} />)}
      </div>

      <div className="tabs" role="tablist">
        {workspaceTabs.map((tab) => (
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
        <div className="two-column">
          <Section title="Engagement">
            {isEditMode ? (
              <div className="form-grid two-up">
                <Field label="SOW / Engagement Name"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
                <Field label="Reference Opportunity"><input value={form.sourceOpportunityId || ""} readOnly /></Field>
                <Field label="SOW Status">
                  <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                    <option value="DRAFT">Draft</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="TERMINATED">Terminated</option>
                  </select>
                </Field>
                <Field label="Billing Model">
                  <select value={form.billingModel} onChange={(event) => setForm({ ...form, billingModel: event.target.value })}>
                    <option value="TM_HOURLY">T&M Hourly</option>
                    <option value="FIXED_MAN_MONTH">Fixed Man-Month</option>
                    <option value="FIXED_MILESTONE">Fixed Milestone</option>
                  </select>
                </Field>
                <Field label="Project Health">
                  <select value={form.projectHealth} onChange={(event) => setForm({ ...form, projectHealth: event.target.value })}>
                    <option>Green</option>
                    <option>Amber</option>
                    <option>Red</option>
                  </select>
                </Field>
                <Field label="Project Manager"><input value={form.projectManagerName} onChange={(event) => setForm({ ...form, projectManagerName: event.target.value })} /></Field>
                <Field label="Delivery Manager"><input value={form.deliveryManagerName} onChange={(event) => setForm({ ...form, deliveryManagerName: event.target.value })} /></Field>
                <Field label="Account Manager"><input value={form.accountManagerName} onChange={(event) => setForm({ ...form, accountManagerName: event.target.value })} /></Field>
                <Field label="Target Margin %"><input type="number" step="any" value={form.targetMargin} onChange={(event) => setForm({ ...form, targetMargin: event.target.value })} /></Field>
              </div>
            ) : (
              <div className="info-grid">
                <div><span>Reference Opportunity</span><strong>{sow.sourceOpportunityId || "-"}</strong></div>
                <div><span>Client Name</span><strong>{sow.account?.name || "-"}</strong></div>
                <div><span>Billing Model</span><strong>{sow.billingModel}</strong></div>
                <div><span>Status</span><strong>{sow.status}</strong></div>
                <div><span>Project Manager</span><strong>{sow.projectManagerName || "-"}</strong></div>
                <div><span>Delivery Manager</span><strong>{sow.deliveryManagerName || "-"}</strong></div>
                <div><span>Account Manager</span><strong>{sow.accountManagerName || "-"}</strong></div>
                <div><span>Target Margin %</span><strong>{sow.targetMargin ?? 0}%</strong></div>
              </div>
            )}
          </Section>
          <Section title="Commercial Snapshot">
            {isEditMode ? (
              <div className="form-grid two-up">
                <Field label="Start Date"><input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></Field>
                <Field label="End Date"><input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></Field>
                <Field label="Contract Value"><input type="number" step="any" value={form.contractValue} onChange={(event) => setForm({ ...form, contractValue: event.target.value })} /></Field>
                <Field label="Visible Revenue"><input type="number" step="any" value={form.visibleRevenue} onChange={(event) => setForm({ ...form, visibleRevenue: event.target.value })} /></Field>
                <Field label="Visible Cost"><input type="number" step="any" value={form.visibleCost} onChange={(event) => setForm({ ...form, visibleCost: event.target.value })} /></Field>
                <Field label="Currency"><input value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })} /></Field>
                <Field label="T&E Allowed"><select value={String(form.travelExpensesAllowed)} onChange={(event) => setForm({ ...form, travelExpensesAllowed: event.target.value === "true" })}><option value="false">No</option><option value="true">Yes</option></select></Field>
                <Field label="T&E Billing Type"><select value={form.travelExpensesBillingType} onChange={(event) => setForm({ ...form, travelExpensesBillingType: event.target.value })}><option>Included</option><option>Pass-through</option><option>Capped</option><option>Not Billable</option></select></Field>
                <Field label="T&E Cap Amount"><input type="number" step="any" value={form.travelExpensesCapAmount} onChange={(event) => setForm({ ...form, travelExpensesCapAmount: event.target.value })} /></Field>
                <Field label="T&E Approval Required"><select value={String(form.travelExpensesApprovalRequired)} onChange={(event) => setForm({ ...form, travelExpensesApprovalRequired: event.target.value === "true" })}><option value="false">No</option><option value="true">Yes</option></select></Field>
                <Field label="T&E Notes"><textarea rows="2" value={form.travelExpensesNotes} onChange={(event) => setForm({ ...form, travelExpensesNotes: event.target.value })} /></Field>
              </div>
            ) : (
              <div className="info-grid">
                <div><span>Contract Value</span><strong>{formatMoney(sow.contractValue)}</strong></div>
                <div><span>Visible Revenue</span><strong>{formatMoney(actualCommercialSnapshot.visibleRevenue)}</strong></div>
                <div><span>Visible Cost</span><strong>{formatMoney(actualCommercialSnapshot.visibleCost)}</strong></div>
                <div><span>Gross Margin</span><strong>{formatMoney(actualCommercialSnapshot.grossMargin)}</strong></div>
                <div><span>Margin %</span><strong>{formatPercent(actualCommercialSnapshot.grossMarginPercent)}</strong></div>
                <div><span>Health</span><strong>{sow.projectHealth || "-"}</strong></div>
                <div><span>T&E Allowed</span><strong>{sow.travelExpensesAllowed ? "Yes" : "No"}</strong></div>
                <div><span>T&E Billing Type</span><strong>{sow.travelExpensesBillingType || "Not Billable"}</strong></div>
                <div><span>T&E Cap Amount</span><strong>{formatMoney(sow.travelExpensesCapAmount)}</strong></div>
                <div><span>T&E Approval Required</span><strong>{sow.travelExpensesApprovalRequired ? "Yes" : "No"}</strong></div>
                <div><span>T&E Notes</span><strong>{sow.travelExpensesNotes || "-"}</strong></div>
              </div>
            )}
          </Section>
        </div>
      ) : null}

      {activeTab === "Roles" ? (
        <Section title="SOW Roles" actions={<button onClick={() => navigate(`/sows/${sow.id}/roles/new`)}>Add Role</button>}>
            <DataTable
              columns={[
                { key: "number", label: "Role" },
                { key: "title", label: "Title" },
                { key: "skill", label: "SAP Module" },
                { key: "subModule", label: "Sub-Module" },
                { key: "locationRequirement", label: "Location" },
                { key: "experienceLevel", label: "Experience" },
                { key: "plannedAllocationPercent", label: "Allocation" },
                { key: "plannedHours", label: "Planned Hours", render: (row) => formatQuantity(row.plannedHours, row.measurementUnit || "HOURS") },
                { key: "measurementUnit", label: "Unit" },
                { key: "staffingStatus", label: "Staffing Status", render: roleStaffingStatus },
                {
                  key: "actions",
                  label: "Actions",
                  render: (row) => (
                    <div className="row-actions">
                      <button className="tiny-button secondary" type="button" onClick={(event) => { event.stopPropagation(); navigate(`/sows/${sow.id}/roles/${row.id}/assign`); }}>
                        Assign
                      </button>
                      <button className="tiny-button" type="button" onClick={(event) => { event.stopPropagation(); navigate(`/sows/${sow.id}/roles/${row.id}/edit`); }}>
                        Edit
                      </button>
                    </div>
                  )
                }
              ]}
              rows={roles}
            />
          </Section>
      ) : null}

      {activeTab === "Assignments" ? (
        <Section title="Resource Assignments">
          {assignmentRows.length ? (
            <DataTable
              columns={[
                { key: "number", label: "Deployment" },
                { key: "roleTitle", label: "Role" },
                { key: "resourceName", label: "Resource" },
                { key: "allocationPercent", label: "Allocation", render: (row) => `${row.allocationPercent}%` },
                { key: "startDate", label: "Start", render: (row) => formatDate(row.startDate) },
                { key: "endDate", label: "End", render: (row) => formatDate(row.endDate) },
                { key: "status", label: "Deployment Status" },
                { key: "lockedBillRate", label: "Bill Rate", render: (row) => formatMoney(row.lockedBillRate) },
                { key: "lockedCostRate", label: "Cost Rate", render: (row) => formatMoney(row.lockedCostRate) }
              ]}
              rows={assignmentRows}
            />
          ) : (
            <div className="empty-state">No resource assignments have been created for this SOW yet.</div>
          )}
        </Section>
      ) : null}

      {activeTab === "Deployment Plan" ? (
        <Section title="Deployment Plan">
          <DeploymentPlanEditor
            actualsPlan={deploymentPlanDetail}
            onSaved={() => {
              refetchDeploymentPlan();
              refetchMonthlySummary();
            }}
          />
        </Section>
      ) : null}

      {activeTab === "Monthly Summary" ? (
        <Section title="Monthly Summary">
          <DataTable
            columns={[
              { key: "month", label: "Month", render: (row) => formatMonth(row.month) },
              { key: "deploymentRows", label: "Deployment Rows" },
              { key: "plannedTotal", label: "Planned Total", render: (row) => formatQuantity(row.plannedTotal, row.unit) },
              { key: "actualTotal", label: "Actual Total", render: (row) => formatQuantity(row.actualTotal, row.unit) },
              { key: "variance", label: "Variance", render: (row) => formatQuantity(row.variance, row.unit) },
              { key: "unit", label: "Unit", render: (row) => row.unit === "MIXED" ? "Mixed" : row.unit },
              { key: "missingRows", label: "Missing Rows" }
            ]}
            rows={monthlySummaryRows}
          />
        </Section>
      ) : null}

      {showMilestones && activeTab === "Milestones" ? (
        <Section title="Milestones">
          <DataTable
            columns={[
              { key: "number", label: "Milestone" },
              { key: "name", label: "Name" },
              { key: "plannedDate", label: "Planned", render: (row) => formatDate(row.plannedDate) },
              { key: "plannedAmount", label: "Amount", render: (row) => formatMoney(row.plannedAmount) },
              { key: "status", label: "Status" }
            ]}
            rows={milestones}
          />
        </Section>
      ) : null}

      {activeTab === "Financials" ? (
        <div className="page-grid financials-workspace">
          <Section title="Financials">
            <div className="tabs inner-tabs" role="tablist">
              {["Project Summary", "Monthly Financials"].map((tab) => (
                <button
                  key={tab}
                  className={financialTab === tab ? "tab active" : "tab"}
                  onClick={() => setFinancialTab(tab)}
                  type="button"
                >
                  {tab}
                </button>
              ))}
            </div>
            {financialTab === "Project Summary" ? (
              <ProjectFinancialSummary summary={projectFinancialSummary} contractValue={sow.contractValue} />
            ) : (
              <MonthlyFinancialsTable rows={monthlyFinancialRows} />
            )}
          </Section>
        </div>
      ) : null}
      {activeTab === "Attachments" ? (
        <Section title="SOW Attachments">
          <SowAttachments sowId={sow.id} rows={sow.attachments || []} onSaved={() => window.location.reload()} />
        </Section>
      ) : null}
      {isEditMode ? <SaveBar backTo={`/sows/${sow.id}`} label="Save SOW" /> : null}
    </form>
  );
}

function varianceClass(type, value) {
  const amount = Number(value || 0);
  if (!amount) {
    return "variance-neutral";
  }
  if (type === "cost") {
    return amount < 0 ? "variance-bad" : "variance-good";
  }
  return amount > 0 ? "variance-bad" : "variance-good";
}

function ProjectFinancialSummary({ summary, contractValue }) {
  if (!summary.actualizedRows.length) {
    return <div className="empty-state">No actuals have been entered yet. Project summary will populate after the first actual month is saved.</div>;
  }

  return (
    <div className="project-financial-summary">
      <div className="project-financial-context">
        <div>
          <span>Contract Value</span>
          <strong>{formatMoney(contractValue)}</strong>
        </div>
        <div>
          <span>Actualized Period</span>
          <strong>{summary.actualizedPeriod}</strong>
        </div>
        <div>
          <span>Actuals Coverage</span>
          <strong>{summary.actualizedMonthCount} months / {summary.actualEntryCount} rows</strong>
        </div>
      </div>

      <div className="project-financial-grid">
        <SummaryCell label="Planned Revenue To Date" value={formatMoney(summary.plannedRevenue)} />
        <SummaryCell label="Planned Cost To Date" value={formatMoney(summary.plannedCost)} />
        <SummaryCell label="Planned GM % To Date" value={formatPercent(summary.plannedGrossMarginPercent)} />
        <SummaryCell label="Actual Revenue To Date" value={formatMoney(summary.actualRevenue)} />
        <SummaryCell label="Actual Cost To Date" value={formatMoney(summary.actualCost)} />
        <SummaryCell label="Actual GM % To Date" value={formatPercent(summary.actualGrossMarginPercent)} />
        <SummaryCell label="Variance in Revenue" value={formatMoney(summary.varianceRevenue)} className={varianceClass("revenue", summary.varianceRevenue)} />
        <SummaryCell label="Variance in Cost" value={formatMoney(summary.varianceCost)} className={varianceClass("cost", summary.varianceCost)} />
        <SummaryCell label="Variance in GM %" value={`${summary.varianceGrossMarginPercent.toFixed(2)} pts`} className={varianceClass("margin", summary.varianceGrossMarginPercent)} />
      </div>
    </div>
  );
}

function SummaryCell({ label, value, className = "" }) {
  return (
    <div className={`summary-cell ${className}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MonthlyFinancialsTable({ rows }) {
  if (!rows.length) {
    return <div className="empty-state">No actual financial records are available yet.</div>;
  }

  return (
    <div className="table-wrap financial-summary-table">
      <table>
        <thead>
          <tr>
            <th>Month</th>
            <th>Metric</th>
            <th>Planned</th>
            <th>Actual</th>
            <th>Variance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => <FinancialDetailRows key={row.id} row={row} />)}
        </tbody>
      </table>
    </div>
  );
}

function SowAttachments({ sowId, rows, onSaved }) {
  const emptyForm = { documentType: "SOW Document", fileName: "", referenceUrl: "", notes: "" };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const documentTypes = ["SOW Document", "Scope Document", "Project Plan", "Pricing Sheet", "Change Request", "Approval Email", "Other"];

  async function saveAttachment() {
    if (!form.fileName.trim()) {
      return;
    }
    setSaving(true);
    await postJson("/children/sowAttachments", { ...form, sowId });
    setForm(emptyForm);
    setSaving(false);
    onSaved();
  }

  async function deleteAttachment(row) {
    await deleteJson(`/children/sowAttachments/${row.id}`);
    onSaved();
  }

  return (
    <div className="sow-attachments">
      <div className="form-grid two-up">
        <Field label="Document Type">
          <select value={form.documentType} onChange={(event) => setForm({ ...form, documentType: event.target.value })}>
            {documentTypes.map((type) => <option key={type}>{type}</option>)}
          </select>
        </Field>
        <Field label="Document Name"><input value={form.fileName} onChange={(event) => setForm({ ...form, fileName: event.target.value })} required /></Field>
        <Field label="Reference / URL"><input value={form.referenceUrl} onChange={(event) => setForm({ ...form, referenceUrl: event.target.value })} /></Field>
        <Field label="Notes"><input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
        <div className="inline-save-bar">
          <button type="button" onClick={saveAttachment} disabled={saving || !form.fileName.trim()}>{saving ? "Saving..." : "Add Attachment"}</button>
        </div>
      </div>
      <DataTable
        columns={[
          { key: "number", label: "Attachment" },
          { key: "documentType", label: "Type" },
          { key: "fileName", label: "Document Name" },
          { key: "referenceUrl", label: "Reference", render: (row) => row.referenceUrl ? <a href={row.referenceUrl} target="_blank" rel="noreferrer">{row.referenceUrl}</a> : "-" },
          { key: "notes", label: "Notes" },
          { key: "actions", label: "Actions", render: (row) => <button className="tiny-button danger" type="button" onClick={() => deleteAttachment(row)}>Delete</button> }
        ]}
        rows={rows}
      />
    </div>
  );
}

function FinancialDetailRows({ row }) {
  const detailRows = [
    {
      metric: "Hours",
      planned: formatQuantity(row.plannedHours, "HOURS"),
      actual: formatQuantity(row.actualHours, "HOURS"),
      variance: formatQuantity(row.varianceHours, "HOURS")
    },
    {
      metric: "Revenue",
      planned: formatMoney(row.plannedRevenue),
      actual: formatMoney(row.actualRevenue),
      variance: formatMoney(row.varianceRevenue)
    },
    {
      metric: "Cost",
      planned: formatMoney(row.plannedCost),
      actual: formatMoney(row.actualCost),
      variance: formatMoney(row.varianceCost)
    },
    {
      metric: "Gross Margin",
      planned: formatMoney(row.plannedGrossMargin),
      actual: formatMoney(row.actualGrossMargin),
      variance: formatMoney(row.varianceGrossMargin)
    },
    {
      metric: "Margin %",
      planned: formatPercent(row.plannedGrossMarginPercent),
      actual: formatPercent(row.actualGrossMarginPercent),
      variance: `${row.varianceGrossMarginPercent.toFixed(2)} pts`
    }
  ];

  return (
    <>
      {detailRows.map((detailRow, index) => (
        <tr key={`${row.id}-${detailRow.metric}`}>
          {index === 0 ? (
            <td className="financial-detail-month" rowSpan={detailRows.length}>{formatMonth(row.month)}</td>
          ) : null}
          <td>{detailRow.metric}</td>
          <td className="numeric-cell">{detailRow.planned}</td>
          <td className="numeric-cell">{detailRow.actual}</td>
          <td className="numeric-cell">{detailRow.variance}</td>
        </tr>
      ))}
    </>
  );
}

function DeploymentPlanEditor({ actualsPlan, onSaved }) {
  const [savingId, setSavingId] = useState("");
  const [drafts, setDrafts] = useState({});
  const planRows = actualsPlan?.rolePlanRows || [];
  const monthColumns = useMemo(() => {
    const months = new Set();
    for (const planRow of planRows) {
      for (const monthRow of planRow.monthRows || []) {
        months.add(monthRow.month);
      }
    }
    return [...months].sort((a, b) => a.localeCompare(b));
  }, [planRows]);
  const rowsWithPlans = useMemo(() => planRows.map((planRow) => {
    const monthMap = new Map((planRow.monthRows || []).map((monthRow) => [monthRow.month, monthRow]));
    return {
      ...planRow,
      monthMap
    };
  }), [planRows]);

  useEffect(() => {
    const nextDrafts = {};
    for (const planRow of planRows) {
      for (const monthRow of planRow.monthRows || []) {
        nextDrafts[monthRow.id] = {
          planId: monthRow.planId || "",
          deploymentId: "",
          sowRoleId: planRow.roleId,
          month: monthRow.month,
          plannedQuantity: monthRow.plannedQuantity ?? 0,
          plannedUnit: monthRow.plannedUnit || planRow.measurementUnit || "HOURS",
          notes: monthRow.plannedNotes || ""
        };
      }
    }
    setDrafts(nextDrafts);
  }, [actualsPlan]);

  function updateDraft(rowId, key, value) {
    setDrafts((current) => ({
      ...current,
      [rowId]: {
        ...current[rowId],
        [key]: value
      }
    }));
  }

  async function persistPlan(rowId) {
    const draft = drafts[rowId];
    if (!draft) {
      return;
    }
    const payload = {
      deploymentId: draft.deploymentId,
      sowRoleId: draft.sowRoleId,
      month: draft.month,
      plannedQuantity: Number(draft.plannedQuantity || 0),
      plannedUnit: draft.plannedUnit || "HOURS",
      notes: draft.notes || ""
    };
    if (draft.planId) {
      await patchJson(`/children/deploymentPlans/${draft.planId}`, payload);
    } else {
      await postJson("/children/deploymentPlans", payload);
    }
  }

  async function savePlan(rowId) {
    setSavingId(rowId);
    await persistPlan(rowId);
    setSavingId("");
    onSaved();
  }

  async function clearPlanRow(planRow) {
    const planIds = (planRow.monthRows || []).map((monthRow) => drafts[monthRow.id]?.planId).filter(Boolean);
    if (!planIds.length) {
      return;
    }
    const shouldClear = window.confirm("Clear saved monthly plan values for this role row?");
    if (!shouldClear) {
      return;
    }
    setSavingId(`clear-${planRow.id}`);
    await Promise.all(planIds.map((planId) => deleteJson(`/children/deploymentPlans/${planId}`)));
    setSavingId("");
    onSaved();
  }

  async function savePlanRow(planRow) {
    const rowIds = (planRow.monthRows || []).map((monthRow) => monthRow.id).filter((rowId) => drafts[rowId]);
    setSavingId(planRow.id);
    await Promise.all(rowIds.map((rowId) => persistPlan(rowId)));
    setSavingId("");
    onSaved();
  }

  async function saveAllPlans() {
    const rowIds = Object.keys(drafts);
    setSavingId("all");
    await Promise.all(rowIds.map((rowId) => persistPlan(rowId)));
    setSavingId("");
    onSaved();
  }

  function getDraftQuantity(monthRow) {
    const draft = drafts[monthRow.id];
    return {
      quantity: Number(draft?.plannedQuantity || 0),
      unit: draft?.plannedUnit || monthRow.plannedUnit || "HOURS"
    };
  }

  function getRowTotals(deploymentRow) {
    return (deploymentRow.monthRows || []).reduce((totals, monthRow) => {
      const draftQuantity = getDraftQuantity(monthRow);
      return {
        hours: totals.hours + quantityAsHours(draftQuantity.quantity, draftQuantity.unit),
        manMonths: totals.manMonths + quantityAsManMonths(draftQuantity.quantity, draftQuantity.unit)
      };
    }, { hours: 0, manMonths: 0 });
  }

  function getMonthTotal(month) {
    return planRows.reduce((total, planRow) => {
      const monthRow = (planRow.monthRows || []).find((row) => row.month === month);
      if (!monthRow) {
        return total;
      }
      const draftQuantity = getDraftQuantity(monthRow);
      return total + quantityAsHours(draftQuantity.quantity, draftQuantity.unit);
    }, 0);
  }

  const grandTotals = planRows.reduce((totals, planRow) => {
    const rowTotals = getRowTotals(planRow);
    return {
      hours: totals.hours + rowTotals.hours,
      manMonths: totals.manMonths + rowTotals.manMonths
    };
  }, { hours: 0, manMonths: 0 });

  if (!planRows.length) {
    return <div className="empty-state">No SOW roles found. Add roles before maintaining the monthly deployment plan.</div>;
  }

  return (
    <div className="deployment-plan-sheet">
      <div className="deployment-plan-toolbar">
        <div>
          <p className="eyebrow">Planning Template</p>
          <h3>Role monthly deployment plan</h3>
          <p className="muted">Enter planned hours by SOW role and month. Resource assignment is not required for planning.</p>
        </div>
        <button type="button" disabled={savingId === "all"} onClick={saveAllPlans}>
          {savingId === "all" ? "Saving..." : "Save All"}
        </button>
      </div>
      <div className="table-wrap deployment-plan-table">
        <table>
          <thead>
            <tr>
              <th className="deployment-plan-role-col">Role / Deployment</th>
              {monthColumns.map((month, index) => (
                <th className="deployment-plan-month-col" key={month}>
                  <span>Month {index + 1}</span>
                  <small>{formatMonth(month)}</small>
                </th>
              ))}
              <th>Total Hours</th>
              <th>Total Man Months</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rowsWithPlans.map((planRow) => {
              const rowTotals = getRowTotals(planRow);
              return (
                <tr key={planRow.id}>
                  <td className="deployment-plan-role-cell">
                    <strong>{planRow.roleTitle}</strong>
                    <span>{planRow.roleNumber} / {planRow.skill || "-"}</span>
                    <small>{planRow.locationRequirement || "-"} / {planRow.measurementUnit}</small>
                  </td>
                  {monthColumns.map((month) => {
                    const monthRow = planRow.monthMap.get(month);
                    const draft = monthRow ? drafts[monthRow.id] || {} : null;
                    return (
                      <td className="deployment-plan-input-cell" key={`${planRow.id}-${month}`}>
                        {monthRow ? (
                          <input
                            aria-label={`${planRow.roleTitle} ${formatMonth(month)} planned quantity`}
                            min="0"
                            type="number" step="any"
                            value={draft.plannedQuantity ?? 0}
                            onChange={(event) => updateDraft(monthRow.id, "plannedQuantity", event.target.value)}
                          />
                        ) : (
                          <span className="deployment-plan-blank">-</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="numeric-cell">{formatQuantity(rowTotals.hours, "HOURS")}</td>
                  <td className="numeric-cell">{rowTotals.manMonths.toFixed(1)}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="tiny-button" disabled={savingId === planRow.id} onClick={() => savePlanRow(planRow)}>
                        {savingId === planRow.id ? "Saving..." : "Save Row"}
                      </button>
                      <button
                        type="button"
                        className="tiny-button secondary"
                        disabled={savingId === `clear-${planRow.id}` || !(planRow.monthRows || []).some((monthRow) => drafts[monthRow.id]?.planId)}
                        onClick={() => clearPlanRow(planRow)}
                      >
                        {savingId === `clear-${planRow.id}` ? "Clearing..." : "Clear Manual"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            <tr className="deployment-plan-total-row">
              <td>Total</td>
              {monthColumns.map((month) => (
                <td className="numeric-cell" key={`total-${month}`}>{formatQuantity(getMonthTotal(month), "HOURS")}</td>
              ))}
              <td className="numeric-cell">{formatQuantity(grandTotals.hours, "HOURS")}</td>
              <td className="numeric-cell">{grandTotals.manMonths.toFixed(1)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
