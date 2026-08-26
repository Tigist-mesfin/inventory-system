import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { can, canAny, isOwner } from "../../auth/access";

const items = [
  { to: "/ai", title: "AI desk", copy: "Ask about sales, profit, stock, and warehouses in English, Amharic, or Afaan Oromo", any: [["sales", "READ"], ["inventory", "READ"], ["finance", "READ"], ["purchasing", "READ"], ["insights", "READ"]] },
  { to: "/orders", title: "Customer orders", copy: "Orders staff record for customers, then approve to sell", module: "sales", action: "READ" },
  { to: "/sell", title: "Sales", copy: "Record counter sales and filter history", module: "sales", action: "READ" },
  { to: "/ledger", title: "Debit & credit", copy: "Unpaid customer balances and supplier amounts to pay", any: [["sales", "READ"], ["purchasing", "READ"]] },
  { to: "/expenses", title: "Expenses", copy: "Record rent, salaries, and other costs, then report by date", module: "finance", action: "READ" },
  { to: "/income-statement", title: "Income statement", copy: "Sales, cost of goods, expenses, and net profit", module: "finance", action: "READ" },
  { to: "/buy", title: "Purchasing", copy: "Supplier orders, receipts, and payables", module: "purchasing", action: "READ" },
  { to: "/catalog", title: "Items", copy: "Register items: name, unit, and selling price", module: "catalog", action: "READ" },
  { to: "/warehouses", title: "Warehouses", copy: "Register a store by name", module: "warehouse", action: "READ" },
  { to: "/team", title: "Salesmen", copy: "Create staff, assign stores, and grant module access", owner: true },
  { to: "/transfers", title: "Transfers", copy: "Move stock between branches", module: "inventory", action: "READ" },
  { to: "/payment-methods", title: "Payment methods", copy: "Cash, transfer, Telebirr, and other methods", module: "sales", action: "READ" },
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
        <button className="btn" onClick={logout}>Sign out</button>
      </div>
    </>
  );
}
