import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "react-app",
  plugins: [react()],
  base: "/",
  publicDir: false,
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    sourcemap: true
  }
});
