import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendTarget =
    env.VITE_API_TARGET ||
    env.VITE_BACKEND_URL ||
    env.VITE_API_URL ||
    process.env.VITE_API_TARGET ||
    process.env.VITE_BACKEND_URL ||
    process.env.VITE_API_URL ||
    "http://localhost:4000";

  // Normalize target: strip trailing slash and optional /api suffix for proxy routing
  const proxyTarget = backendTarget.replace(/\/+$/, "").replace(/\/api$/, "");

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    esbuild: {
      drop: ["console", "debugger"],
    },
    build: {
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom", "react-router-dom"],
            redux: ["@reduxjs/toolkit", "react-redux"],
            icons: ["@fortawesome/react-fontawesome", "@fortawesome/free-solid-svg-icons"],
            utils: ["axios", "qs"],
          },
        },
      },
    },
  };
});
