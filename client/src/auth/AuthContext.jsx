import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { markSetupGuideNeeded } from "../modules/onboarding/onboardingStorage";
import { saveRememberedLogin } from "../modules/auth/rememberLogin";
import { getKachaSessionToken } from "../lib/kacha";

const AuthContext = createContext(null);
const PENDING_PHONE_KEY = "ims_pending_register_phone";
const PENDING_PASSWORD_KEY = "ims_pending_register_password";

export function getPendingRegisterPhone() {
  try {
    return sessionStorage.getItem(PENDING_PHONE_KEY) || "";
  } catch {
    return "";
  }
}

export function setPendingRegisterPhone(phone) {
  try {
    if (phone) sessionStorage.setItem(PENDING_PHONE_KEY, phone);
    else sessionStorage.removeItem(PENDING_PHONE_KEY);
  } catch {
    /* ignore */
  }
}

export function setPendingRegisterPassword(password) {
  try {
    if (password) sessionStorage.setItem(PENDING_PASSWORD_KEY, password);
    else sessionStorage.removeItem(PENDING_PASSWORD_KEY);
  } catch {
    /* ignore */
  }
}

export function getPendingRegisterPassword() {
  try {
    return sessionStorage.getItem(PENDING_PASSWORD_KEY) || "";
  } catch {
    return "";
  }
}

function userFrom(res) {
  const user = res?.data?.user;
  if (!user) {
    throw new Error(
      "Login succeeded without a user payload. Check VITE_API_URL, ALLOWED_ORIGINS, and cookie settings on the server.",
    );
  }
  return user;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [kachaVerified, setKachaVerified] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      const sessionToken = getKachaSessionToken();

      // Inside Kacha WebView, prefer verified Mini App KYC over any stale cookie session.
      if (sessionToken) {
        try {
          const res = await api("/api/auth/kacha-session", {
            method: "POST",
            body: { sessionToken },
          });
          if (cancelled) return;
          setUser(res.data?.user || null);
          setKachaVerified(Boolean(res.data?.kacha?.verified));
          setLoading(false);
          return;
        } catch {
          // Fall through to normal /me if the token was already used/expired.
        }
      }

      try {
        const me = await api("/api/auth/me");
        if (cancelled) return;
        setUser(me.data?.user || null);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api("/api/auth/me");
      const next = res.data?.user || null;
      setUser(next);
      return next;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      kachaVerified,
      refreshUser,
      login: async (username, password, { remember = true } = {}) => {
        const nextUser = userFrom(
          await api("/api/auth/login", {
            method: "POST",
            body: { username, password },
          }),
        );
        saveRememberedLogin({ remember, username, password });
        setUser(nextUser);
        return nextUser;
      },
      /** Starts registration and sends OTP — does not log the user in. */
      registerCompany: async (payload) => {
        const res = await api("/api/auth/register-company", {
          method: "POST",
          body: payload,
        });
        const data = res.data || {};
        const phone = data.phone || payload.phone;
        setPendingRegisterPhone(phone);
        setPendingRegisterPassword(payload.password || "");
        return data;
      },
      /** Verifies OTP, sets auth cookies on the server, and signs the user in. */
      verifyRegistrationOtp: async ({ phone, otp }) => {
        const nextUser = userFrom(
          await api("/api/auth/register-company/verify-otp", {
            method: "POST",
            body: { phone, otp },
          }),
        );
        const rememberedPassword = getPendingRegisterPassword();
        setPendingRegisterPhone("");
        setPendingRegisterPassword("");
        if (nextUser?.id) markSetupGuideNeeded(nextUser.id);
        saveRememberedLogin({
          remember: true,
          username: phone,
          password: rememberedPassword,
        });
        setUser(nextUser);
        return nextUser;
      },
      resendRegistrationOtp: async (phone) => {
        const res = await api("/api/auth/register-company/resend-otp", {
          method: "POST",
          body: { phone },
        });
        return res.data || {};
      },
      /** After forgot-password reset — cookies set by server; adopt session locally. */
      completePasswordReset: async ({ resetToken, newPassword, username }) => {
        const nextUser = userFrom(
          await api("/api/auth/reset-password", {
            method: "POST",
            body: { resetToken, newPassword },
          }),
        );
        saveRememberedLogin({
          remember: true,
          username: username || nextUser?.phone || nextUser?.username || "",
          password: newPassword,
        });
        setUser(nextUser);
        return nextUser;
      },
      logout: async () => {
        await api("/api/auth/logout", { method: "POST" });
        setUser(null);
        setKachaVerified(false);
      },
    }),
    [user, loading, kachaVerified, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
