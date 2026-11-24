import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { SessionUser } from "@crm/contract/auth";

/**
 * Auth state, and nothing else: the session shape comes from the contract and
 * the orpc calls live in app/infrastructure/auth. The guard reads this store
 * to decide whether a route needs a session (PRD-v4 §12.4), so it must stay
 * free of any transport or framework concern (PRD-v4 §11.4).
 */

/**
 * The editable part of the profile (PRD-v4 §8.8, tab `perfil`).
 *
 * The email is NOT here: it is the identity of the account and it is not
 * editable.
 */
export interface EditableProfile {
  name: string;
  /** El estudio del usuario; null = sin definir. */
  studio: string | null;
}

/**
 * The session as it arrives, plus the `studio` the API may add.
 *
 * The cast keeps the app working against a contract that does not carry the
 * field yet: `studio` is simply undefined until the API sends it.
 */
export type SessionWithStudio = SessionUser & { studio?: string | null };

export const useAuthStore = defineStore("auth", () => {
  const session = ref<SessionUser | null>(null);
  /** The editable profile; null until the session (or a save) fills it. */
  const profile = ref<EditableProfile | null>(null);
  const hasSession = computed(() => session.value !== null);

  function setSession(user: SessionUser) {
    session.value = user;
    const studio = (user as SessionWithStudio).studio ?? null;
    profile.value = { name: user.name, studio };
  }

  function setProfile(next: EditableProfile) {
    profile.value = next;
    // The name is also part of the session: keeping both in sync avoids a
    // header that shows the old name after a save.
    if (session.value) {
      session.value = { ...session.value, name: next.name };
    }
  }

  function clear() {
    session.value = null;
    profile.value = null;
  }

  return { session, profile, hasSession, setSession, setProfile, clear };
});
