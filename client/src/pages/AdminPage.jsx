import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, deleteJson, patchJson, postJson } from "../lib/api";
import { DataTable, Field, Modal, Section } from "../components.jsx";

const tabs = [
  { key: "skills", label: "SAP Modules" },
  { key: "experienceLevels", label: "Experience Levels" },
  { key: "regions", label: "Regions" },
  { key: "locations", label: "Locations" },
  { key: "currencies", label: "Currencies / FX" },
  { key: "systemConfigs", label: "System Config" },
  { key: "numberRanges", label: "Number Ranges" },
  { key: "appRoles", label: "Roles" },
  { key: "role-permissions", label: "Role Permissions" },
  { key: "users", label: "Users" },
  { key: "audit/logs", label: "Audit Log" }
];

const moduleCatalog = {
  FICO: { name: "Financial Accounting & Controlling", sortOrder: 10 },
  SD: { name: "Sales and Distribution", sortOrder: 20 },
  MM: { name: "Materials Management", sortOrder: 30 },
  ABAP: { name: "ABAP Development", sortOrder: 40 },
  BASIS: { name: "Basis Administration", sortOrder: 50 },
  "S/4HANA": { name: "S/4HANA", sortOrder: 60 },
  EWM: { name: "Extended Warehouse Management", sortOrder: 70 },
  SUCCESSFACTORS: { name: "SuccessFactors", sortOrder: 80 },
  ARIBA: { name: "Ariba", sortOrder: 90 },
  BTP: { name: "Business Technology Platform", sortOrder: 100 }
};

