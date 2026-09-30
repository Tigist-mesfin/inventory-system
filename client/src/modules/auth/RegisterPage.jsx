import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { setPendingRegisterPhone, setPendingRegisterPassword, useAuth } from "../../auth/AuthContext";
import AuthShell, { AuthNavLinks } from "./AuthShell";
import TutorialVideoButton from "./TutorialVideoButton";

export default function RegisterPage() {
  const { user, registerCompany } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  return (
    <AuthShell
      title="Register your company"
      subtitle="Create your desk — we will send a 4-digit OTP to your phone"
      footerLinks={
        <AuthNavLinks
          links={[
            { to: "/login", label: "Already have an account? Sign in", primary: true },
          ]}
        />
      }
    >
      <form
        className="auth-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          if (form.password.length < 4) {
            setError("Password must be at least 4 characters");
            return;
          }
          if (form.password !== form.confirmPassword) {
            setError("Password confirmation does not match");
            return;
          }
          setBusy(true);
          try {
            const result = await registerCompany({
              name: form.name,
              phone: form.phone,
              address: form.address,
              password: form.password,
            });
            navigate("/register/verify-otp", {
              replace: true,
              state: { phone: result.phone || form.phone },
            });
          } catch (err) {
            if (/pending verification/i.test(err.message || "")) {
              setPendingRegisterPhone(form.phone);
              setPendingRegisterPassword(form.password);
              navigate("/register/verify-otp", {
                replace: true,
                state: { phone: form.phone },
              });
              return;
            }
            setError(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <TutorialVideoButton />

        <div className="field">
          <span>Company name</span>
          <input value={form.name} onChange={set("name")} required minLength={2} />
        </div>
        <div className="field">
          <span>Phone</span>
          <input
            value={form.phone}
            onChange={set("phone")}
            required
            autoComplete="tel"
            placeholder="09… or 2519…"
          />
        </div>
        <div className="field">
          <span>Address</span>
          <input value={form.address} onChange={set("address")} placeholder="Optional" />
        </div>
        <div className="auth-field-row">
          <div className="field">
            <span>Password</span>
            <input
              type="password"
              value={form.password}
              onChange={set("password")}
              required
              minLength={4}
              maxLength={128}
              autoComplete="new-password"
            />
          </div>
          <div className="field">
            <span>Confirm password</span>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={set("confirmPassword")}
              required
              minLength={4}
              maxLength={128}
              autoComplete="new-password"
            />
          </div>
        </div>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn auth-submit" disabled={busy}>
          {busy ? "Sending OTP…" : "Create company"}
        </button>
      </form>
    </AuthShell>
  );
}
