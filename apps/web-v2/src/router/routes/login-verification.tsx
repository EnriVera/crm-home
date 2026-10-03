import { createFileRoute, redirect } from "@tanstack/vue-router";
import { z } from "zod";
import { useAuthStore } from "@/stores/auth";
import LoginVerificationPage from "@/ui/pages/login-verification/login-verification.page.vue";

const searchSchema = z.object({
 email: z.string().default(""),
 redirect: z.string().optional(),
});

/**
 * /login-verification — verify the OTP sent to the user's email.
 *
 * Sibling of /login (not a child) so the URL is `/login-verification`,
 * not `/login/login-verification`. The redirect-if-already-signed-in
 * guard is duplicated here because the parent route's beforeLoad no
 * longer covers us.
 */
export const Route = createFileRoute("/login-verification")({
 component: LoginVerificationPage,
 validateSearch: searchSchema,
 beforeLoad: () => {
  const auth = useAuthStore();
  if (auth.isBooted && auth.isAuthenticated) {
   throw redirect({ to: "/login/dashboard" });
  }
 },
});
