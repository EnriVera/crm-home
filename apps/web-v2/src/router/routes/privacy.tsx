import { createFileRoute } from "@tanstack/vue-router";
import PrivacyPage from "@/ui/pages/legal/privacy.page.vue";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});
