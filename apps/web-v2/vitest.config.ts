/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import path from "node:path";

/**
 * Mirrors vite.config.ts alias setup. The path mappings MUST match
 * the tsconfig `paths` block exactly; tests fail to resolve otherwise.
 */
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@app": path.resolve(__dirname, "./src/app"),
      "@domain": path.resolve(__dirname, "./src/domain"),
      "@application": path.resolve(__dirname, "./src/application"),
      "@infrastructure": path.resolve(__dirname, "./src/infrastructure"),
      "@ui": path.resolve(__dirname, "./src/ui"),
      "@shared": path.resolve(__dirname, "./src/shared"),
      "@machine": path.resolve(__dirname, "./src/machine"),
      "@router": path.resolve(__dirname, "./src/router"),
      "@stores": path.resolve(__dirname, "./src/stores"),
    },
  },
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
    globals: true,
  },
});
