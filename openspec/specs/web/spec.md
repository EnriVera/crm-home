# Web Specification

## Purpose

Define el scaffold de `apps/web` (`@crm/web`): octanejs (tsrx) + vite +
tailwindcss con estructura atomic design que materializa la regla vinculante de
wrappers de librerías (PRD §9) de forma auditable por path desde el PR #1,
i18next con español por defecto desde el día uno, y una ruta mínima de humo. Sin
lógica de negocio ni wrappers reales de UI (fuera de alcance).

## Requirements

### Requirement: Stack con versiones pineadas y verificadas

`apps/web` DEBE usar octanejs (tsrx) como framework, vite como build,
tailwindcss y `@fontsource/poppins`, todos con versión exacta pineada tras la
verificación de registry npm definida en la spec `workspace`. El commit de
`apps/web/package.json` NO DEBE realizarse antes de verificar nombre/scope y
peer deps de React de `octanejs`/`tsrx` (riesgo bloqueante 🔴).

#### Scenario: Deps de web verificadas antes del commit

- GIVEN la verificación de versiones de la spec `workspace` completada
- WHEN se commitea `apps/web/package.json`
- THEN `octanejs`/`tsrx`, vite, tailwindcss y `@fontsource/poppins` figuran con versión exacta y peer deps compatibles

### Requirement: Estructura atomic design con vendor/ como único punto de import de libs de UI

`apps/web` DEBE organizar sus componentes en `src/components/vendor/`,
`src/components/atoms/`, `src/components/molecules/`, `src/components/organisms/`
y `src/components/base-view/`. El directorio `vendor/` DEBE existir desde el
scaffold con un README que fije la regla del PRD §9: ninguna librería de UI de
terceros PUEDE importarse fuera de `src/components/vendor/`; los componentes de
`atoms/`, `molecules/` y `organisms/` DEBEN consumir libs de UI únicamente a
través de `vendor/`.

#### Scenario: Regla de wrappers auditable por path

- GIVEN el scaffold de `apps/web`
- WHEN se inspeccionan los imports de librerías de UI de terceros en `src/`
- THEN aparecen únicamente bajo `src/components/vendor/`, y el README de `vendor/` documenta la regla

#### Scenario: Atomic design consume vendor

- GIVEN componentes de ejemplo en `atoms/`/`molecules/`/`organisms/`
- WHEN se inspeccionan sus imports
- THEN cualquier dependencia de UI de terceros se importa desde `../vendor`, nunca directamente del paquete npm

### Requirement: i18next con español por defecto

