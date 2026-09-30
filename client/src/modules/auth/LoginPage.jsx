import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { isPlatformAdmin } from "../../auth/access";
import { SUPER_ADMIN_HOME } from "../admin/adminPaths";
import AuthShell, { AuthNavLinks } from "./AuthShell";
import TutorialVideoButton from "./TutorialVideoButton";
import { loadRememberedLogin } from "./rememberLogin";

export default function LoginPage() {
  const { user, login } = useAuth();
  const location = useLocation();
  const remembered = loadRememberedLogin();
  const [username, setUsername] = useState(
    location.state?.username || remembered.username || "",
  );
  const [password, setPassword] = useState(remembered.password || "");
  const [rememberMe, setRememberMe] = useState(remembered.remember !== false);
  const [error, setError] = useState("");
  const [notice] = useState(location.state?.notice || "");
  const [busy, setBusy] = useState(false);

  if (user && isPlatformAdmin(user)) return <Navigate to={SUPER_ADMIN_HOME} replace />;
  if (user) return <Navigate to="/" replace />;

  return (
    <AuthShell
      title="AI Powered Stock  Management system "
      subtitle="Manage your Stock with ease any where"
      footerLinks={
        <AuthNavLinks
          links={[
            { to: "/forgot-password", label: "Forgot password?" },
            { to: "/register", label: "Register", primary: true },
          ]}
        />
      }
    >
      <form
        className="auth-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          try {
            await login(username, password, { remember: rememberMe });
          } catch (err) {
            setError(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <TutorialVideoButton />

        {notice ? <p className="auth-notice">{notice}</p> : null}

        <div className="field">
          <span>Phone or username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            placeholder="09… or username"
          />
        </div>
        <div className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="Your password"
          />
        </div>
        <label className="check-option auth-remember">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          Remember me
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn auth-submit" disabled={busy}>
          {busy ? "Signing in…" : "Login"}
        </button>
      </form>
    </AuthShell>
  );
}
