export default defineNuxtPlugin((nuxtApp) => {
  // The app renders its routes through <RouterView /> inside the layouts
  // (PRD-v4 §12.3), so <NuxtPage /> never resolves and Nuxt never syncs its
  // route ref. Without this, useRoute() keeps returning the route of the
  // first render: the layout selection in app.vue and the query the login
  // views read would both be stale after a client-side navigation.
  nuxtApp.$router.afterEach(() => {
    nuxtApp._route.sync?.();
  });
});
