import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { api } from "../../api/client";
import InventoryLoading from "../../components/InventoryLoading";
import PeriodFilter, { periodQuery } from "./PeriodFilter";

const dateText = (value) => {
  if (!value) return "—";
  return String(value).slice(0, 10);
};

export default function AdminOwnersPage() {
  const { filters, setFilters } = useOutletContext();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setError("");
    setData(null);
    api("/api/platform/owners", { query: periodQuery(filters) })
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
  if (!data) return <InventoryLoading message="Loading owners…" />;

  const owners = data.owners || [];

  return (
    <>
      <div className="topbar">
        <div>
          <div className="pill">Owners</div>
          <h1 style={{ margin: "8px 0 4px" }}>Company owners</h1>
          <p className="muted">Owners registered in the selected date range.</p>
        </div>
      </div>

      <PeriodFilter value={filters} onChange={setFilters} />

      <section className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Owner</th>
                <th>Username</th>
                <th>Phone</th>
                <th>Company</th>
                <th>Status</th>
                <th>Registered</th>
                <th>Last login</th>
              </tr>
            </thead>
            <tbody>
              {owners.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted">
                    No owners in this period.
                  </td>
                </tr>
              ) : (
                owners.map((owner) => (
                  <tr key={owner.id}>
                    <td>
                      <strong>{owner.fullName || "—"}</strong>
                    </td>
                    <td>{owner.username}</td>
                    <td>{owner.phone || "—"}</td>
                    <td>
                      {owner.company?.name || "—"}
                      {owner.company?.createdAt ? (
                        <div className="muted" style={{ fontSize: 12 }}>
                          Co. {dateText(owner.company.createdAt)}
                        </div>
                      ) : null}
                    </td>
                    <td>{owner.status}</td>
                    <td>{dateText(owner.createdAt)}</td>
                    <td>{dateText(owner.lastLoginAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
