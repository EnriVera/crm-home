import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import type { UserTheme } from "@crm/contract/auth";

/**
 * Theme store — Pinia mirror of `user.user_theme` (PRD-v3 §8.3).
 *
 * Day-of-judgment fix B-006 / B-014: the store used to default
 * `preference = "system"` and `systemResolvesToDark = false`, with two
 * `watch(..., { immediate: true })` listeners. Order of events on
 * reload:
 *   1. index.html inline script reads localStorage and sets the right
 *      `.dark` class on <html> (no FOWT at this point).
 *   2. Vue boots, creates Pinia, the theme store is created. Defaults:
 *      preference="system", systemResolvesToDark=false.
 *   3. Watch #1 (preference → localStorage) fires with "system",
 *      CLOBBERS the user's stored "dark" to "system".
 *   4. Watch #2 (resolved → <html class>) computes "light" (system +
 *      false = light), REMOVES the `.dark` class the inline script set.
 *   5. App renders with the wrong class.
 *
 * Fix: hydrate both refs SYNCHRONOUSLY at store creation (read
 * localStorage and the media query directly, not in onMounted). The
 * inline bootstrap in index.html is no longer the only source of
 * truth for the first paint — the store agrees with it from the very
 * first reactive read. The watches drop `immediate: true` so they
 * only fire on user-driven changes, not on creation.
 */
const STORAGE_KEY = "crm-theme-preference";

function readStoredPreference(): UserTheme {
 if (typeof window === "undefined") return "system";
 try {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
   return stored;
  }
 } catch {
  /* localStorage unavailable */
 }
 return "system";
}

function readSystemPrefersDark(): boolean {
 if (typeof window === "undefined") return false;
 return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export const useThemeStore = defineStore("theme", () => {
 // Hydrate at store creation, not in onMounted. This is the B-006 fix.
 const preference = ref<UserTheme>(readStoredPreference());
 const systemResolvesToDark = ref(readSystemPrefersDark());

 const resolved = computed<"light" | "dark">(() => {
  if (preference.value === "system") {
   return systemResolvesToDark.value ? "dark" : "light";
  }
  return preference.value;
 });

 function setPreference(next: UserTheme) {
  preference.value = next;
 }

 function setSystemResolvesToDark(next: boolean) {
  systemResolvesToDark.value = next;
 }

 function toggle() {
  setPreference(resolved.value === "dark" ? "light" : "dark");
 }

 // Persist preference. NOT immediate: the value at store creation is
 // already the right one (it was just read from localStorage), so
 // re-writing it on store creation is a no-op that risks clobbering
 // a concurrent tab write.
 watch(preference, (next) => {
  try {
   window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
   /* localStorage unavailable */
  }
 });

 // Sync the resolved theme to <html>. NOT immediate: the inline
 // bootstrap in index.html has already set the right class for the
 // first paint; this watch only fires on user-driven changes (or
 // system theme changes via the composable).
 watch(resolved, (next) => {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", next === "dark");
 });

 return {
  preference,
  resolved,
  setPreference,
  setSystemResolvesToDark,
  toggle,
 };
});
