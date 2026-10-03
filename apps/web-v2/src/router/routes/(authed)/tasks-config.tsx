import { createFileRoute } from "@tanstack/vue-router";
import TasksConfigPage from "@/ui/pages/tasks/tasks-config.page.vue";

export const Route = createFileRoute("/(authed)/tasks-config")({
  component: TasksConfigPage,
});
