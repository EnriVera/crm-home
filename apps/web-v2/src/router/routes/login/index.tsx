import { createFileRoute } from "@tanstack/vue-router";
import LoginPage from "@/ui/pages/login/login.page.vue";

export const Route = createFileRoute("/login/")({
  component: LoginPage,
});
