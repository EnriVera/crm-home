import { createFileRoute } from "@tanstack/vue-router";
import ClientsPage from "@/ui/pages/clients/clients.page.vue";

export const Route = createFileRoute("/(authed)/clients/")({
  component: ClientsPage,
});
