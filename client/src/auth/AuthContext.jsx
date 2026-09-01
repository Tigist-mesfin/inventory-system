import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

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

  useEffect(() => {
    api("/api/auth/me")
      .then((res) => setUser(res.data?.user || null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login: async (username, password) => {
        const nextUser = userFrom(
          await api("/api/auth/login", {
            method: "POST",
            body: { username, password },
          }),
        );
        setUser(nextUser);
        return nextUser;
      },
      registerCompany: async (payload) => {
        const nextUser = userFrom(
          await api("/api/auth/register-company", {
            method: "POST",
            body: payload,
          }),
        );
        setUser(nextUser);
        return nextUser;
      },
      logout: async () => {
        await api("/api/auth/logout", { method: "POST" });
        setUser(null);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
