/**
 * __root.tsx — the root route. Required by the TanStack Router Vite
 * plugin (B-004 in the day-of-judgment findings). It just renders the
 * matched child route through the Outlet; the actual app shell, theme
 * provider, i18n provider, and toast surface are mounted in App.vue
 * (which sits above the router). NotFoundPage handles 404s.
 */
import { createRootRouteWithContext, Outlet } from "@tanstack/vue-router";
import NotFoundPage from "@/ui/pages/not-found.page.vue";

export const Route = createRootRouteWithContext()({
 component: Outlet,
 notFoundComponent: NotFoundPage,
});
