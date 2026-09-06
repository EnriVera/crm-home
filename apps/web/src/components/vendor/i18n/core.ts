/**
 * Núcleo del wrapper i18n (regla §9): único módulo del árbol de componentes
 * que importa `i18next`. Es TS puro (sin octane) para que los smoke tests D10
 * puedan ejercitarlo sin compilador ni DOM.
 *
 * Verificación D6: se usa `i18next` a secas en lugar de `react-i18next`,
 * porque Octane no es runtime-compatible con React; la variante equivalente
 * queda absorbida por este wrapper, como prevé §9.
 */
import i18next, { type i18n as I18nInstance, type InitOptions } from "i18next";

let current: I18nInstance | null = null;

/** Crea y registra la instancia i18n de la aplicación (idioma default `es`). */
export function createI18n(options: InitOptions): I18nInstance {
  const instance = i18next.createInstance();
  instance.init({
    interpolation: { escapeValue: false },
    ...options,
  });
  current = instance;
  return instance;
}

export function getI18n(): I18nInstance {
  if (!current) {
    throw new Error(
      "[vendor/i18n] i18n no inicializado: createI18n() debe ejecutarse antes de t()/useT().",
    );
  }
  return current;
}

/** Traduce una clave del catálogo activo. */
export function t(key: string): string {
  return getI18n().t(key);
}

/** Suscribe a cambios de idioma; devuelve el unsubscribe. */
export function subscribeLanguageChange(callback: () => void): () => void {
  const instance = getI18n();
  instance.on("languageChanged", callback);
  return () => {
    instance.off("languageChanged", callback);
  };
}
