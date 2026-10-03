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
 beforeLoad: () => {
  const auth = useAuthStore();
  if (auth.isBooted && auth.isAuthenticated) {
   throw redirect({ to: "/dashboard" });
  }
 },
});
