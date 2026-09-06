/**
 * Hook de tema (D7): único módulo de `lib/theme` que importa octane. Los
 * componentes solo conocen `useTheme()`; la fuente concreta se decide en el
 * punto de composición (layouts).
 */
import { useSyncExternalStore } from "octane";
import type { Theme, ThemeSetting } from "./core";
import { createThemeStore, type ThemeStore } from "./store";
import {
  LocalStorageThemeSource,
  SystemThemeSource,
} from "./source";

/** Store del shell autenticado: preferencia persistida en localStorage. */
export const shellThemeStore: ThemeStore = createThemeStore(
  new LocalStorageThemeSource(),
);

/** Store de las páginas públicas: sigue al SO (PRD §6.8), sin toggle. */
export const systemThemeStore: ThemeStore = createThemeStore(
  new SystemThemeSource(),
);

export interface UseThemeResult {
  theme: Theme;
  setTheme(setting: ThemeSetting): void;
}

/** Tema resuelto + setter, reactivo a cambios de fuente y del SO. */
export function useTheme(
  store: ThemeStore = shellThemeStore,
): UseThemeResult {
  const theme = useSyncExternalStore(
    (onChange) => store.subscribe(onChange),
    () => store.getSnapshot(),
    () => store.getServerSnapshot(),
  );
  return { theme, setTheme: (setting) => store.setTheme(setting) };
}
