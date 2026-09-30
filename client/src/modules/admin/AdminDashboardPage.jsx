import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { api, money } from "../../api/client";
import InventoryLoading from "../../components/InventoryLoading";
import PeriodFilter, { periodQuery } from "./PeriodFilter";
import { SUPER_ADMIN_BASE } from "./adminPaths";
import { telHref } from "./phoneCall";

const dateText = (value) => {
  if (!value) return "—";
  return String(value).slice(0, 10);
};

export default function AdminDashboardPage() {
  const { filters, setFilters } = useOutletContext();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setError("");
    setData(null);
    api("/api/platform/overview", { query: periodQuery(filters) })
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [filters]);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <InventoryLoading message="Loading platform overview…" />;

  const totals = data.totals || {};

  return (
    <>
      <div className="topbar">
        <div>
          <div className="pill">Platform</div>
          <h1 style={{ margin: "8px 0 4px" }}>Super admin dashboard</h1>
          <p className="muted">Registered companies, salesmen, and platform sales totals.</p>
        </div>
        <div className="row-actions">
          <Link className="btn secondary" to={`${SUPER_ADMIN_BASE}/companies`}>
            All companies
          </Link>
          <Link className="btn secondary" to={`${SUPER_ADMIN_BASE}/performance`}>
            Performance
          </Link>
        </div>
      </div>

      <PeriodFilter value={filters} onChange={setFilters} />

      <section className="grid stats">
        <article className="card stat-card">
          <span className="muted">Total companies</span>
          <b>{totals.companies || 0}</b>
          <small>All registered</small>
        </article>
        <article className="card stat-card">
          <span className="muted">Registered in period</span>
          <b>{totals.companiesInPeriod || 0}</b>
          <small>{data.period || "selected range"}</small>
        </article>
        <article className="card stat-card">
          <span className="muted">Total salesmen</span>
          <b>{totals.salesmen || 0}</b>
          <small>Across all companies</small>
        </article>
        <article className="card stat-card">
          <span className="muted">Sales total</span>
          <b>{money(totals.salesTotal)}</b>
          <small>{totals.salesCount || 0} completed sales</small>
        </article>
        <article className="card stat-card">
          <span className="muted">Purchases total</span>
          <b>{money(totals.purchaseTotal)}</b>
          <small>{totals.purchaseCount || 0} purchase orders</small>
        </article>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="topbar" style={{ marginBottom: 8 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Recent registered companies</h2>
          <Link className="btn chip secondary" to={`${SUPER_ADMIN_BASE}/companies`}>
            View all
          </Link>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Phone</th>
                <th>Warehouses</th>
                <th>Status</th>
                <th>Registered</th>
                <th>Call</th>
              </tr>
            </thead>
            <tbody>
              {(data.recentCompanies || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    No companies in this period.
                  </td>
                </tr>
              ) : (
                data.recentCompanies.map((company) => {
                  const call = telHref(company.phone);
                  return (
                    <tr key={company.id}>
                      <td>
                        <strong>{company.name}</strong>
                      </td>
                      <td>{company.phone || "—"}</td>
                      <td>{company.warehouseCount || 0}</td>
                      <td>{company.status}</td>
                      <td>{dateText(company.createdAt)}</td>
                      <td>
                        {call ? (
                          <a className="btn chip" href={call}>
                            Call
                          </a>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
