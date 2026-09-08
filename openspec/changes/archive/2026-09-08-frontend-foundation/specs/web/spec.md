# Delta for Web

> Change: `frontend-foundation` · Delta sobre la spec `web` del scaffold.
> NOTA DE BASELINE: `openspec/specs/web/spec.md` aún no existe porque
> `monorepo-scaffold` no fue archivado; este delta se escribe contra
> `openspec/changes/monorepo-scaffold/specs/web/spec.md` como baseline de facto
> (verificado). Al archivarse ambos changes, el orden de aplicación importa:
> `monorepo-scaffold` primero, `frontend-foundation` después.

## ADDED Requirements

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

## MODIFIED Requirements

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
