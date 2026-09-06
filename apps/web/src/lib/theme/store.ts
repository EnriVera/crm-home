/**
 * Store de tema (D7): resuelve la preferencia de la fuente contra el SO,
 * aplica la clase `.dark` en `<html>` y notifica suscriptores. Consumido por
 * `use-theme.ts` vía `useSyncExternalStore`. TS sin imports de octane.
 */
import { resolveTheme, type Theme, type ThemeSetting } from "./core";
import type { ThemePreferenceSource } from "./source";

export interface ThemeStore {
  /** Snapshot del tema resuelto (cliente). */
  getSnapshot(): Theme;
  /** Snapshot en SSR: coincide con lo que aplica el script anti-FOUC. */
  getServerSnapshot(): Theme;
  subscribe(callback: () => void): () => void;
  setTheme(setting: ThemeSetting): void;
}

export function createThemeStore(source: ThemePreferenceSource): ThemeStore {
  let systemDark = false;
  let unsubscribeMedia: (() => void) | null = null;
  const listeners = new Set<() => void>();

  const notify = () => {
    for (const listener of listeners) listener();
  };

  const resolved = (): Theme => resolveTheme(source.read(), systemDark);

  const applyClass = () => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", resolved() === "dark");
  };

  const ensureSystemTracking = () => {
    if (typeof window === "undefined" || unsubscribeMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    systemDark = media.matches;
    const onChange = (event: MediaQueryListEvent) => {
      systemDark = event.matches;
      applyClass();
      notify();
    };
    media.addEventListener("change", onChange);
    unsubscribeMedia = () => media.removeEventListener("change", onChange);
  };

  return {
    getSnapshot(): Theme {
      ensureSystemTracking();
      return resolved();
    },
    getServerSnapshot(): Theme {
      // En SSR no hay matchMedia; el script anti-FOUC ya aplicó la clase y el
      // primer render de hidratación se corrige con el snapshot de cliente.
      return resolved();
    },
    subscribe(callback: () => void): () => void {
      ensureSystemTracking();
      listeners.add(callback);
      const unsubscribeSource = source.subscribe(() => {
        applyClass();
        callback();
      });
      applyClass();
      return () => {
        listeners.delete(callback);
        unsubscribeSource();
      };
    },
    setTheme(setting: ThemeSetting): void {
      source.write(setting);
      // La fuente notifica a sus suscriptores (incluido este store).
    },
  };
}
