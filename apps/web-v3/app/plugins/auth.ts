import { useAuth } from "~/shared/composables/use-auth";

export default defineNuxtPlugin({
  // The plugin reads the auth store, so it must run after @pinia/nuxt has
  // installed the pinia instance (it is what provides $pinia).
  // dependsOn names the plugin, which is the ordering mechanism Nuxt 4.6
  // offers.
  name: "auth",
  dependsOn: ["pinia"],
  async setup(nuxtApp) {
    // The session lives in an httpOnly cookie, so a fresh load starts with an
    // empty store. Awaiting one session call before the router decides is what
    // keeps a logged in visitor inside after a reload (PRD-v4 §12.4).
    //
    // The store is bound to $pinia explicitly: outside a component setup
    // `useStore()` falls back to pinia's module-level active instance, which
    // @pinia/nuxt clears once the app is rendered.
    await useAuth(nuxtApp.$pinia).restoreSession();
  },
});
