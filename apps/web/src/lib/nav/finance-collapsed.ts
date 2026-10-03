/**
 * Persisted state (localStorage) for the sidebar Finance disclosure group.
 * SSR-safe: every storage access is wrapped in a try/catch that swallows the
 * browser-only ReferenceError on the server, plus storage errors (private
 * mode, quota, sandbox).
 *
 * Default `false` (expanded) preserves the pre-redesign behavior: the
 * Finance children always rendered expanded. Users who prefer collapsed
 * persist it once and forget.
 *
 * The pure decoder (`parseFinanceCollapsed`) is exported separately so it is
 * testable headless — no DOM, no storage.
 */

const STORAGE_KEY = "crm.finance.collapsed";
const TRUE = "1";
const FALSE = "0";

/**
 * Pure decoder: turns the raw localStorage string into a boolean.
 * Anything other than the literal `'1'` (including `null`, `undefined`, or
 * legacy / manually-edited values) is treated as the default `false`
 * (expanded).
 */
export function parseFinanceCollapsed(raw: string | null): boolean {
 if (raw === null) return false;
 return raw === TRUE;
}

function readStorage(): string | null {
 try {
  return window.localStorage.getItem(STORAGE_KEY);
 } catch {
  return null;
 }
}

function writeStorage(value: string): void {
 try {
  window.localStorage.setItem(STORAGE_KEY, value);
 } catch {
  // Swallow: the preference is cosmetic — losing it does not break the UI.
 }
}

export function loadFinanceCollapsed(): boolean {
 return parseFinanceCollapsed(readStorage());
}

export function saveFinanceCollapsed(collapsed: boolean): void {
 writeStorage(collapsed ? TRUE : FALSE);
}
