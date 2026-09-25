import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ["VITE_", "APP_"]);
  // Prefer 127.0.0.1 over localhost — on Windows, localhost often resolves to
  // ::1 while the API listens on IPv4, which yields ECONNREFUSED / fake 500s.
  const proxyTarget = String(
    env.VITE_API_PROXY_TARGET || "http://127.0.0.1:3000",
  )
    .replace(/\/$/, "")
    .replace("://localhost", "://127.0.0.1");

  return {
    plugins: [react()],
    envPrefix: ["VITE_", "APP_"],
    define: {
      "import.meta.env.APP_NAME": JSON.stringify(env.APP_NAME || ""),
    },
    server: {
      port: 5173,
      strictPort: false,
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
        },
        "/health": {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
