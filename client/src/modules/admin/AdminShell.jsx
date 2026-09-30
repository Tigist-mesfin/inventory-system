import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useState } from "react";
import { SUPER_ADMIN_BASE, SUPER_ADMIN_HOME, SUPER_ADMIN_LOGIN } from "./adminPaths";

const nav = [
  { to: SUPER_ADMIN_HOME, label: "Overview", end: true },
  { to: `${SUPER_ADMIN_BASE}/companies`, label: "All companies" },
  { to: `${SUPER_ADMIN_BASE}/performance`, label: "Performance" },
  { to: `${SUPER_ADMIN_BASE}/owners`, label: "Owners" },
];

export default function AdminShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ period: "this_month" });

  const signOut = async () => {
    await logout();
    navigate(SUPER_ADMIN_LOGIN);
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="brand">
          <div className="brand-mark">SA</div>
          <div>
            <strong>Super Admin</strong>
            <div className="muted">Platform desk</div>
          </div>
        </div>

        <nav className="nav-links admin-nav">
          {nav.map((link) => (
            <NavLink key={link.to} to={link.to} end={Boolean(link.end)}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-foot">
          <div className="muted" style={{ marginBottom: 8, fontSize: 13 }}>
            {user?.fullName || user?.username}
          </div>
          <button type="button" className="btn secondary" onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet context={{ filters, setFilters }} />
      </main>
    </div>
  );
}
