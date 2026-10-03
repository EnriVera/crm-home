import { createFileRoute } from "@tanstack/vue-router";
import TermsPage from "@/ui/pages/legal/terms.page.vue";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});
