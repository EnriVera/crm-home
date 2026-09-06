import { createI18n } from "../../components/vendor/i18n/core";
import es from "./locales/es.json";

/**
 * Configuración i18n de la app (D7): idioma default `es`, catálogo local.
 * Importa ÚNICAMENTE desde la frontera `vendor/i18n` (subpath `core`, TS
 * puro, para que los smoke tests D10 no requieran el compilador .tsrx);
 * nunca `i18next` directamente. El layout raíz importa este módulo, así la
 * instancia existe tanto en SSR como en hidratación.
 */
export const i18n = createI18n({
  lng: "es",
  fallbackLng: "es",
  resources: {
    es: { translation: es },
  },
});
