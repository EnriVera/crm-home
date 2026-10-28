import type { RouterOptions } from "vue-router";
import { routes } from "./router/routes";

// Nuxt injects `history` at runtime; the scaffold declares only what it owns.
export default {
  routes,
  scrollBehavior: () => ({ top: 0 }),
} satisfies Omit<RouterOptions, "history">;
