/**
 * Redirect store — transient state for the post-login destination.
 *
 * The (authed) layout guard sets this when an unauthenticated user
 * tries to visit a protected route. The login and login-verification
 * pages read it to know where to send the user after a successful
 * verify. The verification page clears it on success.
 *
 * We keep this in Pinia (not the URL) so the user-visible URL stays
 * clean — no `?redirect=…` pollutes the address bar during the
 * login flow. The cost is that a hard refresh mid-flow loses the
 * target (acceptable: a refresh on /login or /login-verification
 * defaults to /dashboard, which is the right outcome for a cold
 * start).
 */
import { defineStore } from "pinia";
import { ref } from "vue";

export const useRedirectStore = defineStore("redirect", () => {
 const pending = ref<string | null>(null);

 function set(path: string | null) {
  pending.value = path;
 }

 function clear() {
  pending.value = null;
 }

 return { pending, set, clear };
});
