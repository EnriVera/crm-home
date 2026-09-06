/**
 * Puertos de fuente de preferencia de tema (D7). Los componentes nunca conocen
 * estas clases: solo `useTheme()`. El change de auth introduce
 * `AccountThemeSource` (user_theme vía RPC) y cambia UNA línea en el punto de
 * composición; nada más se toca.
 */
import type { ThemeSetting } from "./core";
import { STORAGE_KEY } from "./core";

/** Puerto de lectura/escritura/suscripción de la preferencia de tema. */
export interface ThemePreferenceSource {
  read(): ThemeSetting;
  write(setting: ThemeSetting): void;
  /** Suscribe a cambios de la preferencia; devuelve el unsubscribe. */
  subscribe(callback: () => void): () => void;
}

function isThemeSetting(value: string | null): value is ThemeSetting {
  return value === "light" || value === "dark" || value === "system";
}

/**
 * Fuente local del shell (hoy): persiste en `localStorage` bajo `crm-theme`.
 * SSR-safe: sin `window` devuelve `system` y `write` es no-op.
 */
export class LocalStorageThemeSource implements ThemePreferenceSource {
  private listeners = new Set<() => void>();
  private storageListener: ((event: StorageEvent) => void) | null = null;

  read(): ThemeSetting {
    if (typeof window === "undefined") return "system";
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);
      return isThemeSetting(value) ? value : "system";
    } catch {
      return "system";
    }
  }

  write(setting: ThemeSetting): void {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, setting);
      } catch {
        // Modo privado / storage bloqueado: la preferencia vive solo en memoria.
      }
    }
    for (const listener of this.listeners) listener();
  }

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    if (typeof window !== "undefined" && !this.storageListener) {
      // Sincroniza entre pestañas (evento `storage` no dispara en la pestaña origen).
      this.storageListener = (event) => {
        if (event.key === STORAGE_KEY) callback();
      };
      window.addEventListener("storage", this.storageListener);
    }
    return () => {
      this.listeners.delete(callback);
    };
  }
}

/**
 * Fuente de las páginas públicas (PRD §6.8): siempre `system`, sin
 * persistencia ni toggle. `write` es no-op deliberado.
 */
export class SystemThemeSource implements ThemePreferenceSource {
  read(): ThemeSetting {
    return "system";
  }

  write(_setting: ThemeSetting): void {
    // Las páginas públicas no persisten preferencia: siguen al SO.
  }

  subscribe(_callback: () => void): () => void {
    return () => {};
  }
}
