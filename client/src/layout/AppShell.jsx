import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { can, canAny, isOwner } from "../auth/access";

const sideLinks = [
  { to: "/", label: "Dashboard" },
  { to: "/ai", label: "AI desk", any: [["sales", "READ"], ["inventory", "READ"], ["finance", "READ"], ["purchasing", "READ"], ["insights", "READ"]] },
  { to: "/stock", label: "Live stock", module: "inventory", action: "READ" },
  { to: "/orders", label: "Customer orders", module: "sales", action: "READ" },
  { to: "/sell", label: "Sales", module: "sales", action: "READ" },
  { to: "/ledger", label: "Debit & credit", any: [["sales", "READ"], ["purchasing", "READ"]] },
  { to: "/expenses", label: "Expenses", module: "finance", action: "READ" },
  { to: "/income-statement", label: "Income statement", module: "finance", action: "READ" },
  { to: "/payment-methods", label: "Payment methods", module: "sales", action: "READ" },
  { to: "/company-profile", label: "Company profile", owner: true },
  { to: "/team", label: "Salesmen", owner: true },
  { to: "/buy", label: "Purchasing", module: "purchasing", action: "READ" },
  { to: "/customers", label: "Customers & suppliers", module: "customers", action: "READ" },
  { to: "/catalog", label: "Products", module: "catalog", action: "READ" },
  { to: "/warehouses", label: "Warehouses", module: "warehouse", action: "READ" },
  { to: "/transfers", label: "Transfers", module: "inventory", action: "READ" },
];

const mobileLinks = [
  { to: "/", label: "Home", icon: "⌂" },
  { to: "/stock", label: "Stock", icon: "▣", module: "inventory", action: "READ" },
  { to: "/buy", label: "Buy", icon: "↓", module: "purchasing", action: "READ" },
  { to: "/sell", label: "Sell", icon: "✎", module: "sales", action: "READ" },
  { to: "/more", label: "More", icon: "⋯" },
];

function allowed(user, link) {
  if (link.owner) return isOwner(user);
  if (link.any) return canAny(user, link.any);
  if (link.module) return can(user, link.module, link.action);
  return true;
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const signOut = async () => {
    await logout();
    navigate("/login");
  };

  const visibleSide = sideLinks.filter((link) => allowed(user, link));
  const visibleMobile = mobileLinks.filter((link) => allowed(user, link));

  return (
    <div className="app-shell">
      <header className="mobile-header">
        <div className="brand">
          <div className="brand-mark">Iv</div>
          <div>
            <strong>{user?.company?.name || "Invontory"}</strong>
            <div className="muted" style={{ color: "#5c6f6c", fontSize: 12 }}>{user?.fullName}</div>
          </div>
        </div>
      </header>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">Iv</div>
          <div>
            <strong>{user?.company?.name || "Invontory"}</strong>
            <div className="muted" style={{ color: "#d8c9a3" }}>
              {user?.role?.name === "SALESMAN" ? "Salesman" : "Company desk"}
            </div>
          </div>
        </div>
        <nav className="nav-links">
          {visibleSide.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === "/"}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ marginTop: "auto" }}>
          <div style={{ marginBottom: 12 }}>{user?.fullName}</div>
          <button className="btn" onClick={signOut}>Sign out</button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
      <nav className="bottom-nav">
        {visibleMobile.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.to === "/"}>
            <span className="nav-icon">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
