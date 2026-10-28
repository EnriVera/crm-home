# ODD — web-v3 auth login + OTP

Feature: `/login` y `/login-verification` funcionales en apps/web-v3. Primera pantalla
real: ejercita guard `auth.global.ts`, orpc contra `@crm/contract`, vendor wrapper
`@zag-js/pin-input`, contrato §11.5 (loading/error inline).

Workflow: LayerFS (`./lf fork odd-web-v3-auth-login` → implementar → land → commit
`feat(web-v3):`, prefix PRD §15.1).

## Contrato (fuentes normativas)

- PRD-v4 §8.2 (login + OTP), §9.2, §11.5 motion/estados, §12.4 guard
- PRD-v2 §8.2 (funcional), §11 (schema user/login/session)
- Catálogo: `login.png`, `otp.png`
- `@crm/contract` auth procedures (misma fuente que web-v2)

## Alcance

- Views login.vue + login-verification.vue reales (reemplazan stubs)
- Vendor wrapper pin-input (OTP, preserva ceros) + email form
- Wiring orpc client (plugin) contra contract.auth.requestOtp / verifyOtp
- Estados §11.5: botón "Enviando…", shimmer OTP, error inline, resend timer
- Guard auth.global.ts ya existe; verificar redirect flow funciona
- Tests unitarios de las views (vitest + testing-library)

## No-goals

- Dashboard ni ninguna otra pantalla; logout y "olvidé mi email".

## Estado (cerrado 2026-10-28)

**Feature ENTREGADO y verificado en runtime.** Commits: `baca63b`
(feat, app web-v3) + `625eb58` (fix deps). Store `main` y disco convergidos.

**Replay + land**: el branch `odd-web-v3-auth-login` se forkeó ANTES del fix de
routing, así que su base estaba stale (router.options.ts y nuxt.config.ts viejos).
Se re-baseó sobre el `main` sincronizado (branch `odd-web-v3-auth-login-v2`) y se
landeó con `lf land` — 24 archivos, 0 omitidos.

**Tres bloqueos reales encontrados al verificar (build ≠ runtime)**:

1. **Store `main` stale**: faltaba el pase de prettier (`1e8da44`) y `i18n/`. Como
   `lf land` compara el disco contra `main` antes de escribir, todo se saltaba por
   "local edits". Se sincronizó con un branch `sync-web-v3` + `lf ship`.
2. **Dos instancias de Vue/pinia**: `apps/web-v3` declaraba `vue`/`pinia` con `^`,
   así que bun le instaló copias propias (3.5.44 / 4.1.0) junto a las de la raíz
   (3.5.43 / 4.0.3). Los tests de OtpInput fallaban con "withDirectives can only
   be used inside render functions". Fix: pins exactos en ambos frontends +
   `resolutions` de `@vue/*` en el root package.json.
3. **`useRoute()` congelado**: la app renderiza por `<RouterView />` (§12.3), no
   por `<NuxtPage />`, así que Nuxt nunca sincroniza `nuxtApp._route` y el query
   que lee login-verification quedaba vacío → la vista rebotaba a /login.
   Fix: `app/plugins/route-sync.ts` sincroniza en `router.afterEach`.
   Además, el plugin de restore debe pasar `nuxtApp.$pinia` explícito: fuera del
   setup de un componente `useStore()` cae al active instance de pinia, que
   @pinia/nuxt limpia tras el render.

**Verificación (no solo build)**: flujo completo contra la API real (Postgres +
Mailpit): login → requestOtp (200) → OTP leído de la DB → verifyOtp (verdict
`valid` + cookie httpOnly) → session (user) → dashboard. Recarga mantiene sesión;
`/tasks` sin sesión redirige a `/login?redirect=/tasks`; el redirect se preserva
al volver del login; OTP incorrecto → error inline y casillas limpiadas; build de
producción servido y verificado en navegador (200 + app montada).

**PRD actualizado**: §12.1 y §12.3 ya no dicen `pages: false` — documentan el
mecanismo real (pages module on + routes como función + sync de `_route`).

**Descartado**: el trace `ERR_PACKAGE_PATH_NOT_EXPORTED` de @vue/language-core
ya no aparece (venía de la duplicación de @vue/*).
