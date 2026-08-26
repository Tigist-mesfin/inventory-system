import { useEffect, useState } from "react";
import { api } from "../../api/client";

export default function PaymentMethodsPage() {
  const [rows, setRows] = useState([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const load = () =>
    api("/api/payment-methods").then((res) => setRows(res.data.paymentMethods || []));

  useEffect(() => {
    load().catch((err) => setError(err.message));
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
    await api(`/api/payment-methods/${row.id}`, {
      method: "PATCH",
      body: { status: row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" },
    });
    await load();
  };

  return (
    <>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Payment methods</h1>
          <p className="muted">Admin-managed methods used when approving customer orders and sales.</p>
        </div>
      </div>
      <form className="card" onSubmit={add}>
        <label className="field">
          <span>New method name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Telebirr" required />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn saffron" style={{ marginTop: 12 }}>Add method</button>
      </form>
      <div className="card table-wrap" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
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
          </tbody>
        </table>
      </div>
    </>
  );
}
