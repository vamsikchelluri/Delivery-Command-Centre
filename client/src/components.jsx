export function StatCard({ label, value, note, onClick }) {
  return (
    <div
      className={onClick ? "stat-card clickable-card" : "stat-card"}
      onClick={onClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onClick();
        }
      }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <span className="label">{label}</span>
      <strong>{value}</strong>
      {note ? <small>{note}</small> : null}
    </div>
  );
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isNumericColumn(column) {
  const name = `${column.key || ""} ${column.label || ""}`.toLowerCase();
  return [
    "amount",
    "allocation",
    "available",
    "bill",
    "cost",
    "count",
    "deployed",
    "gross",
    "hours",
    "margin",
    "percent",
    "pipeline",
    "rate",
    "revenue",
    "total",
    "value",
    "variance",
    "%"
  ].some((token) => name.includes(token));
}

function isStateColumn(column) {
  const name = `${column.key || ""} ${column.label || ""}`.toLowerCase();
  return ["status", "stage", "priority", "health"].some((token) => name.includes(token));
}

export function Section({ title, actions, children }) {
  return (
    <section className="section">
      <div className="card section-card">
        <div className="section-header">
          <h2>{title}</h2>
          {actions}
        </div>
        <div className="section-body">
          {children}
        </div>
      </div>
    </section>
  );
}

export function DataTable({ columns, rows, onRowClick }) {
  if (!rows.length) {
    return <div className="empty-state">No records match your filters.</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th className={isNumericColumn(column) ? "numeric-cell" : undefined} key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id || row.number}
              className={onRowClick ? "clickable-row" : undefined}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => {
                const value = column.render ? column.render(row) : row[column.key];
                const shouldChip = isStateColumn(column) && (typeof value === "string" || typeof value === "number");
                return (
                  <td className={isNumericColumn(column) ? "numeric-cell" : undefined} key={column.key}>
                    {shouldChip ? <span className={`status-chip status-${slugify(value)}`}>{value}</span> : value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EmptyState({ message }) {
  return <div className="empty-state">{message}</div>;
}

export function PageHeaderCard({ eyebrow, title, subtitle, actions }) {
  return (
    <section className="workspace-header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {subtitle ? <p className="muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="status-stack">{actions}</div> : null}
    </section>
  );
}

export function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="modal-card" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="secondary-button" onClick={onClose} type="button">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function InlinePanel({ title, children, onClose }) {
  return (
    <section className="inline-panel">
      <div className="modal-header">
        <h2>{title}</h2>
        <button className="secondary-button" onClick={onClose} type="button">Close</button>
      </div>
      {children}
    </section>
  );
}

export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
