import { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, login } from "./lib/api";
import { ErrorBoundary } from "./ErrorBoundary.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { ResourcesPage } from "./pages/ResourcesPage.jsx";
import { OpportunitiesPage } from "./pages/OpportunitiesPage.jsx";
import { SowsPage } from "./pages/SowsPage.jsx";
import { AccountsPage } from "./pages/AccountsPage.jsx";
import { ResourceDetailPage } from "./pages/ResourceDetailPage.jsx";
import { OpportunityDetailPage } from "./pages/OpportunityDetailPage.jsx";
import { SowWorkspacePage } from "./pages/SowWorkspacePage.jsx";
import { ActualsWorkbenchPage, SowActualsDetailPage } from "./pages/ActualsWorkbenchPage.jsx";
import { ResourcePlanningPage } from "./pages/ResourcePlanningPage.jsx";
import { FinancialCockpitPage } from "./pages/FinancialCockpitPage.jsx";
import { AdminPage } from "./pages/AdminPage.jsx";
import { AccountFormPage, OpportunityFormPage, ResourceFormPage, SowFormPage } from "./pages/FormPages.jsx";
import { OpportunityRoleFormPage, SowRoleFormPage } from "./pages/RolePages.jsx";

function LoginScreen({ onAuthenticated }) {
  const [email, setEmail] = useState("coo@dcc.local");
  const [password, setPassword] = useState("DccDemo!2026");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      const result = await login({ email, password });
      localStorage.setItem("dcc-token", result.token);
      localStorage.setItem("dcc-user", JSON.stringify(result.user));
      onAuthenticated(result.user);
    } catch (submissionError) {
      setError(submissionError.message);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-panel">
        <div>
          <p className="eyebrow">SAP Service SBU</p>
          <h1>Delivery Command Center</h1>
          <p className="muted">
            First working MVP across foundation, resources, opportunities, and SOW visibility.
          </p>
        </div>
        <form className="card form-grid" onSubmit={handleSubmit} autoComplete="off">
          <label>
            Email
            <input autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Password
            <input autoComplete="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error ? <div className="error-banner">{error}</div> : null}
          <button type="submit">Sign in</button>
          <p className="muted small">Demo login: `coo@dcc.local` / `DccDemo!2026`</p>
        </form>
      </div>
    </div>
  );
}

function Shell() {
  const user = JSON.parse(localStorage.getItem("dcc-user") || "{}");
  const navItems = [
    { to: "/", label: "Command Center" },
    { to: "/accounts", label: "Clients" },
    { to: "/resources", label: "Resources" },
    { to: "/opportunities", label: "Pipeline" },
    { to: "/sows", label: "SOWs" },
    { to: "/actuals", label: "Actuals" },
    { to: "/resource-planning", label: "Resource Planning" },
    { to: "/financials", label: "Financial Cockpit" },
    { to: "/admin", label: "Admin" }
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Delivery Command Center</p>
          <h2>SAP Service SBU</h2>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"} className="nav-link">
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="profile-card">
          <strong>{user.name}</strong>
          <span>{user.role}</span>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Delivery Operations</p>
            <h1>Command Center</h1>
          </div>
          <button
            className="secondary-button"
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
          >
            Sign out
          </button>
        </header>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/accounts/new" element={<AccountFormPage />} />
            <Route path="/accounts/:id/edit" element={<AccountFormPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/resources/new" element={<ResourceFormPage />} />
            <Route path="/resources/:id" element={<ResourceDetailPage />} />
            <Route path="/resources/:id/edit" element={<ResourceFormPage />} />
            <Route path="/opportunities" element={<OpportunitiesPage />} />
            <Route path="/opportunities/new" element={<OpportunityFormPage />} />
            <Route path="/opportunities/:id" element={<OpportunityDetailPage />} />
            <Route path="/opportunities/:id/edit" element={<OpportunityFormPage />} />
            <Route path="/opportunities/:id/roles/new" element={<OpportunityRoleFormPage />} />
            <Route path="/opportunities/:id/roles/:roleId/edit" element={<OpportunityRoleFormPage />} />
            <Route path="/sows" element={<SowsPage />} />
            <Route path="/sows/new" element={<SowFormPage />} />
            <Route path="/sows/:id" element={<SowWorkspacePage />} />
          <Route path="/sows/:id/edit" element={<SowWorkspacePage />} />
            <Route path="/sows/:id/roles/new" element={<SowRoleFormPage />} />
            <Route path="/sows/:id/roles/:roleId/edit" element={<SowRoleFormPage />} />
            <Route path="/sows/:id/roles/:roleId/assign" element={<SowRoleFormPage />} />
            <Route path="/actuals" element={<ActualsWorkbenchPage />} />
            <Route path="/actuals/:id" element={<SowActualsDetailPage />} />
            <Route path="/resource-planning" element={<ResourcePlanningPage />} />
            <Route path="/financials" element={<FinancialCockpitPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default function App() {
  const [authenticatedUser, setAuthenticatedUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("dcc-user") || "null");
    } catch {
      return null;
    }
  });

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch("/auth/me"),
    enabled: Boolean(localStorage.getItem("dcc-token"))
  });

  useEffect(() => {
    if (meQuery.data) {
      localStorage.setItem("dcc-user", JSON.stringify(meQuery.data));
      setAuthenticatedUser(meQuery.data);
    }
  }, [meQuery.data]);

  if (!authenticatedUser && !meQuery.data) {
    return <LoginScreen onAuthenticated={setAuthenticatedUser} />;
  }

  return <Shell />;
}
