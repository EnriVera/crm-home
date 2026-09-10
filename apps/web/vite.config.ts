import tailwindcss from "@tailwindcss/vite";
import { octane } from "@octanejs/vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [...octane(), tailwindcss()],
  build: { target: "esnext" },
  server: {
    // Proxy `/rpc/**` a la API (nitro en :3000). El cliente RPC lee
    // `VITE_API_URL ?? "/rpc"` y por default es path absoluto relativo al
    // origin de vite (:5173), así que sin este proxy el browser posteaba
    // directo a vite y se obtenía un HTML 404 que no encajaba en el switch
    // por `error.code` de `login-form.logic.ts`.
    // Override con `API_ORIGIN` env var si la API corre en otro host/puerto.
    proxy: {
      "/rpc": {
        target: process.env.API_ORIGIN ?? "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
