import { createFileRoute } from "@tanstack/vue-router";
import CookiesPage from "@/ui/pages/legal/cookies.page.vue";

export const Route = createFileRoute("/cookies")({
  component: CookiesPage,
});
