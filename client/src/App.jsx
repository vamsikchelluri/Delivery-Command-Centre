import { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, login, patchJson } from "./lib/api";
import { Field, Modal } from "./components.jsx";
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
import { can, isPlatformAdmin } from "./lib/permissions.js";

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
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const navItems = [
    { to: "/", label: "Command Center", allowed: can(user, "commandCenter", "view") },
    { to: "/accounts", label: "Clients", allowed: can(user, "clients", "view") },
    { to: "/resources", label: "Resources", allowed: can(user, "resources", "view") },
    { to: "/opportunities", label: "Pipeline", allowed: can(user, "opportunities", "view") },
    { to: "/sows", label: "SOWs", allowed: can(user, "sows", "view") },
    { to: "/actuals", label: "Actuals", allowed: can(user, "actuals", "view") },
    { to: "/resource-planning", label: "Resource Planning", allowed: can(user, "resourcePlanning", "view") },
    { to: "/financials", label: "Financial Cockpit", allowed: can(user, "financialCockpit", "view") },
    { to: "/admin", label: "Admin", allowed: isPlatformAdmin(user) }
  ].filter((item) => item.allowed);

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
          <button className="tiny-button secondary" type="button" onClick={() => setShowPasswordModal(true)}>Change Password</button>
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
            <Route path="/" element={<RequireAccess user={user} feature="commandCenter"><DashboardPage /></RequireAccess>} />
            <Route path="/accounts" element={<RequireAccess user={user} feature="clients"><AccountsPage /></RequireAccess>} />
            <Route path="/accounts/new" element={<RequireAccess user={user} feature="clients" action="create"><AccountFormPage /></RequireAccess>} />
            <Route path="/accounts/:id/edit" element={<RequireAccess user={user} feature="clients" action="edit"><AccountFormPage /></RequireAccess>} />
            <Route path="/resources" element={<RequireAccess user={user} feature="resources"><ResourcesPage /></RequireAccess>} />
            <Route path="/resources/new" element={<RequireAccess user={user} feature="resources" action="create"><ResourceFormPage /></RequireAccess>} />
            <Route path="/resources/:id" element={<RequireAccess user={user} feature="resources"><ResourceDetailPage /></RequireAccess>} />
            <Route path="/resources/:id/edit" element={<RequireAccess user={user} feature="resources" action="edit"><ResourceFormPage /></RequireAccess>} />
            <Route path="/opportunities" element={<RequireAccess user={user} feature="opportunities"><OpportunitiesPage /></RequireAccess>} />
            <Route path="/opportunities/new" element={<RequireAccess user={user} feature="opportunities" action="create"><OpportunityFormPage /></RequireAccess>} />
            <Route path="/opportunities/:id" element={<RequireAccess user={user} feature="opportunities"><OpportunityDetailPage /></RequireAccess>} />
            <Route path="/opportunities/:id/edit" element={<RequireAccess user={user} feature="opportunities" action="edit"><OpportunityFormPage /></RequireAccess>} />
            <Route path="/opportunities/:id/roles/new" element={<RequireAccess user={user} feature="opportunities" action="edit"><OpportunityRoleFormPage /></RequireAccess>} />
            <Route path="/opportunities/:id/roles/:roleId/edit" element={<RequireAccess user={user} feature="opportunities" action="edit"><OpportunityRoleFormPage /></RequireAccess>} />
            <Route path="/sows" element={<RequireAccess user={user} feature="sows"><SowsPage /></RequireAccess>} />
            <Route path="/sows/new" element={<RequireAccess user={user} feature="sows" action="create"><SowFormPage /></RequireAccess>} />
            <Route path="/sows/:id" element={<RequireAccess user={user} feature="sows"><SowWorkspacePage /></RequireAccess>} />
            <Route path="/sows/:id/edit" element={<RequireAccess user={user} feature="sows" action="edit"><SowWorkspacePage /></RequireAccess>} />
            <Route path="/sows/:id/roles/new" element={<RequireAccess user={user} feature="sows" action="edit"><SowRoleFormPage /></RequireAccess>} />
            <Route path="/sows/:id/roles/:roleId/edit" element={<RequireAccess user={user} feature="sows" action="edit"><SowRoleFormPage /></RequireAccess>} />
            <Route path="/sows/:id/roles/:roleId/assign" element={<RequireAccess user={user} feature="sows" action="edit"><SowRoleFormPage /></RequireAccess>} />
            <Route path="/actuals" element={<RequireAccess user={user} feature="actuals"><ActualsWorkbenchPage /></RequireAccess>} />
            <Route path="/actuals/:id" element={<RequireAccess user={user} feature="actuals"><SowActualsDetailPage /></RequireAccess>} />
            <Route path="/resource-planning" element={<RequireAccess user={user} feature="resourcePlanning"><ResourcePlanningPage /></RequireAccess>} />
            <Route path="/financials" element={<RequireAccess user={user} feature="financialCockpit"><FinancialCockpitPage /></RequireAccess>} />
            <Route path="/admin" element={<RequireAccess user={user} platformAdmin><AdminPage /></RequireAccess>} />
          </Routes>
        </ErrorBoundary>
      </main>
      {showPasswordModal ? <ChangePasswordModal onClose={() => setShowPasswordModal(false)} /> : null}
    </div>
  );
}

function RequireAccess({ user, feature, action = "view", platformAdmin = false, children }) {
  const allowed = platformAdmin ? isPlatformAdmin(user) : can(user, feature, action);
  if (!allowed) {
    return (
      <section className="workspace-header">
        <div>
          <p className="eyebrow">Access Control</p>
          <h2>Access denied</h2>
          <p className="muted">Your role is not authorized for this screen or action.</p>
        </div>
      </section>
    );
  }
  return children;
}

function ChangePasswordModal({ onClose }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (form.newPassword !== form.confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    try {
      await patchJson("/auth/change-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      });
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setMessage("Password changed.");
    } catch (saveError) {
      setError(saveError.message || "Unable to change password.");
    }
  }

  return (
    <Modal title="Change Password" onClose={onClose}>
      <form className="form-grid modal-form" onSubmit={save}>
        {error ? <div className="error-banner">{error}</div> : null}
        {message ? <div className="success-banner">{message}</div> : null}
        <Field label="Current Password">
          <input type="password" value={form.currentPassword} onChange={(event) => update("currentPassword", event.target.value)} required />
        </Field>
        <Field label="New Password">
          <input type="password" minLength="8" value={form.newPassword} onChange={(event) => update("newPassword", event.target.value)} required />
        </Field>
        <Field label="Confirm New Password">
          <input type="password" minLength="8" value={form.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} required />
        </Field>
        <div className="save-bar inline-save-bar">
          <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
          <button type="submit">Save Password</button>
        </div>
      </form>
    </Modal>
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
