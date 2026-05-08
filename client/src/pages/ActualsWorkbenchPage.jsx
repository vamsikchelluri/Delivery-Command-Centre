import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch, patchJson, postJson } from "../lib/api";
import { DataTable, Field, PageHeaderCard, Section, StatCard } from "../components.jsx";

function formatQuantity(value, unit) {
  if (unit === "MAN_MONTHS") {
    return Number(value || 0).toFixed(2);
  }
  return Number(value || 0).toLocaleString();
}

function formatMonth(month) {
  const date = new Date(month);
  if (Number.isNaN(date.getTime())) {
    return month;
  }
  return date.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export function ActualsWorkbenchPage() {
  const navigate = useNavigate();
  const { data = [], isLoading } = useQuery({
    queryKey: ["actuals", "sows"],
    queryFn: () => apiFetch("/actuals/sows")
  });

  return (
    <div className="workspace">
      <PageHeaderCard
        eyebrow="Actuals"
        title="Actuals Overview"
        subtitle="Select an SOW to capture monthly actuals by deployment and resource."
      />

      <div className="stats-grid register-kpi-row">
        <StatCard label="SOWs with Deployments" value={data.length} />
        <StatCard label="Active Deployments" value={data.reduce((sum, row) => sum + Number(row.activeDeploymentCount || 0), 0)} />
      </div>

      <Section title="SOW Actuals Register">
        {isLoading ? (
          <div className="loading">Loading SOW actuals...</div>
        ) : (
          <DataTable
            columns={[
              { key: "number", label: "SOW Number" },
              { key: "clientName", label: "Client Name" },
              { key: "name", label: "SOW Name" },
              { key: "billingModel", label: "Billing Model" },
              { key: "projectManagerName", label: "Project Manager" },
              { key: "deliveryManagerName", label: "Delivery Manager" },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <button
                    className="tiny-button"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/actuals/${row.id}`);
                    }}
                  >
                    Open
                  </button>
                )
              }
            ]}
            rows={data}
            onRowClick={(row) => navigate(`/actuals/${row.id}`)}
          />
        )}
      </Section>
    </div>
  );
}

export function SowActualsDetailPage() {
  const { id } = useParams();
  const [expandedId, setExpandedId] = useState("");
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["actuals", "sow", id],
    queryFn: () => apiFetch(`/actuals/sows/${id}`)
  });

  const summary = data?.summary || { deploymentCount: 0, totalPlanned: 0, totalActual: 0, missingRows: 0 };

  if (isLoading) {
    return <div className="loading">Loading SOW actuals...</div>;
  }
  if (!data) {
    return <div className="error-banner">Unable to load SOW actuals.</div>;
  }

  return (
    <div className="workspace detail-layout">
      <Link className="back-link" to="/actuals">Back to Actuals</Link>
      <section className="workspace-header">
        <div>
          <p className="eyebrow">{data.number} / {data.account?.name || "-"}</p>
          <h2>{data.name}</h2>
          <p className="muted">PM: {data.projectManagerName || "-"} / DM: {data.deliveryManagerName || "-"} / {data.billingModel}</p>
        </div>
      </section>

      <div className="stats-grid compact-stats">
        <StatCard label="Deployments" value={summary.deploymentCount} />
        <StatCard label="Planned Total" value={formatQuantity(summary.totalPlanned, "HOURS")} />
        <StatCard label="Actual Total" value={formatQuantity(summary.totalActual, "HOURS")} />
        <StatCard label="Missing Rows" value={summary.missingRows} />
      </div>

      <Section title="Deployment Actuals">
        {!data.deploymentRows?.length ? (
          <div className="empty-state">No active deployments found for this SOW.</div>
        ) : (
          <div className="deployment-actuals-list">
            {data.deploymentRows.map((row) => {
              const isOpen = expandedId === row.id;
              return (
                <div key={row.id} className="deployment-actual-card">
                  <div className="deployment-actual-head">
                    <div>
                      <strong>{row.roleTitle}</strong>
                      <p className="muted">{row.deploymentNumber} / {row.resourceName}</p>
                    </div>
                    <div className="deployment-actual-metrics">
                      <span>{row.measurementUnit}</span>
                      <span>Planned: {formatQuantity(row.plannedTotal, row.measurementUnit)}</span>
                      <span>Actual: {formatQuantity(row.actualTotal, row.measurementUnit)}</span>
                      <span>Status: {row.status}</span>
                      <button type="button" className="tiny-button" onClick={() => setExpandedId(isOpen ? "" : row.id)}>
                        {isOpen ? "Hide Months" : "Open Months"}
                      </button>
                    </div>
                  </div>
                  {isOpen ? <DeploymentMonthEditor deploymentRow={row} onSaved={refetch} /> : null}
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

function DeploymentMonthEditor({ deploymentRow, onSaved }) {
  const [savingId, setSavingId] = useState("");
  const [saveResults, setSaveResults] = useState({});
  const [bulkSaving, setBulkSaving] = useState(false);
  function initialDraftRows() {
    return Object.fromEntries(
      deploymentRow.monthRows.map((row) => [
        row.month,
        {
          actualId: row.actualId,
          actualQuantity: row.actualQuantity ?? "",
          actualUnit: row.actualUnit,
          remarks: row.remarks || ""
        }
      ])
    );
  }
  const [drafts, setDrafts] = useState(() =>
    initialDraftRows()
  );
  const [baselineDrafts, setBaselineDrafts] = useState(() => initialDraftRows());

  const orderedMonths = useMemo(() => deploymentRow.monthRows, [deploymentRow.monthRows]);

  useEffect(() => {
    const next = initialDraftRows();
    setDrafts(next);
    setBaselineDrafts(next);
    setSaveResults({});
  }, [deploymentRow.id]);

  function isDirty(row) {
    return JSON.stringify(drafts[row.month] || {}) !== JSON.stringify(baselineDrafts[row.month] || {});
  }

  async function persistMonth(row) {
    const draft = drafts[row.month] || {};
    const payload = {
      deploymentId: deploymentRow.deploymentId,
      month: row.month,
      actualQuantity: draft.actualQuantity === "" ? 0 : Number(draft.actualQuantity),
      actualUnit: draft.actualUnit || row.actualUnit,
      remarks: draft.remarks || ""
    };
    return draft.actualId
      ? patchJson(`/children/actuals/${draft.actualId}`, payload)
      : postJson("/children/actuals", payload);
  }

  async function saveMonth(row) {
    setSavingId(row.month);
    try {
      const saved = await persistMonth(row);
      setBaselineDrafts((current) => ({
        ...current,
        [row.month]: { ...drafts[row.month], actualId: saved.id || drafts[row.month]?.actualId }
      }));
      setDrafts((current) => ({
        ...current,
        [row.month]: { ...current[row.month], actualId: saved.id || current[row.month]?.actualId }
      }));
      setSaveResults((current) => ({ ...current, [row.month]: "Saved" }));
      onSaved();
    } catch (error) {
      setSaveResults((current) => ({ ...current, [row.month]: error.message || "Failed" }));
    }
    setSavingId("");
  }

  async function saveAllChanges() {
    const dirtyRows = orderedMonths.filter(isDirty);
    if (!dirtyRows.length) {
      return;
    }
    setBulkSaving(true);
    const nextResults = {};
    for (const row of dirtyRows) {
      try {
        const saved = await persistMonth(row);
        const nextDraft = { ...drafts[row.month], actualId: saved.id || drafts[row.month]?.actualId };
        setDrafts((current) => ({ ...current, [row.month]: nextDraft }));
        setBaselineDrafts((current) => ({ ...current, [row.month]: nextDraft }));
        nextResults[row.month] = "Saved";
      } catch (error) {
        nextResults[row.month] = error.message || "Failed";
      }
    }
    setSaveResults((current) => ({ ...current, ...nextResults }));
    setBulkSaving(false);
    onSaved();
  }

  return (
    <div className="deployment-month-editor">
      <div className="actuals-editor-toolbar">
        <button type="button" onClick={saveAllChanges} disabled={bulkSaving || !orderedMonths.some(isDirty)}>
          {bulkSaving ? "Saving..." : "Save All Changes"}
        </button>
        <span className="muted">{orderedMonths.filter(isDirty).length} unsaved rows</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Month</th>
            <th>Planned</th>
            <th>Actual</th>
            <th>Unit</th>
            <th>Status</th>
            <th>Variance</th>
            <th>Remarks</th>
            <th>Save</th>
          </tr>
        </thead>
        <tbody>
          {orderedMonths.map((row) => {
            const draft = drafts[row.month] || {};
            const dirty = isDirty(row);
            const saveResult = saveResults[row.month] || "";
            return (
              <tr key={row.month} className={dirty ? "dirty-row" : ""}>
                <td>{formatMonth(row.month)}</td>
                <td>{formatQuantity(row.plannedQuantity, row.actualUnit)}</td>
                <td>
                  <input
                    type="number" step="any"
                    value={draft.actualQuantity}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [row.month]: { ...current[row.month], actualQuantity: event.target.value }
                      }))
                    }
                  />
                </td>
                <td>
                  <select
                    value={draft.actualUnit || row.actualUnit}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [row.month]: { ...current[row.month], actualUnit: event.target.value }
                      }))
                    }
                  >
                    <option value="HOURS">Hours</option>
                    <option value="MAN_MONTHS">Man-Months</option>
                  </select>
                </td>
                <td>{row.status}</td>
                <td>{row.variance === null ? "-" : formatQuantity(row.variance, row.actualUnit)}</td>
                <td>
                  <input
                    value={draft.remarks || ""}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [row.month]: { ...current[row.month], remarks: event.target.value }
                      }))
                    }
                  />
                </td>
                <td>
                  <button type="button" className="tiny-button" onClick={() => saveMonth(row)} disabled={savingId === row.month}>
                    {savingId === row.month ? "Saving..." : "Save"}
                  </button>
                  {saveResult ? <small className={saveResult === "Saved" ? "save-result success" : "save-result error"}>{saveResult}</small> : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="muted actuals-upload-note">
        Excel upload will be added next for `SOW + Month` using the same deployment-driven rows.
      </div>
    </div>
  );
}
