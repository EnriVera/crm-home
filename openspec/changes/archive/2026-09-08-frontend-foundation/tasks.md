# Tasks — frontend-foundation

> Change SDD: `frontend-foundation` (CRM-HOME) · Fase: tasks
> STRICT TDD activo (sin excepción para este change). Runner: `bun test` en
> workspace raíz. Ciclo RED → GREEN → TRIANGULATE → REFACTOR en toda lógica TS
> pura (patrón D10: máquinas, helpers, tokens como datos, escaneo estático).
> Los componentes `.tsrx` se verifican por tests estáticos + verificación
> funcional, NO por tests de DOM.
> Commits: Conventional Commits (husky + commitlint) en rama `develop`.

## Review Workload Forecast

| Field | Value |
| ------- | ------- |
| Estimated changed lines | ~1400–2000 (tokens.css ~120 · lib/theme+nav+validation+otp ~700 con tests · wrappers vendor ~380 · atoms/molecules/organisms ~650 · layouts+pages+entries ~350 · octane.config+index.html ~100 · es.json+i18n test ~110 · DESIGN.md+surface briefs ~200 docs) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (design-system: tokens+theme+anti-FOUC) → PR 2 (web-shell: wrappers, componentes base, sidebar, placeholders, redirect /) → PR 3 (web-auth-ui: login+OTP+i18n cierre) — alineado a las 4 specs y a los commits atómicos del design §6 |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

```text
Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High
```

> Nota para el orquestador: con `ask-on-risk` y estimación ≫400 líneas, el
> usuario decide `size:exception` (4 commits atómicos, review por commit) vs
> split encadenado (design-system → web-shell + web-auth-ui). El desglose
> siguiente sirve para ambas: Commit 1 = change/PR design-system; Commits 2–3 =
> web-shell; Commit 4 = web-auth-ui.

---

## Commit 1 — `feat(web): tokens semánticos completos, variante dark por clase y anti-FOUC`

Cubre: design-system R1 (tokens 3 capas), R2 (variante dark), R3 (tokens
estado/foco), R5 (resolución de tema), R6 (anti-FOUC); web delta "Script
anti-FOUC" y "Tokens de estilo semánticos". (D6, D7)

- [x] RED: crear `apps/web/src/lib/theme/core.test.ts` con tests de `resolveTheme(setting, systemDark)` (light/dark/system × SO claro/oscuro) y de `isPublicPath()` para `/login`, `/login-verification`, `/terms`, `/privacy`, `/cookies` (públicas) y `/dashboard`, `/` (no públicas); ejecutar `bun test` y registrar evidencia del fallo (módulo inexistente). <!-- sdd-owner: implementation -->
- [x] GREEN: implementar `apps/web/src/lib/theme/core.ts` con `Theme`, `ThemeSetting`, `STORAGE_KEY = "crm-theme"`, `resolveTheme()` e `isPublicPath()` hasta que el test pase. <!-- sdd-owner: implementation -->
- [x] TRIANGULATE: agregar casos edge al test (setting desconocido → fallback `system`; paths con query string; prefijos `/login-verification/...`); verificar que siguen verdes sin tocar la implementación, o ajustar mínimamente. <!-- sdd-owner: implementation -->
- [x] REFACTOR: extraer la lista de rutas públicas a constante exportada `PUBLIC_PATHS` (la reutiliza el comentario cruzado del script anti-FOUC); tests verdes. <!-- sdd-owner: implementation -->
- [x] Implementar `apps/web/src/lib/theme/source.ts` (puerto `ThemePreferenceSource`, `LocalStorageThemeSource`, `SystemThemeSource`), `store.ts` (`createThemeStore` con `getSnapshot`/`getServerSnapshot`/`subscribe`/`setTheme`, aplica clase `.dark` en `<html>`) y `use-theme.ts` (`useTheme()` vía `useSyncExternalStore`; único import de octane en `lib/theme`). <!-- sdd-owner: implementation -->
- [x] Reescribir `apps/web/src/styles/tokens.css` en tres capas según D6: `@theme` estático (escala primary-50…900 + Poppins sin cambios), variables semánticas `:root`/`.dark` con los valores exactos de la tabla D6.2 (incluidos `--color-error`, `--color-success`, `--color-focus` y `color-scheme` por bloque), y registro `@theme inline` de las 9 variables semánticas. <!-- sdd-owner: implementation -->
- [x] Agregar `@custom-variant dark (&:where(.dark, .dark *));` en `tokens.css` y eliminar cualquier uso de arbitrary value `bg-(--color-…)` en fuentes existentes, reemplazándolo por utilities semánticas. <!-- sdd-owner: implementation -->
- [x] Insertar el script inline anti-FOUC como primer hijo de `<head>` en `apps/web/index.html` (antes del `<link rel="stylesheet">`), con la lógica exacta de D6.6 y comentario cruzado a `lib/theme/core.ts` ("si cambias una, cambia la otra") + comentario de deuda conocida sobre CSP nonce. <!-- sdd-owner: implementation -->
- [x] Verificación funcional: levantar `apps/web` en dev, comprobar en ambos temas que `dark:` responde a la clase (no a media query), que no hay flash de tema al recargar con `crm-theme=dark` en una ruta de shell y que `/login` sigue al SO ignorando la preferencia guardada. <!-- sdd-owner: implementation -->
- [x] Ejecutar `bun test` en raíz (verde) y commitear: `feat(web): tokens semánticos completos, variante dark por clase y anti-FOUC`. <!-- sdd-owner: implementation -->

