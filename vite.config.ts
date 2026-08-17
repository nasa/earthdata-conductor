import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { skybridge } from "skybridge/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [skybridge(), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@nasa-terra/components": path.resolve(
        import.meta.dirname,
        "../terra-ui-components",
      ),
    },
  },
  build: {
    cssMinify: "esbuild",
  },
});
