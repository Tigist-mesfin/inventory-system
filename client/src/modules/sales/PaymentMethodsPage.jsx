import { useEffect, useState } from "react";
import { api } from "../../api/client";
import InventoryLoading from "../../components/InventoryLoading";

export default function PaymentMethodsPage() {
  const [rows, setRows] = useState([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  const load = () =>
    api("/api/payment-methods").then((res) => setRows(res.data.paymentMethods || []));

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setReady(true));
  }, []);

  const add = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await api("/api/payment-methods", { method: "POST", body: { name } });
      setName("");
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggle = async (row) => {
    if (row.isDefault) return;
    setError("");
    try {
      await api(`/api/payment-methods/${row.id}`, {
        method: "PATCH",
        body: { status: row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" },
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!ready) return <InventoryLoading message="Loading inventory..." />;

  const defaults = rows.filter((row) => row.isDefault);
  const custom = rows.filter((row) => !row.isDefault);

  return (
    <>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Payment methods</h1>
          <p className="muted">
            System defaults are available to every company. You can also add your own methods —
            both appear on sales, purchases, and wallets.
          </p>
        </div>
      </div>

      <form className="card" onSubmit={add}>
        <label className="field">
          <span>Add your company method</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My shop Telebirr"
            required
            minLength={2}
            maxLength={64}
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn saffron" style={{ marginTop: 12 }}>
          Add method
        </button>
      </form>

      <div className="card table-wrap" style={{ marginTop: 16 }}>
        <h3 style={{ margin: "0 0 10px" }}>System defaults</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {defaults.map((row) => (
              <tr key={row.id}>
                <td>
                  {row.name}{" "}
                  <span className="pill" style={{ marginLeft: 6, fontSize: 11 }}>
                    Default
                  </span>
                </td>
                <td>{row.status}</td>
                <td className="muted">Shared for all companies</td>
              </tr>
            ))}
            {!defaults.length ? (
              <tr>
                <td colSpan={3} className="muted">
                  No defaults loaded yet — refresh the page.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="card table-wrap" style={{ marginTop: 16 }}>
        <h3 style={{ margin: "0 0 10px" }}>Your company methods</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {custom.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.status}</td>
                <td>
                  <button type="button" className="btn secondary" onClick={() => toggle(row)}>
                    {row.status === "ACTIVE" ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
            {!custom.length ? (
              <tr>
                <td colSpan={3} className="muted">
                  No custom methods yet. Add one above if you need something beyond the defaults.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
