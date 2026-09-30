import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { api, money } from "../../api/client";
import InventoryLoading from "../../components/InventoryLoading";
import PeriodFilter, { periodQuery } from "./PeriodFilter";

function RankTable({ title, rows, empty }) {
  return (
    <section className="card">
      <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>{title}</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Company</th>
              <th>Count</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={row.companyId || index}>
                  <td>{index + 1}</td>
                  <td>
                    <strong>{row.company?.name || "Unknown"}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {row.company?.phone || "—"}
                    </div>
                  </td>
                  <td>{row.count}</td>
                  <td>{money(row.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function AdminPerformancePage() {
  const { filters, setFilters } = useOutletContext();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setError("");
    setData(null);
    api("/api/platform/performance", { query: { ...periodQuery(filters), limit: 15 } })
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
  if (!data) return <InventoryLoading message="Loading performance…" />;

  return (
    <>
      <div className="topbar">
        <div>
          <div className="pill">Performance</div>
          <h1 style={{ margin: "8px 0 4px" }}>Company performance</h1>
          <p className="muted">Top selling and top buying companies by date range.</p>
        </div>
      </div>

      <PeriodFilter value={filters} onChange={setFilters} />

      <div className="admin-perf-grid">
        <RankTable
          title="Top sales companies"
          rows={data.topSalesCompanies || []}
          empty="No completed sales in this period."
        />
        <RankTable
          title="Top buying companies"
          rows={data.topBuyingCompanies || []}
          empty="No purchases in this period."
        />
      </div>
    </>
  );
}
