import { createFileRoute } from "@tanstack/vue-router";
import DashboardPage from "@/ui/pages/dashboard/dashboard.page.vue";

export const Route = createFileRoute("/(authed)/dashboard")({
  component: DashboardPage,
});
