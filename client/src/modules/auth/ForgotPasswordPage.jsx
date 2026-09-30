import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import AuthShell, { AuthNavLinks } from "./AuthShell";
import TutorialVideoButton from "./TutorialVideoButton";

const SMS_SENDER = "Abyssinia Software (AST PLC)";

const stepCopy = {
  phone: "We will send a 4-digit code to your phone.",
  otp: "Enter the code from your SMS.",
  choose: "Code verified. Choose how to set your password.",
  newPassword: "Set a password you will remember.",
};

export default function ForgotPasswordPage() {
  const { user, completePasswordReset } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return undefined;
    const timer = setInterval(() => {
      setCooldown((sec) => (sec > 1 ? sec - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (user) return <Navigate to="/" replace />;

  const clearAlerts = () => {
    setError("");
    setInfo("");
  };

  const finishReset = async (password) => {
    await completePasswordReset({
      resetToken,
      newPassword: password,
      username: phone,
    });
    navigate("/", { replace: true });
  };

  const requestOtp = async (event) => {
    event.preventDefault();
    clearAlerts();
    const value = phone.trim();
    if (!value) {
      setError("Enter your phone number");
      return;
    }
    setBusy(true);
    try {
      const res = await api("/api/auth/forgot-password", {
        method: "POST",
        body: { phone: value },
      });
      setPhone(res.data?.phone || value);
      setStep("otp");
      setCooldown(60);
      setInfo("A 4-digit code was sent to your phone.");
    } catch (err) {
      setError(err.message || "Could not send reset code");
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async (event) => {
    event.preventDefault();
    clearAlerts();
    const code = String(otp || "").trim();
    if (!/^\d{4}$/.test(code)) {
      setError("Enter the 4-digit code from your SMS");
      return;
    }
    setBusy(true);
    try {
      const res = await api("/api/auth/forgot-password/verify-otp", {
        method: "POST",
        body: { phone, otp: code },
      });
      const token = res.data?.resetToken;
      if (!token) throw new Error("Reset token missing. Try again.");
      setResetToken(token);
      setStep("choose");
    } catch (err) {
      setError(err.message || "Incorrect or expired code");
    } finally {
      setBusy(false);
    }
  };

  const resendOtp = async () => {
    if (cooldown || busy) return;
    clearAlerts();
    setBusy(true);
    try {
      await api("/api/auth/forgot-password", {
        method: "POST",
        body: { phone },
      });
      setCooldown(60);
      setInfo("A new code was sent to your phone.");
    } catch (err) {
      setError(err.message || "Could not resend code");
      const match = String(err.message || "").match(/(\d+)\s*s/i);
      if (match) setCooldown(Number(match[1]));
    } finally {
      setBusy(false);
    }
  };

  const acceptOtpAsPassword = async () => {
    clearAlerts();
    setBusy(true);
    try {
      await finishReset(otp);
    } catch (err) {
      setError(err.message || "Could not set password from the code");
      setBusy(false);
    }
  };

  const skipToCustomPassword = () => {
    clearAlerts();
    setStep("newPassword");
  };

  const submitNewPassword = async (event) => {
    event.preventDefault();
    clearAlerts();
    if (newPassword.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Password confirmation does not match");
      return;
    }
    setBusy(true);
    try {
      await finishReset(newPassword);
    } catch (err) {
      setError(err.message || "Could not update password");
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Forgot password"
      subtitle={
        step === "otp"
          ? `Enter the code sent to ${phone}`
          : stepCopy[step] || stepCopy.phone
      }
      footerLinks={
        <AuthNavLinks
          links={[{ to: "/login", label: "Remembered it? Sign in", primary: true }]}
        />
      }
    >
      <div className="auth-form">
        <TutorialVideoButton />

        {step === "phone" ? (
          <form onSubmit={requestOtp}>
            <div className="field">
              <span>Phone</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                placeholder="09… or 2519…"
                required
              />
            </div>
            {error ? <p className="error">{error}</p> : null}
            <button className="btn auth-submit" disabled={busy}>
              {busy ? "Sending…" : "Send reset code"}
            </button>
          </form>
        ) : null}

        {step === "otp" ? (
          <form onSubmit={verifyOtp}>
            <div className="field">
              <span>4-digit code</span>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={4}
                className="otp-input"
                placeholder="••••"
                required
                autoFocus
              />
            </div>
            {error ? <p className="error">{error}</p> : null}
            {info ? <p className="auth-notice">{info}</p> : null}
            <button className="btn auth-submit" disabled={busy || otp.length !== 4}>
              {busy ? "Checking…" : "Verify code"}
            </button>
            <button
              type="button"
              className="btn secondary auth-secondary"
              disabled={busy || cooldown > 0}
              onClick={resendOtp}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </form>
        ) : null}

        {step === "choose" ? (
          <div>
            <p className="auth-choice-q">
              Do you want to use this <strong>{otp}</strong> code as your password?
            </p>
            <p className="muted" style={{ margin: "0 0 14px", fontSize: 13 }}>
              The SMS was sent by <strong>{SMS_SENDER}</strong>. After you choose, you will
              be signed in automatically.
            </p>
            {error ? <p className="error">{error}</p> : null}
            <button
              type="button"
              className="btn auth-submit"
              disabled={busy}
              onClick={acceptOtpAsPassword}
            >
              {busy ? "Signing in…" : "Yes — use this code & enter desk"}
            </button>
            <button
              type="button"
              className="btn secondary auth-secondary"
              disabled={busy}
              onClick={skipToCustomPassword}
            >
              No — set a different password
            </button>
          </div>
        ) : null}

        {step === "newPassword" ? (
          <form onSubmit={submitNewPassword}>
            <div className="field">
              <span>New password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={4}
                maxLength={128}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="field">
              <span>Confirm new password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={4}
                maxLength={128}
                autoComplete="new-password"
                required
              />
            </div>
            {error ? <p className="error">{error}</p> : null}
            <button className="btn auth-submit" disabled={busy}>
              {busy ? "Signing in…" : "Save & enter desk"}
            </button>
          </form>
        ) : null}
      </div>
    </AuthShell>
  );
}
