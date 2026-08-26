import { useEffect, useState } from "react";
import { api } from "../../api/client";

export default function WarehousesPage() {
  const [rows, setRows] = useState([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const load = () => api("/api/warehouses").then((res) => setRows(res.data.warehouses));
  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Warehouses</h1>
          <p className="muted">Register a store by name.</p>
        </div>
      </div>
      <form
        className="card"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          try {
            await api("/api/warehouses", { method: "POST", body: { name } });
            setName("");
            await load();
          } catch (err) {
            setError(err.message);
          }
        }}
      >
        <label className="field">
          <span>Warehouse name</span>
          <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn" style={{ marginTop: 12 }}>Add warehouse</button>
      </form>
      <div className="grid stats" style={{ marginTop: 16 }}>
        {rows.map((w) => (
          <article className="card" key={w.id}>
            <h3>{w.name}</h3>
          </article>
        ))}
      </div>
    </>
  );
}
