import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/api/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login: async (username, password) => {
        const res = await api("/api/auth/login", {
          method: "POST",
          body: { username, password },
        });
        setUser(res.data.user);
        return res.data.user;
      },
      registerCompany: async (payload) => {
        const res = await api("/api/auth/register-company", {
          method: "POST",
          body: payload,
        });
        setUser(res.data.user);
        return res.data.user;
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
