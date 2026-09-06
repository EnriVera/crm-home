/**
 * Middleware de redirect de `/` (D2): responde 302 a `/login` y nunca llama
 * a `next` (el entry fallback no renderiza en la práctica). Cuando exista
 * sesión (change de auth), este mismo punto cambia el destino a `/dashboard`.
 * TS puro: testeable sin DOM (`redirect.test.ts`).
 */
import type { Middleware } from "@octanejs/vite-plugin";

export const rootRedirect: Middleware = () =>
  new Response(null, {
    status: 302,
    headers: { Location: "/login" },
  });
