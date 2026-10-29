import { storeToRefs, type Pinia } from "pinia";
import { ref } from "vue";
import type { SessionUser } from "@crm/contract/auth";
import { useAuthStore } from "~/stores/auth";
import { useThemeStore } from "~/stores/theme";
import {
  AuthCallError,
  fetchSession,
  requestOtp as requestOtpCall,
  verifyOtp as verifyOtpCall,
  type AuthErrorCode,
} from "~/infrastructure/auth/orpc-auth";

const REQUEST_ERROR_KEY: Record<AuthErrorCode, string> = {
  validation: "auth.errors.invalidEmail",
  unauthenticated: "auth.errors.unknown",
  rate_limited: "auth.errors.rateLimited",
  unknown: "auth.errors.unknown",
};

const VERIFY_ERROR_KEY: Record<AuthErrorCode, string> = {
  validation: "auth.errors.otpInvalid",
  unauthenticated: "auth.errors.otpInvalid",
  rate_limited: "auth.errors.rateLimited",
  unknown: "auth.errors.unknown",
};

const VERDICT_ERROR_KEY = {
  invalid: "auth.otpWrong",
  expired: "auth.otpExpired",
} as const;

/**
 * useAuth: the only door the UI has into authentication (PRD-v4 §11.4).
 *
 * It joins the transport adapter (app/infrastructure/auth) with the session
 * state (app/stores/auth) and reports failures as an i18n key: the composable
 * also runs outside a component setup (the auth plugin restores the session
 * before the first navigation), so it cannot own a translator. The view
 * resolves the key with `t`.
 *
 * `pinia` is the store instance to bind to. Callers outside a component setup
 * (the auth plugin) must pass `nuxtApp.$pinia`: `useStore()` without an
 * instance falls back to pinia's module-level active instance, which
 * @pinia/nuxt clears once the app is rendered.
 */
export function useAuth(pinia?: Pinia) {
  const store = useAuthStore(pinia);
  const { session, hasSession } = storeToRefs(store);
  const theme = useThemeStore(pinia);

  const isLoading = ref(false);
  const errorMessage = ref<string | null>(null);

  /**
   * The account is the source of truth for the theme (PRD-v2 §8.7): the
   * session carries the user's `userTheme`, so it travels with the account
   * across devices. Without this the preference only lived in this
   * browser's localStorage and the account value was fetched and dropped.
   */
  function applyAccountTheme(user: SessionUser) {
    if (user.userTheme === "light" || user.userTheme === "dark" || user.userTheme === "system") {
      theme.setTheme(user.userTheme);
    }
  }

  function clearError() {
    errorMessage.value = null;
  }

  async function requestOtp(email: string): Promise<boolean> {
    clearError();
    isLoading.value = true;
    try {
      await requestOtpCall(email);
      return true;
    } catch (error) {
      errorMessage.value =
        error instanceof AuthCallError
          ? REQUEST_ERROR_KEY[error.code]
          : "auth.errors.unknown";
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function verifyOtp(input: {
    email: string;
    code: string;
  }): Promise<boolean> {
    clearError();
    isLoading.value = true;
    try {
      const verdict = await verifyOtpCall(input);
      if (verdict !== "valid") {
        errorMessage.value = VERDICT_ERROR_KEY[verdict];
        return false;
      }
      // verifyOtp set the session cookie, so the identity the API sees is read
      // back before the guard lets the visitor into the app.
      const user = await fetchSession();
      if (!user) {
        // The code was consumed but there is no session: without it the
        // guard bounces to /login and the code is useless (loop). It is
        // reported as a failure instead of a success that cannot hold.
        store.clear();
        errorMessage.value = "auth.errors.unknown";
        return false;
      }
      store.setSession(user);
      applyAccountTheme(user);
      return true;
    } catch (error) {
      errorMessage.value =
        error instanceof AuthCallError
          ? VERIFY_ERROR_KEY[error.code]
          : "auth.errors.unknown";
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function restoreSession(): Promise<void> {
    try {
      const user = await fetchSession();
      if (user) {
        store.setSession(user);
        applyAccountTheme(user);
      } else {
        store.clear();
      }
    } catch {
      // A session that cannot be read leaves the visitor logged out, which is
      // what the guard expects. There is nothing to show on a public page.
      store.clear();
    }
  }

  return {
    session,
    hasSession,
    isLoading,
    errorMessage,
    clearError,
    requestOtp,
    verifyOtp,
    restoreSession,
  };
}