## Commit 2 — `feat(web): componentes base y wrappers vendor/icons y vendor/otp-input`

Cubre: design-system R4 (regla contraste aplicada) y R7 (componentes base);
web-shell R5 (íconos wrapper); web-auth-ui R3 (wrapper OtpInput) y R4 (ceros a
la izquierda). (D1, D4, D6.5, D8 atoms/molecules)

- [x] Instalar y pinear dependencias en `apps/web/package.json`: `bun add @zag-js/pin-input @zag-js/core` (versiones exactas, lockfile commitado); verificar que ningún otro paquete las re-exporta. <!-- sdd-owner: implementation -->
- [x] RED: crear `apps/web/src/components/vendor/otp-input/machine.test.ts` con tests headless de la máquina zagjs (`@zag-js/core` sin DOM): tipeo dígito a dígito, backspace que retrocede, paste `"041283"` → slots `["0","4","1","2","8","3"]` con ceros preservados, `onComplete` recibe el string `"041283"`; registrar evidencia del fallo. <!-- sdd-owner: implementation -->
- [x] GREEN: implementar `apps/web/src/components/vendor/otp-input/` (máquina pin-input + `normalizeProps` vanilla con comentario de provenance + wiring de ciclo de vida) exponiendo `OtpInput` con la interfaz `OtpInputProps` exacta de D1; celdas con `inputmode="numeric"`, `pattern="[0-9]*"`, `autocomplete="one-time-code"`, NUNCA `type="number"`. <!-- sdd-owner: implementation -->
- [x] TRIANGULATE: agregar al test paste parcial (`"412"` en posición 2), rechazo de caracteres no numéricos, `length` distinto de 6, `disabled`/`invalid`; mantener verde. <!-- sdd-owner: implementation -->
- [x] REFACTOR: aislar `normalizeProps` en su propio módulo del wrapper con documentación de mapeos (`htmlFor`→`for`, `onChange`→`oninput`, data-attrs); tests verdes. <!-- sdd-owner: implementation -->
- [x] Verificación estática del contrato de wrapper: grep que confirma que `@zag-js/*` solo se importa bajo `components/vendor/otp-input/` (dejar el comando anotado como verificación repetible). <!-- sdd-owner: implementation -->
- [x] Crear `apps/web/src/components/vendor/icons/` con paths SVG inline vendored de phosphor-icons (README con provenance, licencia MIT y versión de origen), componente `Icon` con union cerrada `IconName` (house, check-square, calendar, users, wallet, arrow-down-circle, arrow-up-circle, arrows-left-right, gear, sun, moon, sidebar); sin dependencia nueva. <!-- sdd-owner: implementation -->
- [x] Crear atoms en `apps/web/src/components/atoms/`: `button` (primary = relleno verde + texto blanco; ghost), `text-input`, `status-message` (variantes error/success con tokens `text-error`/`text-success`), `skip-link`; todos con foco visible `focus-visible:` usando `--color-focus` (outline 2px + offset 2px), sin hex literales. <!-- sdd-owner: implementation -->
- [x] Crear molecules en `apps/web/src/components/molecules/`: `form-field` (label + input + error con `aria-invalid`/`aria-describedby`), `nav-item` (`<a>` + Icon + label + `aria-current`), `nav-group` (encabezado no clicable + lista de hijos), `theme-toggle` (sun/moon); aplicando la regla de contraste D6.5 (texto interactivo pequeño en claro: `primary-700`+; oscuro: `primary-400/500`). <!-- sdd-owner: implementation -->
- [x] Verificación estática de la regla §9: grep `#[0-9a-fA-F]{3,6}` y familias tipográficas literales en `src/components/` → cero coincidencias; grep de imports de íconos fuera de `vendor/icons/` → cero. <!-- sdd-owner: implementation -->
- [x] Ejecutar `bun test` en raíz (verde) y commitear: `feat(web): componentes base y wrappers vendor/icons y vendor/otp-input`. <!-- sdd-owner: implementation -->

