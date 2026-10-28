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

- Dashboard ni ninguna otra pantalla; sesión persistida (la session cookie viaja
  por orpc credentials include, el store auth se hidrata en feature posterior);
  "olvidé mi email" / logout.
