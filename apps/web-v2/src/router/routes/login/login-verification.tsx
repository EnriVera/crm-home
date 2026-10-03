import { createFileRoute } from "@tanstack/vue-router";
import { z } from "zod";
import LoginVerificationPage from "@/ui/pages/login-verification/login-verification.page.vue";

const searchSchema = z.object({
  email: z.string().default(""),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/login/login-verification")({
  component: LoginVerificationPage,
  validateSearch: searchSchema,
});
