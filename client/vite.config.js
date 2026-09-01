import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ["VITE_", "APP_"]);
  const proxyTarget = String(env.VITE_API_PROXY_TARGET || "").replace(/\/$/, "");

  return {
    plugins: [react()],
    envPrefix: ["VITE_", "APP_"],
    define: {
      "import.meta.env.APP_NAME": JSON.stringify(env.APP_NAME || ""),
    },
    server: {
      port: 5173,
      strictPort: false,
      proxy: proxyTarget
        ? {
            "/api": {
              target: proxyTarget,
              changeOrigin: true,
            },
            "/health": {
              target: proxyTarget,
              changeOrigin: true,
            },
          }
        : undefined,
    },
  };
});
