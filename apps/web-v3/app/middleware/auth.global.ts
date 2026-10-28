import { defineNuxtRouteMiddleware, navigateTo } from "#imports";
import { useAuthStore } from "~/stores/auth";

// One global middleware reads the route meta: `auth` demands a session and
// `guest` refuses one (PRD-v4 §12.4).
export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore();

  if (to.meta.auth && !auth.hasSession) {
    return navigateTo({ path: "/login", query: { redirect: to.fullPath } });
  }

  if (to.meta.guest && auth.hasSession) {
    return navigateTo("/dashboard");
  }
});
