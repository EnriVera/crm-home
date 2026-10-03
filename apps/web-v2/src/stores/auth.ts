import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { Session, UserProfile } from "@crm/contract/auth";

/**
 * Auth store — Pinia mirror of the server-side session.
 * Source of truth is the `user.user_theme` and the `crm_session` cookie;
 * the store is hydrated on app boot by `useAuth().boot()`.
 */
export const useAuthStore = defineStore("auth", () => {
  const session = ref<Session | null>(null);
  const profile = ref<UserProfile | null>(null);
  const isBooted = ref(false);

  const isAuthenticated = computed(() => session.value !== null);

  function setSession(next: Session | null) {
    session.value = next;
  }

  function setProfile(next: UserProfile | null) {
    profile.value = next;
  }

  function markBooted() {
    isBooted.value = true;
  }

  function reset() {
    session.value = null;
    profile.value = null;
    isBooted.value = false;
  }

  return {
    session,
    profile,
    isBooted,
    isAuthenticated,
    setSession,
    setProfile,
    markBooted,
    reset,
  };
});
