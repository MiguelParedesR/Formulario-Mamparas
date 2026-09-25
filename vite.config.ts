import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "modern",
  plugins: [react()],
  base: "/Formulario-Mamparas/",
  build: {
    outDir: "../dist-modern",
    emptyOutDir: true,
    sourcemap: true,
  },
});
