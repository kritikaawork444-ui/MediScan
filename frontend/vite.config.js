import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Arena / e2b live preview: https://{port}-{sandboxId}.e2b.app
// Keep host open; do NOT pin HMR to localhost (that blanks the preview iframe).
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    // Default HMR uses the page hostname — works for localhost AND e2b preview proxy.
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: true,
  },
});
