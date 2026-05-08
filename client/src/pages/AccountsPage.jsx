import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { can, currentUser } from "../lib/permissions";
import { DataTable, PageHeaderCard, Section } from "../components.jsx";

export function AccountsPage() {
  const navigate = useNavigate();
  const user = currentUser();
  const canCreate = can(user, "clients", "create");
  const canEdit = can(user, "clients", "edit");
  const { data = [], isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => apiFetch("/accounts")
  });

  return (
    <div className="workspace">
      <PageHeaderCard
        eyebrow="Client Master"
        title="Clients"
        subtitle="Manage client master data, region, industry, and primary contacts."
        actions={canCreate ? <button onClick={() => navigate("/accounts/new")}>Add Client</button> : null}
      />
      <Section title="Client Register">
        {isLoading ? (
          <div className="loading">Loading clients...</div>
        ) : (
          <DataTable
            columns={[
              { key: "number", label: "Client Number" },
              { key: "name", label: "Client Name" },
              { key: "status", label: "Status", render: (row) => String(row.status || "ACTIVE").replaceAll("_", " ") },
              { key: "industry", label: "Industry" },
              { key: "region", label: "Region" },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  canEdit ? (
                    <button
                      className="tiny-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/accounts/${row.id}/edit`);
                      }}
                      type="button"
                    >
                      Edit
                    </button>
                  ) : null
                )
              }
            ]}
            rows={data}
            onRowClick={canEdit ? (row) => navigate(`/accounts/${row.id}/edit`) : undefined}
          />
        )}
      </Section>
    </div>
  );
}
