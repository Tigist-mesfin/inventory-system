import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { can, canAny, isOwner } from "../../auth/access";

const items = [
  { to: "/buy", title: "Buy", copy: "Supplier orders, receipts, and payables", module: "purchasing", action: "READ" },
  { to: "/sell", title: "Sales", copy: "Record counter sales and filter history", module: "sales", action: "READ" },
  { to: "/ai", title: "AI analysis", copy: "Daily/monthly AI summaries, profit & loss items, and insights", module: "insights", action: "READ" },
  { to: "/ai/assistant", title: "AI assistant", copy: "Ask free-form questions about sales, stock, and profit", module: "insights", action: "READ" },
  { to: "/stock", title: "Live stock", copy: "On-hand quantities by store", module: "inventory", action: "READ" },
  { to: "/ledger", title: "Debit & credit", copy: "Unpaid customer balances and supplier amounts to pay", any: [["sales", "READ"], ["purchasing", "READ"]] },
  { to: "/orders", title: "Customer orders", copy: "Register orders, print and share proformas, then approve to sell", module: "sales", action: "READ" },
  { to: "/customers", title: "Customers & suppliers", copy: "Register customers and suppliers", module: "customers", action: "READ" },
  { to: "/customers/wallets", title: "Customer wallets", copy: "Recharge balances and see deposits by method, reason, and date", module: "customers", action: "READ" },
  { to: "/income-statement", title: "Income statement", copy: "Sales, cost of goods, expenses, other income, and net profit", module: "finance", action: "READ" },
  { to: "/team", title: "Salesmen", copy: "Create staff, assign stores, and grant module access", owner: true },
  { to: "/catalog", title: "Products", copy: "Register items: name, unit, and selling price", module: "catalog", action: "READ" },
  { to: "/vat", title: "VAT data", copy: "VAT collected on sales and paid on purchases", module: "insights", action: "READ" },
  { to: "/reports", title: "Reports", copy: "Filter by date, item, and supplier; export sales and purchase reports", module: "insights", action: "READ" },
  { to: "/expenses", title: "Expenses", copy: "Record rent, salaries, and other costs, then report by date", module: "finance", action: "READ" },
  { to: "/other-income", title: "Other income", copy: "Record non-sales income by who paid, reason, amount, and payment method", module: "finance", action: "READ" },
  { to: "/warehouses", title: "Warehouses", copy: "Register a store by name", module: "warehouse", action: "READ" },
  { to: "/transfers", title: "Transfers", copy: "Move stock between branches", module: "inventory", action: "UPDATE" },
  { to: "/payment-methods", title: "Payment methods", copy: "Cash, transfer, Telebirr, and other methods", owner: true },
  { to: "/company-profile", title: "Company profile", copy: "Name and contact printed on invoices", owner: true },
];

export default function MorePage() {
  const { user, logout } = useAuth();
  const visible = items.filter((item) => {
    if (item.owner) return isOwner(user);
    if (item.any) return canAny(user, item.any);
    return can(user, item.module, item.action);
  });
  return (
    <>
      <h1>More</h1>
      <div className="grid">
        {visible.map((item) => (
          <Link key={item.to} to={item.to} className="card">
            <h3>{item.title}</h3>
            <p className="muted">{item.copy}</p>
          </Link>
        ))}
        {visible.length === 0 ? (
          <p className="muted">No modules assigned. Ask the company owner for access.</p>
        ) : null}
        <button className="btn" onClick={logout}>
          Sign out
        </button>
      </div>
    </>
  );
}
