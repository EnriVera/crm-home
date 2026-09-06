import { useSyncExternalStore, type OctaneNode } from "octane";
import { getI18n, subscribeLanguageChange, t } from "./core";

/**
 * Hook de traducción: devuelve `t()` y re-renderiza el componente cuando
 * cambia el idioma. Es la única vía de acceso a i18n desde componentes.
 */
export function useT(): (key: string) => string {
  useSyncExternalStore(
    subscribeLanguageChange,
    () => getI18n().language,
    () => "es",
  );
  return t;
}

interface I18nProviderProps {
  children: OctaneNode;
}

/**
 * Frontera semántica de i18n para el árbol de componentes. La instancia se
 * inicializa en `src/lib/i18n/config.ts` (importada por el layout raíz), de
 * modo que el provider solo delimita el contexto de la frontera vendor.
 */
export function I18nProvider(props: I18nProviderProps) @{
  <>{props.children}</>
}
