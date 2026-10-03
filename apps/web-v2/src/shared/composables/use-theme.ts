import { storeToRefs } from "pinia";
import { useThemeStore } from "@/stores/theme";
import { onMounted, onBeforeUnmount } from "vue";
import type { UserTheme } from "@crm/contract/auth";

/**
 * useTheme — subscribe the theme store to the prefers-color-scheme
 * media query. The store itself hydrates `preference` and
 * `systemResolvesToDark` at creation (see stores/theme.ts); the
 * composable only needs to wire the live media-query subscription.
 *
 * Day-of-judgment fix B-006 / B-014: the previous version of this
 * composable ran `setSystemResolvesToDark(mediaQuery.matches)` in
 * `onMounted`, which is too late — the store had already fired its
 * `immediate: true` watchers with the default `false` value, producing
 * a flash of light theme. Now the store has the right value at
 * creation; the composable just keeps it in sync with the OS.
 */
export function useTheme() {
 const store = useThemeStore();
 const { preference, resolved } = storeToRefs(store);

 let mediaQuery: MediaQueryList | null = null;
 function onSystemChange(event: MediaQueryListEvent) {
  store.setSystemResolvesToDark(event.matches);
 }

 onMounted(() => {
  if (typeof window === "undefined") return;
  mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  // Re-sync the OS preference in case it changed between store
  // creation (at app boot) and the first onMounted.
  store.setSystemResolvesToDark(mediaQuery.matches);
  mediaQuery.addEventListener("change", onSystemChange);
 });

 onBeforeUnmount(() => {
  mediaQuery?.removeEventListener("change", onSystemChange);
 });

 function setPreference(next: UserTheme) {
  store.setPreference(next);
 }

 return { preference, resolved, setPreference };
}
