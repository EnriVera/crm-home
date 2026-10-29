import { defineNuxtRouteMiddleware, navigateTo } from "#imports";
import { useAuthStore } from "~/stores/auth";

// One global middleware reads the route meta: `auth` demands a session and
// `guest` refuses one (PRD-v4 §12.4).
export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore();

  if (to.meta.auth && !auth.hasSession) {
    return navigateTo({ path: "/login", query: { redirect: to.fullPath } });
  }

  // `public` (the legal pages) is readable with the session open: the
  // shell links them and the visitor has to be able to read them.
  if (to.meta.guest && auth.hasSession && !to.meta.public) {
    return navigateTo("/dashboard");
  }
});