export function AdminPage() {
  const [active, setActive] = useState("skills");
  const [editing, setEditing] = useState(null);
  const [auditFilters, setAuditFilters] = useState({
    text: "",
    entityName: "All Features",
    actionType: "All Actions",
    actor: "All Actors",
    sourceScreen: "All Sources",
    dateFrom: "",
    dateTo: ""
  });
  const isRolePermissions = active === "role-permissions";
  const { data = [], refetch, isLoading } = useQuery({
    queryKey: ["admin", active],
    queryFn: () => apiFetch(`/admin/${active}`),
    enabled: !isRolePermissions
  });

  const isAudit = active === "audit/logs";
  const isSapModules = active === "skills";
  const columns = getColumns(active, setEditing);
  const auditOptions = useMemo(() => ({
    entityNames: ["All Features", ...new Set(data.map((row) => row.entityName || "Unknown"))],
    actionTypes: ["All Actions", ...new Set(data.map((row) => row.actionType || "Unknown"))],
    actors: ["All Actors", ...new Set(data.map((row) => row.actor || "Unknown"))],
    sourceScreens: ["All Sources", ...new Set(data.map((row) => row.sourceScreen || "Unknown"))]
  }), [data]);
  const filteredRows = useMemo(() => {
    if (!isAudit) {
      return data;
    }
    const from = auditFilters.dateFrom ? new Date(`${auditFilters.dateFrom}T00:00:00`) : null;
    const to = auditFilters.dateTo ? new Date(`${auditFilters.dateTo}T23:59:59`) : null;
    return data
      .filter((row) => {
        const rowDate = row.createdAt ? new Date(row.createdAt) : null;
        const text = `${row.number || ""} ${row.entityName || ""} ${row.actionType || ""} ${row.actor || ""} ${row.sourceScreen || ""} ${row.recordId || ""}`.toLowerCase();
        return (
          (!auditFilters.text || text.includes(auditFilters.text.toLowerCase())) &&
          (auditFilters.entityName === "All Features" || (row.entityName || "Unknown") === auditFilters.entityName) &&
          (auditFilters.actionType === "All Actions" || (row.actionType || "Unknown") === auditFilters.actionType) &&
          (auditFilters.actor === "All Actors" || (row.actor || "Unknown") === auditFilters.actor) &&
          (auditFilters.sourceScreen === "All Sources" || (row.sourceScreen || "Unknown") === auditFilters.sourceScreen) &&
          (!from || (rowDate && rowDate >= from)) &&
          (!to || (rowDate && rowDate <= to))
        );
      })
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  }, [auditFilters, data, isAudit]);

  function updateAuditFilter(key, value) {
    setAuditFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="workspace">
      <section className="workspace-header">
        <div>
          <p className="eyebrow">Administration</p>
          <h2>Platform Configuration</h2>
          <p className="muted">Manage SAP modules, FX, system configuration, number ranges, users, roles, and audit logs.</p>
        </div>
      </section>

      <div className="tabs" role="tablist">
        {tabs.map((tab) => (
          <button key={tab.key} className={active === tab.key ? "tab active" : "tab"} onClick={() => { setActive(tab.key); setEditing(null); }} type="button">
            {tab.label}
          </button>
        ))}
      </div>

      <Section
        title={tabs.find((tab) => tab.key === active)?.label}
        actions={!isAudit && !isSapModules && !isRolePermissions ? <button onClick={() => setEditing({})} type="button">Add</button> : null}
      >
        {isAudit ? (
          <div className="admin-audit-filters">
            <input
              placeholder="Search audit, feature, actor..."
              value={auditFilters.text}
              onChange={(event) => updateAuditFilter("text", event.target.value)}
            />
            <select value={auditFilters.entityName} onChange={(event) => updateAuditFilter("entityName", event.target.value)}>
              {auditOptions.entityNames.map((option) => <option key={option}>{option}</option>)}
            </select>
            <select value={auditFilters.actionType} onChange={(event) => updateAuditFilter("actionType", event.target.value)}>
              {auditOptions.actionTypes.map((option) => <option key={option}>{option}</option>)}
            </select>
            <select value={auditFilters.actor} onChange={(event) => updateAuditFilter("actor", event.target.value)}>
              {auditOptions.actors.map((option) => <option key={option}>{option}</option>)}
            </select>
            <select value={auditFilters.sourceScreen} onChange={(event) => updateAuditFilter("sourceScreen", event.target.value)}>
              {auditOptions.sourceScreens.map((option) => <option key={option}>{option}</option>)}
            </select>
            <input type="date" value={auditFilters.dateFrom} onChange={(event) => updateAuditFilter("dateFrom", event.target.value)} />
            <input type="date" value={auditFilters.dateTo} onChange={(event) => updateAuditFilter("dateTo", event.target.value)} />
            <button
              className="secondary-button"
              type="button"
              onClick={() => setAuditFilters({ text: "", entityName: "All Features", actionType: "All Actions", actor: "All Actors", sourceScreen: "All Sources", dateFrom: "", dateTo: "" })}
            >
              Clear
            </button>
          </div>
        ) : null}
        {isRolePermissions ? (
          <RolePermissionsAdmin />
        ) : isLoading ? <div className="loading">Loading...</div> : isSapModules ? (
          <SapModulesAdmin rows={filteredRows} onSaved={refetch} />
        ) : (
          <DataTable columns={columns} rows={filteredRows} />
        )}
      </Section>
      {editing && !isRolePermissions ? (
        <AdminForm
          collection={active}
          record={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refetch();
          }}
        />
      ) : null}
    </div>
  );
}

