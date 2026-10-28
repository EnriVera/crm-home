import type { RouteRecordRaw } from "vue-router";
import { routes } from "./router/routes";

// Nuxt 4.6's pages router calls routerOptions.routes(scannedRoutes) as a
// FUNCTION and uses its return value as the final table
// (nuxt/dist/pages/runtime/plugins/router.js:39) — a plain array would throw.
// Scanned pages are empty (no app/pages/ dir, PRD-v4 §12.6), so the table is
// exactly routes.ts. Nuxt injects `history` at runtime; we own only routes +
// scrollBehavior.
type NuxtRouterOptions = {
  routes: (scanned: RouteRecordRaw[]) => RouteRecordRaw[];
  scrollBehavior: () => { top: number };
};

export default {
  routes: (_scanned) => routes,
  scrollBehavior: () => ({ top: 0 }),
} satisfies NuxtRouterOptions;
