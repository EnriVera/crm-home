import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { SessionUser } from "@crm/contract/auth";

/**
 * Auth state, and nothing else: the session shape comes from the contract and
 * the orpc calls live in app/infrastructure/auth. The guard reads this store
 * to decide whether a route needs a session (PRD-v4 §12.4), so it must stay
 * free of any transport or framework concern (PRD-v4 §11.4).
 */
export const useAuthStore = defineStore("auth", () => {
  const session = ref<SessionUser | null>(null);
  const hasSession = computed(() => session.value !== null);

  function setSession(user: SessionUser) {
    session.value = user;
  }

  function clear() {
    session.value = null;
  }

  return { session, hasSession, setSession, clear };
});
