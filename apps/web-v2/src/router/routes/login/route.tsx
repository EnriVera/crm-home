/**
 * /login/* — public auth pages. The folder gets a `route.tsx` that
 * supplies the AuthLayout and the "redirect-if-already-signed-in"
 * guard. The two children (`index.tsx`, `login-verification.tsx`)
 * are wrapped automatically by the generator.
 */
import { createFileRoute, redirect } from "@tanstack/vue-router";
import AuthLayout from "@/ui/templates/auth-layout.vue";
import { useAuthStore } from "@/stores/auth";

export const Route = createFileRoute("/login")({
 component: AuthLayout,
 beforeLoad: () => {
  const auth = useAuthStore();
  if (auth.isBooted && auth.isAuthenticated) {
   throw redirect({ to: "/dashboard" });
  }
 },
});
