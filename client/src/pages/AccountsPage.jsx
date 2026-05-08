import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { DataTable, PageHeaderCard, Section } from "../components.jsx";

export function AccountsPage() {
  const navigate = useNavigate();
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
        actions={<button onClick={() => navigate("/accounts/new")}>Add Client</button>}
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
                )
              }
            ]}
            rows={data}
            onRowClick={(row) => navigate(`/accounts/${row.id}/edit`)}
          />
        )}
      </Section>
    </div>
  );
}
