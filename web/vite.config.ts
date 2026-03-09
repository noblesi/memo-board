import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "localhost",
    port: 34567,
    strictPort: true,
    open: true,
  },
  preview: {
    host: "localhost",
    port: 34567,
    strictPort: true,
  },
});