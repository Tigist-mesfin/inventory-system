import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { isOwner } from "../../auth/access";
import { useAuth } from "../../auth/AuthContext";

const MODULES = [
  { key: "sales", label: "Sales" },
  { key: "purchasing", label: "Purchasing" },
  { key: "inventory", label: "Stock" },
  { key: "catalog", label: "Products" },
  { key: "warehouse", label: "Stores" },
  { key: "customers", label: "Customers & suppliers" },
  { key: "finance", label: "Expenses & profit" },
  { key: "insights", label: "AI desk" },
  { key: "auth", label: "Team / company" },
];

const ACTIONS = ["READ", "CREATE", "UPDATE", "DELETE"];

const emptyForm = {
  fullName: "",
  phone: "",
  password: "",
  allWarehouses: false,
  warehouseIds: [],
  permissions: [],
};

export default function TeamPage() {
  const { user } = useAuth();
  const [salesmen, setSalesmen] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [team, stores] = await Promise.all([
      api("/api/team"),
      api("/api/warehouses"),
    ]);
    setSalesmen(team.data.salesmen || []);
    setWarehouses(stores.data.warehouses || []);
  };

  useEffect(() => {
    if (!isOwner(user)) return;
    load().catch((err) => setError(err.message));
  }, [user]);

  const toggleWarehouse = (id) => {
    setForm((prev) => {
      const has = prev.warehouseIds.includes(id);
      return {
        ...prev,
        warehouseIds: has
          ? prev.warehouseIds.filter((row) => row !== id)
          : [...prev.warehouseIds, id],
      };
    });
  };

  const togglePermission = (name) => {
    setForm((prev) => {
      const has = prev.permissions.includes(name);
      return {
        ...prev,
        permissions: has
          ? prev.permissions.filter((row) => row !== name)
          : [...prev.permissions, name],
      };
    });
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setForm({
      fullName: row.fullName,
      phone: row.phone || row.username,
      password: "",
      allWarehouses: Boolean(row.allWarehouses),
      warehouseIds: (row.warehouses || []).map((store) => store.id),
      permissions: (row.permissions || []).map((permission) => permission.name),
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = {
        fullName: form.fullName,
        phone: form.phone,
        allWarehouses: form.allWarehouses,
        warehouseIds: form.allWarehouses ? [] : form.warehouseIds,
        permissions: form.permissions,
      };
      if (form.password) body.password = form.password;
      if (editingId) {
        await api(`/api/team/${editingId}`, { method: "PATCH", body });
      } else {
        await api("/api/team", { method: "POST", body: { ...body, password: form.password } });
      }
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!isOwner(user)) {
    return <p className="muted">Only the company owner can manage salesmen.</p>;
  }

  return (
    <>
      <h1>Salesmen</h1>
      <p className="muted">
        Create a salesman, assign stores, and grant create / read / update / delete per module.
      </p>
      {error ? <p className="error">{error}</p> : null}

      <form className="card" onSubmit={submit} style={{ marginBottom: 24 }}>
        <h3>{editingId ? "Edit salesman" : "New salesman"}</h3>
        <div className="toolbar">
          <label className="field">
            <span>Name</span>
            <input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
          </label>
          <label className="field">
            <span>Phone / username</span>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
          </label>
          <label className="field">
            <span>{editingId ? "New password (optional)" : "Password"}</span>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={editingId ? undefined : 8}
              required={!editingId}
            />
          </label>
        </div>

        <label className="field" style={{ marginTop: 12 }}>
          <span>
            <input
              type="checkbox"
              checked={form.allWarehouses}
              onChange={(e) => setForm({ ...form, allWarehouses: e.target.checked })}
            />{" "}
            Access all stores
          </span>
        </label>
        {!form.allWarehouses ? (
          <div style={{ marginTop: 8 }}>
            <div className="muted">Assigned stores</div>
            {warehouses.map((store) => (
              <label key={store.id} style={{ display: "block", marginTop: 6 }}>
                <input
                  type="checkbox"
                  checked={form.warehouseIds.includes(store.id)}
                  onChange={() => toggleWarehouse(store.id)}
                />{" "}
                {store.name} ({store.code})
              </label>
            ))}
            {warehouses.length === 0 ? (
              <p className="muted">Create a store first under Warehouses.</p>
            ) : null}
          </div>
        ) : null}

        <div style={{ marginTop: 16, overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Module</th>
                {ACTIONS.map((action) => (
                  <th key={action}>{action}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((mod) => (
                <tr key={mod.key}>
                  <td>{mod.label}</td>
                  {ACTIONS.map((action) => {
                    const name = `${mod.key}:${action}`;
                    return (
                      <td key={name}>
                        <input
                          type="checkbox"
                          checked={form.permissions.includes(name)}
                          onChange={() => togglePermission(name)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row-actions" style={{ marginTop: 16 }}>
          <button className="btn" disabled={busy}>
            {busy ? "Saving…" : editingId ? "Save salesman" : "Create salesman"}
          </button>
          {editingId ? (
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Stores</th>
              <th>Access</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {salesmen.map((row) => (
              <tr key={row.id}>
                <td>{row.fullName}</td>
                <td>{row.phone || row.username}</td>
                <td>
                  {row.allWarehouses
                    ? "All stores"
                    : (row.warehouses || []).map((store) => store.name).join(", ") || "None"}
                </td>
                <td>{(row.permissions || []).map((permission) => permission.name).join(", ") || "None"}</td>
                <td>
                  <button type="button" className="btn secondary" onClick={() => startEdit(row)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {salesmen.length === 0 ? <p className="empty muted">No salesmen yet.</p> : null}
      </div>
    </>
  );
}
