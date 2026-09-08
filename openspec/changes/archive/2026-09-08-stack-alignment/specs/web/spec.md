# Delta for Web

> Change: `stack-alignment` · Delta sobre la spec `web`.
> NOTA DE BASELINE: `openspec/specs/web/spec.md` aún no existe porque ni
> `monorepo-scaffold` ni `frontend-foundation` fueron archivados; este delta se
> escribe contra la cadena `monorepo-scaffold/specs/web/spec.md` +
> `frontend-foundation/specs/web/spec.md` como baseline de facto (verificado).
> Orden de archivo obligatorio:
> `monorepo-scaffold` → `frontend-foundation` → `stack-alignment`.

## ADDED Requirements

### Requirement: Dependencias de bindings pineadas en apps/web

`apps/web/package.json` DEBE incorporar con versión exacta pineada las
dependencias de bindings adoptadas en este change: `@octanejs/zag` +
`@zag-js/pin-input` **o** `@octanejs/input-otp` (según decisión de design),
`@octanejs/xstate` + `xstate`, `@octanejs/phosphor-icons`,
`@octanejs/resizable-panels`, `@octanejs/i18next`, `@octanejs/sonner`,
`@octanejs/usehooks-ts`, `effect` y —condicionado a la verificación de plan
sobre ErrorBoundary nativo de Octane— `@octanejs/react-error-boundary`. La
instalación, pin y verificación de peer ranges DEBEN seguir la spec
`vendor-bindings`.

#### Scenario: Deps presentes y pineadas

- GIVEN `apps/web/package.json` tras el change
- WHEN se inspeccionan las dependencias
- THEN todos los bindings adoptados figuran con versión exacta y el lockfile commitado los resuelve

### Requirement: Wrappers mínimos de toast y error-boundary bajo vendor/

`apps/web` DEBE incluir un wrapper mínimo `components/vendor/toast/` que
encapsule `@octanejs/sonner`, aunque ningún flujo lo consuma aún (evita
re-alinear después; el primer consumidor llega con su change). Además, si plan
verifica que Octane `0.2.3` NO expone ErrorBoundary nativo, DEBE existir un
wrapper mínimo `components/vendor/error-boundary/` sobre
`@octanejs/react-error-boundary`; si existe nativo, NO DEBE crearse el wrapper y
la decisión DEBE documentarse (ver spec `vendor-bindings`). Ambos wrappers DEBEN
respetar la regla §9: los consumidores importan del wrapper, nunca del binding.

#### Scenario: Toast confinado al wrapper

- GIVEN el árbol `src/` de `apps/web`
- WHEN se buscan imports de `@octanejs/sonner` o `sonner`
- THEN aparecen únicamente bajo `components/vendor/toast/`

#### Scenario: Error-boundary resuelto según verificación

- GIVEN la verificación de plan sobre Octane nativo
- WHEN se inspecciona `components/vendor/`
- THEN existe el wrapper `error-boundary/` sobre el binding, o la decisión de usar el nativo está documentada y no hay wrapper

## MODIFIED Requirements

### Requirement: i18next con español por defecto

`apps/web` DEBE configurar i18next con idioma por defecto `es` y un catálogo
inicial en español, de modo que toda cadena visible de la UI provenga del
catálogo i18n (regla `language_ui: es` del proyecto). La integración DEBE
vivir en el wrapper `components/vendor/i18n/` (único módulo que PUEDE importar
`@octanejs/i18next` e `i18next`) y su contrato público hacia los consumidores
DEBE preservarse intacto: `I18nProvider`, `useT()`, `t()`, `createI18n(options)`
y `subscribeLanguageChange()`, con los 5 tests existentes verdes (adaptados en
su implementación interna si hace falta, nunca borrados sin reemplazo). El swap
a `@octanejs/i18next` es **condicional a su API**: el binding DEBE permitir
crear/configurar la instancia en `lib/i18n/config.ts` para SSR + hidratación; si
su API es rígida y no lo permite, DEBE mantenerse la integración actual sobre
i18next real y documentarse como "variante equivalente §9" en el change.
(Previously: integración propia (~35 líneas: provider + hook sobre i18next
real) sin binding first-party evaluado.)

#### Scenario: Página renderiza en español por defecto

- GIVEN `apps/web` levantado en modo dev sin configuración de idioma del navegador forzada
- WHEN se carga la ruta inicial
- THEN los textos visibles provienen del catálogo i18n en español (no hay cadenas hardcodeadas en inglés)

#### Scenario: Contrato i18n intacto

- GIVEN el wrapper `vendor/i18n/` tras el swap (o la variante documentada)
- WHEN se inspeccionan los consumidores y se ejecuta `bun test`
- THEN `I18nProvider`, `useT()`, `t()`, `createI18n()` y `subscribeLanguageChange()` siguen disponibles con la misma firma y los tests de i18n pasan

#### Scenario: Decisión del swap documentada

- GIVEN la evaluación de la API de `@octanejs/i18next`
- WHEN se inspecciona el change
- THEN o bien el wrapper delega en el binding, o bien el motivo de mantener la integración propia está documentado como variante equivalente §9
