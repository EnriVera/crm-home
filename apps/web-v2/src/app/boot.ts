import { authRepository } from "@/infrastructure/repositories";
import { makeGetSession } from "@/application/auth";
import { useAuthStore } from "@/stores/auth";

/**
 * App-level auth boot.
 *
 * Day-of-judgment fixes B-009 + B-010:
 *
 * B-009: `useAuth()` previously ran `onMounted(() => boot())` on every
 * component that called it. With 5+ components mounting near-simultaneously
 * (AppShell, App.vue, login.page, login-verification.page, dashboard),
 * that fired 5 concurrent `getSession()` calls (and 5 `getProfile()` on
 * the old port). Idempotent but wasteful.
 *
 * B-010: the router's `beforeLoad` guard returned `undefined` when
 * `!isBooted`, expecting "let it resolve and re-run". TanStack Router
 * does not re-evaluate guards on reactive store changes — so a user
 * who hard-reloaded a deep link (`/dashboard`) saw the authed shell
 * render briefly with empty profile data, then the manual next
 * navigation would re-evaluate.
 *
 * Fix: run the boot ONCE, BEFORE the router is installed. By the time
 * the router resolves any route, `isBooted` is already true and the
 * guard has the right state.
 */

const getSession = makeGetSession(authRepository);

let bootPromise: Promise<void> | null = null;

export function bootAuth(): Promise<void> {
   if (bootPromise) return bootPromise;
   bootPromise = (async () => {
      const store = useAuthStore();
      if (store.isBooted) return;
      const result = await getSession();
      if (result.ok && result.value) {
         store.setSession(result.value.session);
         store.setProfile(result.value.profile);
      }
      store.markBooted();
   })();
   return bootPromise;
}
