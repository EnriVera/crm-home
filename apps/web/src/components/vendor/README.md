# `vendor/` — frontera de librerías de UI (regla §9)

**Ninguna librería de UI de terceros se importa fuera de esta carpeta.**

Todo componente de `atoms/`, `molecules/`, `organisms/`, `templates/` o
`pages/` que necesite una librería externa (i18n, tablas, gráficos, pickers,
etc.) consume el wrapper de `vendor/`, nunca el paquete directo. Así, cambiar
o reemplazar una librería solo toca su wrapper.

Wrappers actuales:

- `i18n/` — único punto del árbol donde se importa `i18next`:
  - `core.ts` expone `createI18n()`, `t()`, `getI18n()` y la suscripción a
    cambios de idioma. La configuración vive en `src/lib/i18n/` y solo puede
    importar desde aquí.
  - `provider.tsrx` expone `I18nProvider` y el hook `useT()` (únicos imports
    de `octane` del wrapper).
  - `index.ts` re-exporta la superficie pública del wrapper.
