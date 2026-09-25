import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { can } from "../../auth/access";
import { useAuth } from "../../auth/AuthContext";
import InventoryLoading from "../../components/InventoryLoading";

export default function WarehousesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const canCreate = can(user, "warehouse", "CREATE");
  const canUpdate = can(user, "warehouse", "UPDATE");
  const canDelete = can(user, "warehouse", "DELETE");

  const load = () => api("/api/warehouses").then((res) => setRows(res.data.warehouses || []));

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setReady(true));
  }, []);

  const cancelEdit = () => {
    setEditingId(null);
    setName("");
    setError("");
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setName(row.name || "");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (editingId) {
        await api(`/api/warehouses/${editingId}`, {
          method: "PATCH",
          body: { name },
        });
      } else {
        await api("/api/warehouses", { method: "POST", body: { name } });
      }
      cancelEdit();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete warehouse “${row.name}”?`)) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/warehouses/${row.id}`, { method: "DELETE" });
      if (editingId === row.id) cancelEdit();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!ready) return <InventoryLoading message="Loading inventory..." />;

  const showForm = canCreate || (editingId && canUpdate);

  return (
    <>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Warehouses</h1>
          <p className="muted">Register a store by name.</p>
        </div>
      </div>

      {showForm ? (
        <form className="card" onSubmit={submit}>
          <h3 style={{ marginTop: 0 }}>{editingId ? "Edit warehouse" : "Add warehouse"}</h3>
          <label className="field">
            <span>Warehouse name</span>
            <input
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={busy}
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <div className="row-actions" style={{ marginTop: 12 }}>
            {editingId ? (
              <button type="button" className="btn secondary" onClick={cancelEdit} disabled={busy}>
                Cancel
              </button>
            ) : null}
            <button className="btn" disabled={busy}>
              {busy ? "Saving…" : editingId ? "Save changes" : "Add warehouse"}
            </button>
          </div>
        </form>
      ) : error ? (
        <p className="error">{error}</p>
      ) : null}

      <div className="grid stats" style={{ marginTop: 16 }}>
        {rows.map((w) => (
          <article className="card" key={w.id}>
            <h3 style={{ marginTop: 0 }}>{w.name}</h3>
            {w.status === "INACTIVE" ? <p className="muted">Inactive</p> : null}
            <div className="row-actions" style={{ marginTop: 12 }}>
              {canUpdate ? (
                <button
                  type="button"
                  className="btn secondary"
                  disabled={busy}
                  onClick={() => startEdit(w)}
                >
                  Edit
                </button>
              ) : null}
              {canDelete ? (
                <button
                  type="button"
                  className="btn ghost"
                  disabled={busy}
                  onClick={() => remove(w)}
                >
                  Delete
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="empty muted" style={{ marginTop: 16 }}>No warehouses yet.</p>
      ) : null}
    </>
  );
}
