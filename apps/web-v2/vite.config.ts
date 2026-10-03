import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-vite-plugin";
import path from "node:path";

export default defineConfig({
  server: {
    port: Number(process.env.WEB_V2_PORT ?? 5174),
    strictPort: false,
    host: "0.0.0.0",
  },
  preview: {
    port: Number(process.env.WEB_V2_PORT ?? 5174),
  },
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
  plugins: [
    vue(),
    tailwindcss(),
    TanStackRouterVite({
      routesDirectory: "./src/router/routes",
      generatedRouteTree: "./src/router/routeTree.gen.ts",
      autoCodeSplitting: true,
      target: "vue",
    }),
  ],
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
