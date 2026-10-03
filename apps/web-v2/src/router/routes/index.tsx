/**
 * / — root index. Sends the user to the dashboard if signed in,
 * otherwise to the login screen. The boot status guard ensures we
 * never bounce an authed user back to /login because the store
 * has not finished hydrating yet.
 */
import { createFileRoute, redirect } from "@tanstack/vue-router";
import { useAuthStore } from "@/stores/auth";

export const Route = createFileRoute("/")({
   beforeLoad: () => {
      const auth = useAuthStore();
      if (auth.isBooted && auth.isAuthenticated) {
         throw redirect({ to: "/dashboard" });
      }
      throw redirect({ to: "/login" });
   },
});
