import { createFileRoute } from "@tanstack/vue-router";
import SchedulesPage from "@/ui/pages/schedules/schedules.page.vue";

export const Route = createFileRoute("/(authed)/schedules")({
  component: SchedulesPage,
});
