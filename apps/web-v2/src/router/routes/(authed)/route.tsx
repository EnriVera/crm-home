/**
 * (authed)/* — group for routes that require a session. The folder
 * name uses parens so it does not appear in the URL. The route.tsx
 * here supplies the AppShell layout and the "redirect-if-not-signed-in"
 * guard. Children: dashboard, tasks, tasks-config, schedules,
 * clients (index + $id), config.
 */
import { createFileRoute, redirect } from "@tanstack/vue-router";
import AppShell from "@/ui/templates/app-shell.vue";
import { useAuthStore } from "@/stores/auth";

export const Route = createFileRoute("/(authed)")({
  component: AppShell,
  beforeLoad: ({ location }) => {
    const auth = useAuthStore();
    if (!auth.isBooted) return; // boot in-flight, let it resolve and re-run
    if (!auth.isAuthenticated) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
});