## Commit 3 — `feat(web): app shell con sidebar, rutas placeholder y redirect de /`

Cubre: web-shell R1 (layout), R2 (árbol §7), R3 (estado activo), R4 (colapso
persistido), R6 (a11y nav), R7 (placeholders + shellRoute); web delta "Redirect
/", "Tabla de rutas ampliada", "Ruta inicial mínima" (modified). (D2, D3, D5, D8)

- [x] RED: crear `apps/web/src/lib/nav/tree.test.ts` con tests del árbol canónico §7 (orden exacto: Dashboard, Tareas, Schedule, Clients, Finance[grupo no clicable: Income/Expenses/Transfers], Config), de `pathnameOf`/`isItemActive`/`isGroupActive` (`lib/nav/active.ts`), y de consistencia: hrefs del árbol ≡ `SHELL_ROUTES`; registrar evidencia del fallo. <!-- sdd-owner: implementation -->
- [x] GREEN: implementar `apps/web/src/lib/nav/routes.ts` (`SHELL_ROUTES` exportada), `tree.ts` (árbol con claves i18n `nav.*` e íconos D4) y `active.ts` (lógica pura de D3) hasta verde. <!-- sdd-owner: implementation -->
- [x] TRIANGULATE: agregar casos al test: url con query (`/incomes?page=2`), grupo inactivo, ruta desconocida (ningún item activo); mantener verde. <!-- sdd-owner: implementation -->
- [x] RED: crear test del middleware de redirect `/` (p. ej. `apps/web/src/lib/nav/redirect.test.ts`): dado un Context de request a `/`, devuelve `Response` 302 con `Location: /login` (Response construible sin DOM en bun); registrar evidencia del fallo. <!-- sdd-owner: implementation -->
- [x] GREEN: implementar la función de middleware de redirect (TS puro) hasta verde. <!-- sdd-owner: implementation -->
- [x] Crear `apps/web/src/routes/__app-shell.tsrx`: SkipLink como primer elemento focalizable → `<div flex>` con `SidebarNav` + `<main id="content">`; el layout consume `props.url` (RenderRouteProps) para el estado activo, sin `window.location`. <!-- sdd-owner: implementation -->
- [x] Crear `apps/web/src/components/organisms/sidebar-nav`: `<nav aria-label={t("nav.ariaLabel")}>` con `<ul>`, NavItem/NavGroup con `aria-current="page"` en el activo, `ThemeToggle`, y toggle de colapso en el pie (botón nativo, estados 260px/64px, labels accesibles vía `title`+`aria-label` en colapsado) persistido en `localStorage` (`crm-sidebar`). <!-- sdd-owner: implementation -->
- [x] Crear `apps/web/src/components/pages/placeholder-page` (AppTitle + texto i18n `shell.placeholder`) y las 8 entries `apps/web/src/routes/{dashboard,tasks,schedules,clients,incomes,expenses,transfers,config}.tsrx` sin lógica de módulos ni guards. <!-- sdd-owner: implementation -->
- [x] Reescribir `apps/web/octane.config.ts`: helpers `shellRoute(path, entry)` y `authRoute(path, entry)` (D5), tabla generada desde `SHELL_ROUTES`, y `/` como `RenderRoute` con `before` = middleware de redirect + entry fallback con anchor a `/login` (retirar el montaje de SmokePage de `/`). <!-- sdd-owner: implementation -->
- [x] Agregar secciones `nav.*` y `shell.*` (skipToContent, collapse/expand, placeholder) a `apps/web/src/lib/i18n/locales/es.json` y retirar las claves `smoke.*` junto con la página de humo. <!-- sdd-owner: implementation -->
- [x] Verificación funcional: en dev, navegar el árbol completo por anchors (full page load), confirmar `aria-current` correcto en SSR e hidratación sin mismatch, colapso persistido entre páginas, skip-link como primer foco, `/` respondiendo 302 a `/login`, y contraste del item activo (`primary-700` en claro). <!-- sdd-owner: implementation -->
- [x] Ejecutar `bun test` en raíz (verde) y commitear: `feat(web): app shell con sidebar, rutas placeholder y redirect de /`. <!-- sdd-owner: implementation -->

## Commit 4 — `feat(web): login y verificación OTP (UI)`

Cubre: web-auth-ui R1 (layout público + footer), R2 (/login), R5 (máquina OTP +
puerto), R6 (/login-verification); web delta "Catálogo i18n extendido con
escaneo por glob". (D9, D10)

