import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { getPendingRegisterPhone, useAuth } from "../../auth/AuthContext";
import AuthShell, { AuthNavLinks } from "./AuthShell";
import TutorialVideoButton from "./TutorialVideoButton";

export default function VerifyOtpPage() {
  const { user, verifyRegistrationOtp, resendRegistrationOtp } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const phone = useMemo(
    () => location.state?.phone || getPendingRegisterPhone() || "",
    [location.state],
  );
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return undefined;
    const timer = setInterval(() => {
      setCooldown((sec) => (sec > 1 ? sec - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (user) return <Navigate to="/" replace />;
  if (!phone) {
    return <Navigate to="/register" replace />;
  }

  const submitOtp = async (event) => {
    event.preventDefault();
    const code = String(otp || "").trim();
    if (!/^\d{4}$/.test(code)) {
      setError("Enter the 4-digit OTP sent to your phone");
      return;
    }
    setBusy(true);
    setError("");
    setInfo("");
    try {
      await verifyRegistrationOtp({ phone, otp: code });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "OTP verification failed");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (cooldown || resendBusy) return;
    setResendBusy(true);
    setError("");
    setInfo("");
    try {
      await resendRegistrationOtp(phone);
      setInfo("A new OTP was sent to your phone.");
      setCooldown(60);
    } catch (err) {
      setError(err.message || "Could not resend OTP");
      const match = String(err.message || "").match(/(\d+)\s*s/i);
      if (match) setCooldown(Number(match[1]));
    } finally {
      setResendBusy(false);
    }
  };

  return (
    <AuthShell
      title="Verify your phone"
      subtitle={`Enter the 4-digit code sent to ${phone}`}
      footerLinks={
        <AuthNavLinks links={[{ to: "/register", label: "Wrong number? Register again" }]} />
      }
    >
      <form className="auth-form" onSubmit={submitOtp}>
        <TutorialVideoButton />

        <div className="field">
          <span>OTP code</span>
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="••••"
            maxLength={4}
            className="otp-input"
            required
            autoFocus
          />
        </div>

        {error ? <p className="error">{error}</p> : null}
        {info ? <p className="auth-notice">{info}</p> : null}

        <button className="btn auth-submit" disabled={busy || otp.length !== 4}>
          {busy ? "Verifying…" : "Verify & enter desk"}
        </button>

        <button
          type="button"
          className="btn secondary auth-secondary"
          disabled={resendBusy || cooldown > 0}
          onClick={resend}
        >
          {resendBusy
            ? "Sending…"
            : cooldown > 0
              ? `Resend OTP in ${cooldown}s`
              : "Resend OTP"}
        </button>
      </form>
    </AuthShell>
  );
}
