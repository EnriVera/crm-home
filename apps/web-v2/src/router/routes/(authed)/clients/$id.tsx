import { createFileRoute } from "@tanstack/vue-router";
import ClientDetailPage from "@/ui/pages/clients/client-detail.page.vue";

export const Route = createFileRoute("/(authed)/clients/$id")({
  component: ClientDetailPage,
});
