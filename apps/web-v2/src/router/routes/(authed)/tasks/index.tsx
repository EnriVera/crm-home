import { createFileRoute } from "@tanstack/vue-router";
import TasksPage from "@/ui/pages/tasks/tasks.page.vue";

export const Route = createFileRoute("/(authed)/tasks/")({
  component: TasksPage,
});
