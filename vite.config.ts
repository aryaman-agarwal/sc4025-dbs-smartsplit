/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Relative asset paths so the built demo works on GitHub Pages or any static host.
  base: "./",
  plugins: [react(), tailwindcss()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/test/setup.ts"],
  },
});
