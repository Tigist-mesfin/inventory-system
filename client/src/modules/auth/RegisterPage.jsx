import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export default function RegisterPage() {
  const { user, registerCompany } = useAuth();
  const [form, setForm] = useState({ name: "", phone: "", address: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  return (
    <div className="login-wrap">
      <form
        className="card login-card"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          try {
            await registerCompany(form);
          } catch (err) {
            setError(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="brand" style={{ marginBottom: 18 }}>
          <div className="brand-mark">Iv</div>
          <div>
            <h1 style={{ margin: 0 }}>Register your company</h1>
            <div className="muted">Then add stores and salesmen.</div>
          </div>
        </div>
        <div className="field">
          <span>Company name</span>
          <input value={form.name} onChange={set("name")} required />
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <span>Phone</span>
          <input value={form.phone} onChange={set("phone")} required />
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <span>Address</span>
          <input value={form.address} onChange={set("address")} />
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <span>Password</span>
          <input type="password" value={form.password} onChange={set("password")} required minLength={8} />
        </div>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn" style={{ width: "100%", marginTop: 18 }} disabled={busy}>
          {busy ? "Creating…" : "Create company"}
        </button>
        <p className="muted" style={{ marginTop: 16, textAlign: "center" }}>
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
