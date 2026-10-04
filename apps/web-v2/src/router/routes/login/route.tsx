/**
 * /login/* — public auth pages.
 *
 * The folder gets a `route.tsx` for the "redirect-if-already-signed-in"
 * guard only. The AuthLayout is provided by each child page
 * (`login.page.vue`, `login-verification.page.vue`) via slot content,
 * NOT by this parent route — putting it here would render the layout
 * without the child (the AuthLayout has no <RouterView />), so the
 * login form would never mount.
 */
import { createFileRoute, redirect } from "@tanstack/vue-router";
import { useAuthStore } from "@/stores/auth";

export const Route = createFileRoute("/login")({
 beforeLoad: ({ location }) => {
  const auth = useAuthStore();
  if (auth.isBooted && auth.isAuthenticated) {
   // Honor a ?redirect=… param so a logged-in user landing on
   // /login?redirect=/tasks bounces to /tasks instead of always
   // /dashboard. Same relative-path guard as the (authed) layout.
   const raw = (location.search as { redirect?: unknown }).redirect;
   const target =
    typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//")
     ? raw
     : "/dashboard";
   throw redirect({ to: target });
  }
 },
});