- [x] RED: crear `apps/web/src/lib/validation/email.test.ts` con tests de `isValidEmail()` (válidos comunes, inválidos sin @/sin dominio/con espacios, edge: `a@b.co`, plus-addressing); registrar evidencia del fallo. <!-- sdd-owner: implementation -->
- [x] GREEN: implementar `apps/web/src/lib/validation/email.ts` hasta verde. <!-- sdd-owner: implementation -->
- [x] RED: crear `apps/web/src/lib/otp/otp-machine.test.ts` con tests de la máquina (`idle → ready → submitting → error | expired`): código inválido consume un intento (5→4), bloqueo al agotar intentos (no llama al verifier), expiración como dato (10 min), código como string con ceros a la izquierda; `FakeOtpVerifier` siempre `invalid` tras latencia simulada; registrar evidencia del fallo. <!-- sdd-owner: implementation -->
- [x] GREEN: implementar `apps/web/src/lib/otp/otp-machine.ts` con el puerto `OtpVerifier { verify(code): Promise<Verdict> }` y `FakeOtpVerifier`, intentos/expiración como DATOS de la máquina (nunca strings en componentes), hasta verde. <!-- sdd-owner: implementation -->
- [x] TRIANGULATE: agregar al test transiciones inválidas (submit desde `idle`, submit con código incompleto), verifier que responde `expired`, reset tras error; mantener verde; REFACTOR: extraer tipos `OtpState`/`Verdict` si emergen duplicaciones. <!-- sdd-owner: implementation -->
- [x] Crear `apps/web/src/routes/__auth.tsrx`: layout público centrado con footer de anchors reales a `/terms`, `/privacy`, `/cookies` (labels i18n; sin crear páginas legales placeholder) y composición con `SystemThemeSource` (sin toggle de tema, PRD §6.8). <!-- sdd-owner: implementation -->
- [x] Crear `apps/web/src/components/organisms/login-form` y `apps/web/src/components/pages/login-page` + entry `apps/web/src/routes/login.tsrx`: card `max-w-sm`, título/subtítulo i18n, FormField email (`type="email"`, `autocomplete="email"`), único botón primario, error inline con `aria-invalid`/`aria-describedby`, y navegación a `/login-verification?email=<encodeURIComponent(email)>` solo si válido. <!-- sdd-owner: implementation -->
- [x] Crear `apps/web/src/components/organisms/otp-form` y `apps/web/src/components/pages/login-verification-page` + entry `apps/web/src/routes/login-verification.tsrx`: lee `email` del query (ausente → mensaje i18n + link a `/login`; presente → subtítulo con el email), `OtpInput` (D1), link "volver", texto de reenvío deshabilitado (fake), mensajes de error/expiración con tokens de estado, composición con `FakeOtpVerifier`. <!-- sdd-owner: implementation -->
- [x] Registrar `/login` y `/login-verification` en `octane.config.ts` con el helper `authRoute` y agregar secciones `auth.login.*` y `auth.otp.*` a `es.json` (incluye mensajes de la máquina: error, intentos restantes, expiración, reenvío). <!-- sdd-owner: implementation -->
- [x] Generalizar `apps/web/src/lib/i18n/i18n.test.ts` a glob `src/**/*.{tsrx,ts}` (reemplazando la lista hardcodeada) verificando que toda clave literal `t("...")` existe en `es.json`; confirmar que falla si se borra una clave (auto-verificación del test) y que no quedan usos de `smoke.*`. <!-- sdd-owner: implementation -->
- [x] Crear `DESIGN.md` (raíz, autoridad visual: mundo minimalista verde/Poppins, regla de contraste D6.5, foco canónico) y `.impeccable/surface-briefs/{app-shell,auth}.md` (briefs + direction contract por superficie). <!-- sdd-owner: implementation -->
- [x] Verificación funcional: flujo completo `/login` → email inválido (error accesible, sin navegación) → email válido → `/login-verification?email=…` con paste `041283` preservando ceros → estados error/expiración visibles con tokens; footer legal presente; tema del SO sin toggle en ambas páginas. <!-- sdd-owner: implementation -->
- [x] Ejecutar `bun test` en raíz (verde, incluidos los 7 grupos de tests nuevos del design §5) y commitear: `feat(web): login y verificación OTP (UI)`. <!-- sdd-owner: implementation -->

## Verificación final del change (post-commit 4, antes de archive)

- [x] Checklist de criterios de éxito de la proposal §6: `bun test` verde; tokens.css única fuente (grep sin hex fuera de tokens); sin FOUC en ambos temas; sidebar §7 con `aria-current`, skip-link y foco visible; `/login`→`/login-verification` con ceros preservados y wrapper bajo `vendor/`; contraste AA en ambos temas; toda cadena en `es.json` vía `useT()`. <!-- sdd-owner: implementation -->
