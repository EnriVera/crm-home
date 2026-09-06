# vendor/i18n — wrapper propio sobre `i18next` (D6 → D-SA3, rama B)

Frontera vendor (regla §9): `core.ts` es el **único** módulo del árbol de
componentes que importa `i18next`. Superficie estable hacia los consumidores:
`I18nProvider`, `useT()`, `t()`, `createI18n(options)`,
`subscribeLanguageChange()`.

## Addendum D-SA3 (stack-alignment): gate de `@octanejs/i18next` ejecutado — NO se adopta

El gate de re-evaluación previsto en D-SA3 se ejecutó en este change:
`@octanejs/i18next@0.1.47` se instaló pineado, se inspeccionó su API y se
desinstaló sin commit de dependencia (evaluación revertible por construcción).

**Evidencia de la inspección:** el binding es un port de
`react-i18next@17.0.9` (usa `i18next` sin cambios) y SÍ expone creación e
inyección de instancia (`initReactI18next`, `I18nextProvider`,
`setI18n`/`getI18n`, `useTranslation`, `Trans`).

**Decisión (rama B — cerrada):** se MANTIENE la integración actual como
"variante equivalente §9" (como prevé el comentario D6 de `core.ts`):

1. La integración propia YA usa `i18next@26.4.2` real, funciona en SSR +
   hidratación (instancia creada en `lib/i18n/config.ts`) y tiene sus 5 tests
   verdes e intactos.
2. El valor del swap es nulo hoy: ahorraría ~35 líneas y añadiría superficie
   sin consumidor (`Trans`, ICU, HOCs). Ningún contrato de la app mejora.
3. Riesgo asimétrico: cualquier divergencia sutil de hidratación del binding
   rompería el invariante más caro del repo (SSR sin mismatch, D3/D8).

**Criterio de re-evaluación** (registrado en `openspec/config.yaml`
diferidos): cuando un change necesite `Trans`/ICU/pluralización o el contrato
del wrapper deba crecer más allá de `t()` por clave, se re-evalúa el binding
en ESE change consumidor.

En cualquier desenlace, los consumidores no cambian: el contrato público del
wrapper queda intacto.