function SapModulesAdmin({ rows, onSaved }) {
  const modules = useMemo(() => rows.map(normalizeModule).sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code)), [rows]);
  const [expanded, setExpanded] = useState(modules[0]?.id || "");
  const [moduleModal, setModuleModal] = useState(null);
  const [subModuleModal, setSubModuleModal] = useState(null);

  async function saveModule(form) {
    const payload = {
      number: form.number || form.code,
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      description: form.description.trim(),
      sortOrder: Number(form.sortOrder || 0),
      active: form.active === "true",
      subModules: form.subModules || []
    };
    if (form.id) {
      await patchJson(`/admin/skills/${form.id}`, payload);
    } else {
      await postJson("/admin/skills", payload);
    }
    setModuleModal(null);
    await onSaved();
  }

  async function saveSubModule(form) {
    const parent = modules.find((module) => module.id === form.parentId);
    if (!parent) {
      return;
    }
    const nextSubModule = {
      id: form.id || window.crypto?.randomUUID?.() || `${parent.id}-${Date.now()}`,
      code: form.code.trim().toUpperCase(),
      value: form.value || form.name.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      sortOrder: Number(form.sortOrder || 0),
      active: form.active === "true"
    };
    const currentSubModules = parent.subModules || [];
    const exists = currentSubModules.some((item) => item.id === nextSubModule.id);
    const nextSubModules = exists
      ? currentSubModules.map((item) => item.id === nextSubModule.id ? nextSubModule : item)
      : [...currentSubModules, nextSubModule];
    await patchJson(`/admin/skills/${parent.id}`, { subModules: nextSubModules });
    setSubModuleModal(null);
    await onSaved();
  }

  async function deleteSubModule(parent, subModule) {
    const nextSubModules = parent.subModules.filter((item) => item.id !== subModule.id);
    await patchJson(`/admin/skills/${parent.id}`, { subModules: nextSubModules });
    await onSaved();
  }

  async function deleteModule(module) {
    await deleteJson(`/admin/skills/${module.id}`);
    await onSaved();
  }

  return (
    <div className="sap-module-admin">
      <div className="sap-module-toolbar">
        <p className="muted">Manage SAP functional modules and sub-modules for ticket categorization.</p>
        <div className="row-actions">
          <button type="button" onClick={() => setModuleModal(normalizeModule({}))}>Add Module</button>
        </div>
      </div>

      <div className="sap-module-list">
        {modules.map((module) => {
          const isExpanded = expanded === module.id;
          return (
            <div className="sap-module-group" key={module.id}>
              <div className="sap-module-row">
                <button className="icon-button" type="button" onClick={() => setExpanded(isExpanded ? "" : module.id)} aria-label={isExpanded ? "Collapse module" : "Expand module"}>
                  {isExpanded ? "v" : ">"}
                </button>
                <button className="sap-module-code" type="button" onClick={() => setExpanded(isExpanded ? "" : module.id)}>{module.code}</button>
                <strong>{module.displayName}</strong>
                <span className="sap-module-count">{module.subModules.length} sub-modules</span>
                <div className="row-actions">
                  <button className="tiny-button secondary" type="button" onClick={() => setSubModuleModal({ parentId: module.id, sortOrder: module.subModules.length + 1, active: "true" })}>Add Sub-Module</button>
                  <button className="tiny-button" type="button" onClick={() => setModuleModal(module)}>Edit</button>
                  <button className="tiny-button danger" type="button" onClick={() => deleteModule(module)}>Delete</button>
                </div>
              </div>
              {isExpanded ? (
                <div className="sap-submodule-list">
                  {module.subModules.length ? module.subModules.map((subModule) => (
                    <div className="sap-submodule-row" key={subModule.id}>
                      <span className="sap-submodule-icon" aria-hidden="true"></span>
                      <span className="sap-submodule-code">{subModule.code}</span>
                      <span className="sap-submodule-name">{subModule.displayName || subModule.name}</span>
                      <span className={subModule.active ? "status-pill success" : "status-pill muted"}>{subModule.active ? "Active" : "Inactive"}</span>
                      <div className="row-actions">
                        <button className="tiny-button secondary" type="button" onClick={() => saveSubModule({ ...subModule, parentId: module.id, active: String(!subModule.active) })}>{subModule.active ? "Disable" : "Enable"}</button>
                        <button className="tiny-button" type="button" onClick={() => setSubModuleModal({ ...subModule, parentId: module.id, active: String(subModule.active) })}>Edit</button>
                        <button className="tiny-button danger" type="button" onClick={() => deleteSubModule(module, subModule)}>Delete</button>
                      </div>
                    </div>
                  )) : (
                    <div className="empty-state">No sub-modules yet.</div>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {moduleModal ? (
        <SapModuleModal record={moduleModal} onClose={() => setModuleModal(null)} onSubmit={saveModule} />
      ) : null}
      {subModuleModal ? (
        <SapSubModuleModal record={subModuleModal} onClose={() => setSubModuleModal(null)} onSubmit={saveSubModule} />
      ) : null}
    </div>
  );
}

function RolePermissionsAdmin() {
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["admin", "role-permissions", "matrix"],
    queryFn: () => apiFetch("/admin/role-permissions/matrix")
  });
  const roles = data?.roles || [];
  const features = data?.features || [];
  const permissions = data?.permissions || [];
  const [selectedRole, setSelectedRole] = useState("");
  const activeRole = selectedRole || roles[0]?.name || "";
  const [draft, setDraft] = useState({});
  const [message, setMessage] = useState("");

  const rolePermissions = useMemo(() => {
    const matrix = {};
    permissions
      .filter((permission) => permission.roleName === activeRole)
      .forEach((permission) => {
        matrix[`${permission.featureKey}:${permission.action}`] = Boolean(permission.allowed);
      });
    return { ...matrix, ...draft };
  }, [activeRole, draft, permissions]);

  function toggle(featureKey, action) {
    const key = `${featureKey}:${action}`;
    setDraft((current) => ({ ...current, [key]: !rolePermissions[key] }));
    setMessage("");
  }

  async function save() {
    const payload = {
      roleName: activeRole,
      permissions: features.flatMap((feature) =>
        feature.actions.map((action) => ({
          featureKey: feature.key,
          action,
          allowed: Boolean(rolePermissions[`${feature.key}:${action}`])
        }))
      )
    };
    await patchJson("/admin/role-permissions/matrix", payload);
    setDraft({});
    setMessage("Permissions saved. Users should sign out and sign back in to refresh access.");
    await refetch();
  }

  if (isLoading) {
    return <div className="loading">Loading permissions...</div>;
  }

  return (
    <div className="role-permissions-admin">
      <div className="role-permissions-toolbar">
        <p className="muted">Configure screen and feature access by role. These permissions are the production model for Postgres migration.</p>
        <div className="row-actions">
          <select value={activeRole} onChange={(event) => { setSelectedRole(event.target.value); setDraft({}); setMessage(""); }}>
            {roles.map((role) => <option key={role.id} value={role.name}>{role.name}</option>)}
          </select>
          <button type="button" onClick={save} disabled={!activeRole}>Save Permissions</button>
        </div>
      </div>
      {message ? <div className="success-banner">{message}</div> : null}
      <div className="permission-matrix">
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>Category</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {features.map((feature) => (
              <tr key={feature.key}>
                <td>
                  <strong>{feature.name}</strong>
                  <span className="muted small">{feature.key}</span>
                </td>
                <td>{feature.category || "-"}</td>
                <td>
                  <div className="permission-action-grid">
                    {feature.actions.map((action) => {
                      const key = `${feature.key}:${action}`;
                      return (
                        <label key={key} className="permission-toggle">
                          <input type="checkbox" checked={Boolean(rolePermissions[key])} onChange={() => toggle(feature.key, action)} />
                          <span>{action}</span>
                        </label>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SapModuleModal({ record, onClose, onSubmit }) {
  const [form, setForm] = useState({
    id: record.id || "",
    number: record.number || "",
    code: record.code || "",
    name: record.name || "",
    description: record.description || "",
    sortOrder: String(record.sortOrder ?? 0),
    active: String(record.active ?? true),
    subModules: record.subModules || []
  });

  return (
    <Modal title={`${form.id ? "Edit" : "Create"} SAP Module`} onClose={onClose}>
      <form className="form-grid modal-form two-up" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}>
        <Field label="Code *"><input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="MM" required /></Field>
        <Field label="Sort Order"><input type="number" step="any" min="0" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} /></Field>
        <Field label="Name *"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Materials Management" required /></Field>
        <Field label="Description"><input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Optional description" /></Field>
        <Field label="Active">
          <select value={form.active} onChange={(event) => setForm({ ...form, active: event.target.value })}>
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </Field>
        <div className="save-bar inline-save-bar">
          <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
          <button type="submit">{form.id ? "Save" : "Create"}</button>
        </div>
      </form>
    </Modal>
  );
}

function SapSubModuleModal({ record, onClose, onSubmit }) {
  const [form, setForm] = useState({
    parentId: record.parentId,
    id: record.id || "",
    code: record.code || "",
    value: record.value || "",
    name: record.name || "",
    description: record.description || "",
    sortOrder: String(record.sortOrder ?? 0),
    active: String(record.active ?? true)
  });

  return (
    <Modal title={`${form.id ? "Edit" : "Create"} Sub-Module`} onClose={onClose}>
      <form className="form-grid modal-form two-up" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}>
        <Field label="Code *"><input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="INV" required /></Field>
        <Field label="Sort Order"><input type="number" step="any" min="0" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} /></Field>
        <Field label="Name *"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Inventory Management" required /></Field>
        <Field label="Description"><input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Optional description" /></Field>
        <Field label="Active">
          <select value={form.active} onChange={(event) => setForm({ ...form, active: event.target.value })}>
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </Field>
        <div className="save-bar inline-save-bar">
          <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
          <button type="submit">{form.id ? "Save" : "Create"}</button>
        </div>
      </form>
    </Modal>
  );
}

function normalizeModule(record) {
  const inferredCode = inferModuleCode(record);
  const catalog = moduleCatalog[inferredCode] || {};
  const name = cleanModuleName(record.name, inferredCode, catalog.name);
  const subModules = (record.subModules || [])
    .map((item, index) => normalizeSubModule(item, index, inferredCode))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));
  return {
    ...record,
    id: record.id || "",
    number: record.number || "",
    code: inferredCode,
    name: record.name || name,
    displayName: name,
    description: record.description || "",
    sortOrder: Number(record.sortOrder ?? catalog.sortOrder ?? 999),
    active: record.active ?? true,
    subModules
  };
}

function normalizeSubModule(item, index, parentCode) {
  if (typeof item === "string") {
    return {
      id: `${parentCode}-${index}`,
      code: inferSubModuleCode(item, parentCode),
      value: item,
      name: expandSubModuleName(item),
      displayName: expandSubModuleName(item),
      description: "",
      sortOrder: index + 1,
      active: true
    };
  }
  const code = String(item.code || item.name || "").trim().toUpperCase();
  return {
    id: item.id || `${parentCode}-${index}`,
    code,
    value: item.value || item.name || code,
    name: item.name || expandSubModuleName(code),
    displayName: item.name || expandSubModuleName(code),
    description: item.description || "",
    sortOrder: Number(item.sortOrder ?? index + 1),
    active: item.active ?? true
  };
}

function inferModuleCode(record) {
  const raw = String(record.code || record.number || record.name || "").toUpperCase();
  const cleaned = raw.replace(/^SAP\s+/, "").trim();
  if (cleaned.includes("SUCCESS")) return "SUCCESSFACTORS";
  if (cleaned.includes("S/4")) return "S/4HANA";
  return cleaned.split(/\s+/)[0] || "";
}

function cleanModuleName(name, code, fallback) {
  if (!name || String(name).toUpperCase() === `SAP ${code}` || String(name).toUpperCase() === code) {
    return fallback || name || code;
  }
  return name;
}

function inferSubModuleCode(value, parentCode) {
  const raw = String(value).trim();
  if (/^[A-Z0-9/-]{2,12}$/i.test(raw)) {
    return raw.toUpperCase();
  }
  const initials = raw
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 6)
    .toUpperCase();
  return parentCode ? `${parentCode}-${initials || "SUB"}` : initials || "SUB";
}

function expandSubModuleName(value) {
  const names = {
    GL: "General Ledger",
    AP: "Accounts Payable",
    AR: "Accounts Receivable",
    AA: "Asset Accounting",
    CO: "Controlling / Cost Center",
    INV: "Inventory Management",
    PROC: "Procurement",
    PO: "Purchase Orders",
    PR: "Purchase Requisitions",
    VM: "Vendor Management",
    "MM-PR": "Procurement / Purchase Orders",
    "MM-GR": "Goods Receipt / Goods Issue",
    "MM-IM": "Inventory Management"
  };
  return names[String(value).toUpperCase()] || value;
}

function getColumns(collection, setEditing) {
  const editColumn = {
    key: "actions",
    label: "Actions",
    render: (row) => <button className="tiny-button" onClick={() => setEditing(row)} type="button">Edit</button>
  };

  if (collection === "currencies") {
    return [
      { key: "code", label: "Code" },
      { key: "name", label: "Currency" },
      { key: "fxToUsd", label: "FX to USD" },
      { key: "active", label: "Active", render: (row) => String(row.active) },
      editColumn
    ];
  }
  if (collection === "regions") {
    return [
      { key: "code", label: "Code" },
      { key: "name", label: "Region" },
      { key: "sortOrder", label: "Sort" },
      { key: "active", label: "Active", render: (row) => String(row.active) },
      editColumn
    ];
  }
  if (collection === "locations") {
    return [
      { key: "name", label: "Location" },
      { key: "locationType", label: "Type" },
      { key: "defaultCompensationCurrency", label: "Default Comp Currency" },
      { key: "defaultPaymentCurrency", label: "Default Pay Currency" },
      { key: "active", label: "Active", render: (row) => String(row.active) },
      editColumn
    ];
  }
  if (collection === "experienceLevels") {
    return [
      { key: "name", label: "Experience Level" },
      { key: "fromYears", label: "From Years" },
      { key: "toYears", label: "To Years" },
      { key: "active", label: "Active", render: (row) => String(row.active) },
      editColumn
    ];
  }
  if (collection === "systemConfigs") {
    return [
      { key: "key", label: "Key" },
      { key: "value", label: "Value" },
      { key: "description", label: "Description" },
      editColumn
    ];
  }
  if (collection === "numberRanges") {
    return [
      { key: "objectType", label: "Object" },
      { key: "prefix", label: "Prefix" },
      { key: "sequenceLength", label: "Length" },
      { key: "nextNumber", label: "Next" },
      { key: "includeYear", label: "Year", render: (row) => String(row.includeYear) },
      editColumn
    ];
  }
  if (collection === "appRoles") {
    return [
      { key: "name", label: "Role" },
      { key: "canViewCost", label: "Cost", render: (row) => String(row.canViewCost) },
      { key: "canViewMargin", label: "Margin", render: (row) => String(row.canViewMargin) },
      { key: "active", label: "Active", render: (row) => String(row.active) },
      editColumn
    ];
  }
  if (collection === "users") {
    return [
      { key: "number", label: "User Number" },
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "role", label: "Role" },
      editColumn
    ];
  }
  return [
    { key: "number", label: "Audit" },
    { key: "entityName", label: "Feature" },
    { key: "actionType", label: "Action" },
    { key: "actor", label: "Actor" },
    { key: "sourceScreen", label: "Source" },
    { key: "recordId", label: "Record ID" },
    { key: "createdAt", label: "Time", render: (row) => row.createdAt?.slice(0, 16) }
  ];
}

function AdminForm({ collection, record, onClose, onSaved }) {
  const [form, setForm] = useState(normalizeForm(collection, record));
  const [error, setError] = useState("");
  const { data: roleOptions = [] } = useQuery({
    queryKey: ["admin", "appRoles", "options"],
    queryFn: () => apiFetch("/admin/appRoles"),
    enabled: collection === "users"
  });
  const { data: currencyOptions = [] } = useQuery({
    queryKey: ["admin", "currencies", "options"],
    queryFn: () => apiFetch("/admin/currencies"),
    enabled: collection === "locations"
  });
  const activeRoleOptions = roleOptions.filter((role) => role.active !== false);
  const activeCurrencyOptions = currencyOptions.filter((currency) => currency.active !== false);

  function update(key, value) {
    setForm({ ...form, [key]: value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      const payload = denormalizeForm(collection, form);
      if (record.id) {
        await patchJson(`/admin/${collection}/${record.id}`, payload);
      } else {
        await postJson(`/admin/${collection}`, payload);
      }
      onSaved();
    } catch (saveError) {
      setError(saveError.message || "Unable to save.");
    }
  }

  return (
    <Modal title={`${record.id ? "Edit" : "Add"} ${collectionLabel(collection)}`} onClose={onClose}>
      <form className="form-grid modal-form two-up" onSubmit={handleSubmit}>
        {error ? <div className="error-banner">{error}</div> : null}
        {Object.keys(form).map((key) => (
          <Field key={key} label={fieldLabel(key)}>
            {isBooleanField(key) ? (
              <select value={form[key]} onChange={(event) => update(key, event.target.value)}>
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            ) : collection === "users" && key === "role" ? (
              <select value={form[key]} onChange={(event) => update(key, event.target.value)} required>
                <option value="">Select role</option>
                {activeRoleOptions.map((role) => (
                  <option key={role.id || role.name} value={role.name}>{role.name}</option>
                ))}
              </select>
            ) : collection === "locations" && ["defaultCompensationCurrency", "defaultPaymentCurrency"].includes(key) ? (
              <select value={form[key]} onChange={(event) => update(key, event.target.value)}>
                <option value="">None</option>
                {activeCurrencyOptions.map((currency) => (
                  <option key={currency.id || currency.code} value={currency.code}>{currency.code} - {currency.name}</option>
                ))}
              </select>
            ) : key === "locationType" ? (
              <select value={form[key]} onChange={(event) => update(key, event.target.value)}>
                <option>Offshore</option>
                <option>Onsite</option>
                <option>Nearshore</option>
              </select>
            ) : (
              <input type={isNumberField(key) ? "number" : "text"} min={isNumberField(key) ? "0" : undefined} step={isNumberField(key) ? "any" : undefined} value={form[key]} onChange={(event) => update(key, event.target.value)} />
            )}
          </Field>
        ))}
        <div className="save-bar inline-save-bar">
          <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
          <button type="submit">Save</button>
        </div>
      </form>
    </Modal>
  );
}

function collectionLabel(collection) {
  const labels = {
    experienceLevels: "Experience Level",
    currencies: "Currency / FX",
    regions: "Region",
    locations: "Location",
    systemConfigs: "System Config",
    numberRanges: "Number Range",
    appRoles: "Role",
    users: "User"
  };
  return labels[collection] || collection;
}

function fieldLabel(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase());
}

function isBooleanField(key) {
  return ["active", "canViewCost", "canViewMargin", "includeYear"].includes(key);
}

function isNumberField(key) {
  return ["fromYears", "toYears", "fxToUsd", "sequenceLength", "nextNumber", "sortOrder"].includes(key);
}

function normalizeForm(collection, record) {
  if (collection === "experienceLevels") return { name: record.name || "", fromYears: String(record.fromYears ?? 0), toYears: String(record.toYears ?? 0), active: String(record.active ?? true) };
  if (collection === "currencies") return { code: record.code || "", name: record.name || "", fxToUsd: String(record.fxToUsd ?? 1), active: String(record.active ?? true) };
  if (collection === "regions") return { code: record.code || "", name: record.name || "", sortOrder: String(record.sortOrder ?? 0), active: String(record.active ?? true) };
  if (collection === "locations") return {
    name: record.name || "",
    locationType: record.locationType || "Offshore",
    defaultCompensationCurrency: record.defaultCompensationCurrency || "",
    defaultPaymentCurrency: record.defaultPaymentCurrency || "",
    active: String(record.active ?? true)
  };
  if (collection === "systemConfigs") return { key: record.key || "", value: record.value || "", description: record.description || "" };
  if (collection === "numberRanges") return { objectType: record.objectType || "", prefix: record.prefix || "", sequenceLength: String(record.sequenceLength ?? 6), nextNumber: String(record.nextNumber ?? 1), includeYear: String(record.includeYear ?? true), active: String(record.active ?? true) };
  if (collection === "appRoles") return { name: record.name || "", canViewCost: String(record.canViewCost ?? false), canViewMargin: String(record.canViewMargin ?? false), active: String(record.active ?? true) };
  return { number: record.number || "", name: record.name || "", email: record.email || "", role: record.role || "", canViewCost: String(record.canViewCost ?? false), canViewMargin: String(record.canViewMargin ?? false) };
}

function denormalizeForm(collection, form) {
  if (collection === "experienceLevels") return { ...form, fromYears: Number(form.fromYears), toYears: Number(form.toYears), active: form.active === "true" };
  if (collection === "currencies") return { ...form, fxToUsd: Number(form.fxToUsd), active: form.active === "true" };
  if (collection === "regions") return { ...form, sortOrder: Number(form.sortOrder), active: form.active === "true" };
  if (collection === "locations") return { ...form, active: form.active === "true" };
  if (collection === "numberRanges") return { ...form, sequenceLength: Number(form.sequenceLength), nextNumber: Number(form.nextNumber), includeYear: form.includeYear === "true", active: form.active === "true" };
  if (collection === "appRoles") return { ...form, canViewCost: form.canViewCost === "true", canViewMargin: form.canViewMargin === "true", active: form.active === "true" };
  if (collection === "users") return { ...form, canViewCost: form.canViewCost === "true", canViewMargin: form.canViewMargin === "true" };
  return form;
}
