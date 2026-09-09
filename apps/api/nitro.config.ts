import { defineNitroConfig } from "nitro/config";

// D3: nitro v3 (pin 3.0.0) con preset bun. El único handler es el composition
// root: monta GET /health (h3) y el router orpc en /rpc/* (D4/D5).
export default defineNitroConfig({
  compatibilityDate: "latest",
  preset: "bun",
  handlers: [{ route: "/**", handler: "./src/http/composition-root.ts" }],
  tasks: {
    "email-sending": {
      handler: "./tasks/email-sending.ts",
      description: "Drena la cola email_sending y envía los mensajes pendientes",
    },
  },
  scheduledTasks: {
    "*/1 * * * *": ["email-sending"],
  },
});
