import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        // Local development → Flask on port 5000
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
        // For production proxy to Cloud Run instead:
        // target: "https://task-manager-backend-961886344080.us-central1.run.app",
      },
    },
  },
});
