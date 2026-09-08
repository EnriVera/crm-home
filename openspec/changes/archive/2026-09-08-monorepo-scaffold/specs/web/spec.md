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
catálogo i18n (regla `language_ui: es` del proyecto).

#### Scenario: Página renderiza en español por defecto

- GIVEN `apps/web` levantado en modo dev sin configuración de idioma del navegador forzada
- WHEN se carga la ruta inicial
- THEN los textos visibles provienen del catálogo i18n en español (no hay cadenas hardcodeadas en inglés)

### Requirement: Ruta inicial mínima y base de router

`apps/web` DEBE incluir la base de tanstack router bajo `src/routes/` y una
página mínima de humo que renderice a través de la estructura (componentes +
i18n), sin lógica de negocio. La tabla canónica de rutas del PRD §7 queda
diferida a changes futuros.

#### Scenario: Página de humo renderiza en dev

- GIVEN `apps/web` levantado en modo dev
- WHEN se navega a la ruta inicial
- THEN la página de humo renderiza sin errores usando la estructura de componentes y textos i18n en español

### Requirement: Tokens de estilo semánticos

`apps/web` DEBE incluir `src/styles/tokens.css` con tokens semánticos para tema
claro y oscuro (incluidos primary verde, surface y text), como base del sistema
de diseño del PRD §9.

#### Scenario: Tokens claro/oscuro definidos

- GIVEN el archivo `src/styles/tokens.css`
- WHEN se inspeccionan los tokens
- THEN existen tokens semánticos de color (primary, surface, text) definidos para ambos temas, claro y oscuro

### Requirement: Smoke test de arranque

`apps/web` DEBE incluir un smoke test ejecutable con `bun test` que verifique el
render básico de la página de humo o de la configuración i18n.

#### Scenario: Smoke test verde

- GIVEN el workspace instalado
- WHEN se ejecuta `bun test` en `apps/web`
- THEN el smoke test pasa
