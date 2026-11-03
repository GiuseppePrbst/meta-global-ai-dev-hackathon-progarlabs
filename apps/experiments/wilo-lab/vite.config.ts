import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: { port: 3001, host: "127.0.0.1" },
  preview: { port: 3001, host: "127.0.0.1" },
});
