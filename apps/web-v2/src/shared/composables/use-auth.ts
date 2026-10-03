import { storeToRefs } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { authRepository } from "@/infrastructure/repositories";
import {
 makeRequestOtp,
 makeVerifyOtp,
 makeSignOut,
 makeGetSession,
} from "@/application/auth";

/**
 * useAuth — the only place components touch auth state. Wraps the use
 * cases (application layer) and exposes reactive refs from the auth store.
 *
 * Day-of-judgment fixes B-009 + B-010 (consolidated into src/app/boot.ts):
 * the previous version ran `onMounted(() => boot())` on every call,
 * which fired N concurrent `getSession()` calls and didn't satisfy
 * the router's "boot before guard" requirement. The boot now runs
 * once, before the router is installed, in `src/app/main.ts` via
 * `bootAuth()`. This composable is now read-only with respect to boot.
 */
export function useAuth() {
 const store = useAuthStore();
 const { session, profile, isAuthenticated, isBooted } = storeToRefs(store);

 const requestOtp = makeRequestOtp(authRepository);
 const verifyOtp = makeVerifyOtp(authRepository);
 const getSession = makeGetSession(authRepository);
 const signOut = makeSignOut(authRepository);

 async function signOutAndReset() {
  await signOut();
  store.reset();
 }

 return {
  session,
  profile,
  isAuthenticated,
  isBooted,
  requestOtp,
  verifyOtp,
  getSession,
  signOut: signOutAndReset,
 };
}
