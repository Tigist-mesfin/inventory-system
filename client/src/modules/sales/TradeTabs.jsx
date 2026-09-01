import { NavLink } from "react-router-dom";

export default function TradeTabs() {
  return (
    <div className="seg" style={{ marginBottom: 16 }}>
      <NavLink to="/orders" className={({ isActive }) => `btn ${isActive ? "" : "secondary"}`}>
        Customer orders
      </NavLink>
      <NavLink
        to="/sell"
        end
        className={({ isActive }) => `btn ${isActive ? "" : "secondary"}`}
      >
        Sales
      </NavLink>
      <NavLink
        to="/reports"
        className={({ isActive }) => `btn ${isActive ? "" : "secondary"}`}
      >
        Reports
      </NavLink>
      <NavLink
        to="/ledger"
        className={({ isActive }) => `btn ${isActive ? "" : "secondary"}`}
      >
        Debit & credit
      </NavLink>
    </div>
  );
}
