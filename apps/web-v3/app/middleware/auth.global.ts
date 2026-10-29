import { defineNuxtRouteMiddleware, navigateTo } from "#imports";
import { useAuthStore } from "~/stores/auth";

// One global middleware reads the route meta: `auth` demands a session and
// `guest` refuses one (PRD-v4 §12.4).
export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore();

  if (to.meta.auth && !auth.hasSession) {
    return navigateTo({ path: "/login", query: { redirect: to.fullPath } });
  }

  // `public` (las páginas legales) se leen igual con la sesión abierta: el
  // shell las linkea y el visitante tiene que poder leerlas.
  if (to.meta.guest && auth.hasSession && !to.meta.public) {
    return navigateTo("/dashboard");
  }
});
