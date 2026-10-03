import { createFileRoute } from "@tanstack/vue-router";
import ConfigPage from "@/ui/pages/config/config.page.vue";

export const Route = createFileRoute("/(authed)/config")({
  component: ConfigPage,
});
