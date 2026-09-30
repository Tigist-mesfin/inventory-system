import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import { can, canAny, hasAnyModuleAccess, isOwner } from "../auth/access";
import SetupGuide from "../modules/onboarding/SetupGuide";
import HelpMarqueeBanner from "../modules/onboarding/HelpMarqueeBanner";

/**
 * Each item maps to ONE module (or owner-only).
 * Do not use broad ORs across unrelated modules — that made salesmen see VAT/Reports/AI
 * just because they had sales:READ.
 */
const sideLinks = [
  { to: "/", label: "Dashboard", home: true },
  { to: "/buy", label: "Buy", module: "purchasing", action: "READ" },
  { to: "/sell", label: "Sales", module: "sales", action: "READ" },
  { to: "/ai", label: "AI analysis", module: "insights", action: "READ" },
  { to: "/ai/assistant", label: "AI assistant", module: "insights", action: "READ" },
  { to: "/orders", label: "Customer Orders", module: "sales", action: "READ" },
  { to: "/stock", label: "Live stock", module: "inventory", action: "READ" },
  {
    to: "/ledger",
    label: "Debit & credit",
    any: [
      ["sales", "READ"],
      ["purchasing", "READ"],
    ],
  },
  { to: "/customers", label: "Customers & suppliers", module: "customers", action: "READ" },
  { to: "/customers/wallets", label: "Customer wallets", module: "customers", action: "READ" },
  { to: "/income-statement", label: "Income statement", module: "finance", action: "READ" },
  { to: "/team", label: "Salesmen", owner: true },
  { to: "/catalog", label: "Products", module: "catalog", action: "READ" },
  { to: "/vat", label: "VAT data", module: "insights", action: "READ" },
  { to: "/reports", label: "Reports", module: "insights", action: "READ" },
  { to: "/expenses", label: "Expenses", module: "finance", action: "READ" },
  { to: "/other-income", label: "Other income", module: "finance", action: "READ" },
  { to: "/warehouses", label: "Warehouses", module: "warehouse", action: "READ" },
  { to: "/transfers", label: "Transfers", module: "inventory", action: "UPDATE" },
  { to: "/payment-methods", label: "Payment methods", owner: true },
  { to: "/company-profile", label: "Company profile", owner: true },
];

const mobileLinks = [
  { to: "/", label: "Home", icon: "⌂", home: true },
  { to: "/buy", label: "Buy", icon: "↓", module: "purchasing", action: "READ" },
  { to: "/sell", label: "Sell", icon: "✎", module: "sales", action: "READ" },
  { to: "/stock", label: "Stock", icon: "▣", module: "inventory", action: "READ" },
  { to: "/more", label: "More", icon: "⋯", always: true },
];

function allowed(user, link) {
  if (!user) return false;
  if (link.always) return true;
  if (link.owner) return isOwner(user);
  if (link.home) return isOwner(user) || hasAnyModuleAccess(user);
  if (link.any) return canAny(user, link.any);
  if (link.module) return can(user, link.module, link.action);
  return false;
}

export default function AppShell() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    refreshUser?.();
  }, [refreshUser]);

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
            <div className="muted" style={{ color: "#5c6f6c", fontSize: 12 }}>
              {user?.fullName}
            </div>
          </div>
        </div>
      </header>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">Iv</div>
          <div>
            <strong>{user?.company?.name || "Invontory"}</strong>
            <div className="muted">
              {user?.role?.name === "SALESMAN" ? "Salesman" : "Company desk"}
            </div>
          </div>
        </div>
        <nav className="nav-links">
          {visibleSide.length === 0 ? (
            <p className="muted" style={{ padding: "8px 12px", fontSize: 13 }}>
              No modules assigned. Ask the company owner for access.
            </p>
          ) : (
            visibleSide.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/" || link.to === "/ai" || link.to === "/customers"}
              >
                {link.label}
              </NavLink>
            ))
          )}
        </nav>
        <div style={{ marginTop: "auto" }}>
          <div style={{ marginBottom: 12 }}>{user?.fullName}</div>
          <button className="btn" onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        <HelpMarqueeBanner />
        <Outlet />
      </main>
      <SetupGuide />
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
