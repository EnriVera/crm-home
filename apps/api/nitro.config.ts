import { defineNitroConfig } from "nitro/config";

// D3: nitro v3 (pin 3.0.0) con preset bun. El único handler es el composition
// root: monta GET /health (h3) y el router orpc en /rpc/* (D4/D5).
export default defineNitroConfig({
  compatibilityDate: "latest",
  preset: "bun",
  handlers: [{ route: "/**", handler: "./src/http/composition-root.ts" }],
});
