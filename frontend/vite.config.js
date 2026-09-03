import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    // Allow Arena/e2b preview hosts (*.e2b.app) without hardcoding a single origin
    allowedHosts: true,
    proxy: {
      // Any fetch to /api/... in dev gets forwarded to the FastAPI backend,
      // so the frontend never needs to hardcode a backend URL.
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
