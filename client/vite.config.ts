import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backendUrl = "https://campus-hackathon-manager-full-stack-3.onrender.com";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": backendUrl,
      "/socket.io": {
        target: backendUrl,
        ws: true
      }
    }
  }
});
