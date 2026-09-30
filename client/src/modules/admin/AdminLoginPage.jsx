import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { isPlatformAdmin } from "../../auth/access";
import AuthShell from "../auth/AuthShell";
import {
  SUPER_ADMIN_HOME,
  superAdminPassword,
  superAdminUsername,
} from "./adminPaths";

export default function AdminLoginPage() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState(superAdminUsername());
  const [password, setPassword] = useState(superAdminPassword());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user && isPlatformAdmin(user)) return <Navigate to={SUPER_ADMIN_HOME} replace />;
  if (user && !isPlatformAdmin(user)) return <Navigate to="/" replace />;

  return (
    <AuthShell
      title="Super Admin"
      subtitle="Platform management login"
      footerLinks={null}
    >
      <form
        className="auth-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          try {
            const next = await login(username, password);
            if (!isPlatformAdmin(next)) {
              await logout();
              setError("This account is not a platform admin. Use the company login.");
              return;
            }
            navigate(SUPER_ADMIN_HOME, { replace: true });
          } catch (err) {
            setError(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="field">
          <span>Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            placeholder="Super admin username"
          />
        </div>
        <div className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="Super admin password"
          />
        </div>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn auth-submit" disabled={busy}>
          {busy ? "Signing in…" : "Admin login"}
        </button>
      </form>
    </AuthShell>
  );
}