`apps/web` DEBE configurar i18next con idioma por defecto `es` y un catálogo
inicial en español, de modo que toda cadena visible de la UI provenga del
catálogo i18n (regla `language_ui: es` del proyecto). La integración DEBE vivir
en el wrapper `components/vendor/i18n/` (único módulo que PUEDE importar
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

### Requirement: Ruta inicial mínima y base de router

`apps/web` DEBE mantener la base de routing por tabla explícita en
`octane.config.ts` (`RenderRoute` con `layout` por ruta, modelo plano de
Octane). La ruta inicial `/` ya NO renderiza una página de humo: redirige a
`/login` (ver "Redirect de la ruta raíz a /login"). La tabla canónica de rutas
del PRD §7 se registra en este change como placeholders del shell (ver spec
`web-shell`), sin lógica de negocio.
(Previously: la ruta inicial `/` montaba una página mínima de humo y la tabla
canónica del PRD §7 quedaba diferida a changes futuros.)

#### Scenario: Router por tabla con rutas del change

- GIVEN `apps/web` levantado en modo dev
- WHEN se navega a `/`, `/login` y una ruta del shell
- THEN `/` redirige a `/login`, `/login` renderiza con el layout auth y la ruta del shell renderiza su placeholder con el layout app shell

### Requirement: Tokens de estilo semánticos

`apps/web` DEBE mantener `src/styles/tokens.css` como único archivo de tokens,
ahora con la estructura completa de tres capas, tokens de estado y foco,
variante `dark:` por clase y regla de contraste AA definidos en la spec
`design-system`, que pasa a ser la autoridad del sistema de tokens.
(Previously: tokens semánticos básicos de color — primary, surface, text —
para claro y oscuro como base del PRD §9.)

#### Scenario: Tokens completos vigentes

- GIVEN el archivo `src/styles/tokens.css`
- WHEN se inspeccionan los tokens
- THEN cumple los requisitos de la spec `design-system` (tres capas, estado/foco, `@custom-variant dark`)

### Requirement: Redirect de la ruta raíz a /login

La ruta `/` DEBE dejar de montar la página de humo y pasar a un `RenderRoute`
con middleware `before` que responda `302 Location: /login`. El `entry`
(requerido por el tipo) DEBE ser una página mínima de fallback con un anchor a
`/login` (defensa ante un entorno que no ejecute middleware). La función del
middleware DEBE ser TS puro testeable sin DOM. Cuando exista sesión (change de
auth), el mismo middleware PUEDE cambiar el destino a `/dashboard`.

#### Scenario: Redirect 302 desde la raíz

- GIVEN la tabla de rutas con el redirect configurado
- WHEN llega un request a `/`
- THEN la respuesta es `302` con header `Location: /login`

#### Scenario: Middleware testeable sin DOM

- GIVEN la función del middleware
- WHEN se invoca con un Context de request a `/` en un test `bun test`
- THEN devuelve una `Response` con status 302 y `Location: /login`

### Requirement: Tabla de rutas ampliada con helpers de layout

`octane.config.ts` DEBE registrar las rutas `/login` y `/login-verification`
con el layout auth (helper `authRoute(path, entry)`) y las ocho rutas del shell
con el layout app shell (helper `shellRoute(path, entry)`), materializando la
lista canónica `SHELL_ROUTES` compartida con el árbol de navegación. Los
helpers DEBEN colapsar la repetición del `layout` por ruta (modelo plano de
Octane) y ser el punto único donde el futuro auth-guard se enchufe como
`before`.

#### Scenario: Tabla generada desde la lista canónica

- GIVEN `SHELL_ROUTES` y los helpers
- WHEN se inspecciona la tabla de rutas resultante
- THEN las ocho rutas del shell usan el layout app shell y las dos de auth usan el layout auth, sin declaraciones duplicadas de layout

### Requirement: Script anti-FOUC en index.html

`apps/web/index.html` DEBE incluir el script inline bloqueante anti-FOUC como
primer hijo de `<head>`, antes del `<link rel="stylesheet">`, conforme al
requisito "Sin flash de tema al cargar" de la spec `design-system`. La
interacción con una futura CSP (el mecanismo de nonce de app-core solo cubre
scripts del renderer, no el template estático) DEBE quedar documentada como
deuda conocida no bloqueante.

#### Scenario: Script antes del primer paint

- GIVEN `index.html`
- WHEN se inspecciona el `<head>`
- THEN el script anti-FOUC es el primer hijo y precede al `<link rel="stylesheet">`

### Requirement: Catálogo i18n extendido con escaneo por glob

El catálogo `es.json` DEBE incorporar las secciones `nav.*` (items + grupo +
ariaLabel), `theme.*`, `auth.login.*`, `auth.otp.*` y `shell.*` (skip-link,
colapso, placeholders), y las claves `smoke.*` DEBEN retirarse junto con la
página de humo. Toda cadena visible de las nuevas pantallas DEBE provenir del
catálogo vía `useT()` con claves literales `t("...")`. El test de escaneo de
claves DEBE generalizarse a un glob de `src/**/*.{tsrx,ts}` (en lugar de la
lista hardcodeada de archivos) y verificar que toda clave usada existe en el
catálogo.

#### Scenario: Escaneo por glob cubre las nuevas pantallas

- GIVEN un componente nuevo que usa `t("auth.otp.resend")`
- WHEN se ejecuta el test de escaneo i18n
- THEN la clave se detecta por glob y el test falla si no existe en `es.json`

#### Scenario: Sin claves huérfanas de humo

- GIVEN la página de humo retirada
- WHEN se inspecciona el catálogo y las fuentes
- THEN no quedan usos de claves `smoke.*` en el código

### Requirement: Smoke test de arranque

`apps/web` DEBE incluir un smoke test ejecutable con `bun test` que verifique el
render básico de la página de humo o de la configuración i18n.

#### Scenario: Smoke test verde

- GIVEN el workspace instalado
- WHEN se ejecuta `bun test` en `apps/web`
- THEN el smoke test pasa

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
- THEN todos los bindings adoptados figuran con versión exacta y el lockfile commitado las resuelve

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
