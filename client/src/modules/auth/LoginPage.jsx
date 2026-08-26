import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export default function LoginPage() {
  const { user, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  return (
    <div className="login-wrap">
      <form
        className="card login-card"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          try {
            await login(username, password);
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
            <h1 style={{ margin: 0 }}>Invontory</h1>
            <div className="muted">Know every sack, size, and shilling.</div>
          </div>
        </div>
        <div className="field">
          <span>Phone or username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn" style={{ width: "100%", marginTop: 18 }} disabled={busy}>
          {busy ? "Signing in…" : "Enter the desk"}
        </button>
        <p className="muted" style={{ marginTop: 16, textAlign: "center" }}>
          New company? <Link to="/register">Register</Link>
        </p>
      </form>
    </div>
  );
}
