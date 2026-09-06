# Apply Progress — frontend-foundation

> Artefacto consolidador de la fase apply. Regenerado en remediación (CRITICAL-1 del verify-report inicial): la evidencia RED→GREEN siempre existió en código y tasks.md; este documento la consolida.

## Commits (develop)

| Commit | Contenido |
| --- | --- |
| `4d5d843` | feat(web): tokens semánticos completos, variante dark por clase y anti-FOUC |
| `129955e` | feat(web): componentes base y wrappers vendor/icons y vendor/otp-input |
| `7ed441d` | feat(web): app shell con sidebar, rutas placeholder y redirect de / |
| `e26052b` | feat(web): login y verificación OTP (UI) |

## TDD Cycle Evidence

Modo: STRICT TDD (`openspec/config.yaml` → `testing.strict_tdd: true`, runner `bun test`). Ciclos RED → GREEN → TRIANGULATE → REFACTOR sobre la lógica TS pura (patrón headless D10). Cabecera de cada archivo de test documenta su fase RED; tasks.md registra las fases por bloque.

| # | Unidad bajo test | Archivo de test | RED (evidencia) | GREEN | TRIANGULATE / REFACTOR |
| --- | --- | --- | --- | --- | --- |
| 1 | Theme core (`resolveTheme`, `isPublicPath`, `PUBLIC_PATHS`) | `apps/web/src/lib/theme/core.test.ts` | Cabecera RED documentada; falló contra módulo inexistente | 6 tests verdes | Casos: pública→SO, shell→localStorage, `system`→SO; refactor: store y `use-theme` aislados |
| 2 | Árbol de navegación (árbol PRD §7 como datos) | `apps/web/src/lib/nav/tree.test.ts` | Cabecera RED; falló contra módulo inexistente | Verde | Triangulación: rutas, grupos Finance, orden; consistencia nav↔tabla de rutas |
| 3 | Redirect `/` → `/login` (middleware puro) | `apps/web/src/lib/nav/redirect.test.ts` | Cabecera RED; typecheck-hook detectó módulo inexistente | Verde | Aserciones: status 302, `Location: /login`, nunca llama `next` |
| 4 | Validación de email | `apps/web/src/lib/validation/email.test.ts` | Cabecera RED | Verde | Triangulación: casos válidos/inválidos múltiples |
| 5 | Máquina OTP (intentos, expiración, transiciones) | `apps/web/src/lib/otp/otp-machine.test.ts` | RED registrado por el runner (12 fallos en el batch RED de Commit 4) | Verde | Aserciones: 5→4 intentos, bloqueo sin llamar al verifier, `expired`, reset, transiciones inválidas; constantes como datos (`OTP_MAX_ATTEMPTS=5`, `OTP_EXPIRES_MINUTES=10`, `OTP_CODE_LENGTH=6`) |
| 6 | Máquina del wrapper OtpInput (ceros a la izquierda, paste, teclado) | `apps/web/src/components/vendor/otp-input/machine.test.ts` | Cabecera RED | Verde | Triangulación: paste `"041283"` → `["0","4","1","2","8","3"]` + `onComplete("041283")`; auto-avance y backspace |
| 7 | Escaneo estático de claves i18n (catálogo `es.json`) | `apps/web/src/lib/i18n/i18n.test.ts` | Cabecera RED | Verde | Auto-verificación: clave borrada es detectada (el chequeo muerde); verifica `labelKey` dinámicas del árbol de nav |

## Estado final de tests

- `bun test` (raíz): **43 pass / 0 fail / 189 assertions / 8 archivos** (exit 0).
- Calidad de aserciones (auditado por sdd-verify): sin tautologías, ghost loops ni smoke-only; verifican estados, valores y transiciones concretas.

## Notas de proceso

- Fallback D1 aplicado: zag-js v1 eliminó el runtime vanilla de servicio; `vendor/otp-input` quedó hand-rolled con el mismo contrato `OtpInputProps` (documentado en `vendor/otp-input/README.md`).
- Detector impeccable ejecutado una vez sobre `apps/web/src`: `[]` (sin findings mecánicos).
- `verify-report.md` inicial: FAIL solo por ausencia de este artefacto (CRITICAL-1); implementación íntegra 26/26 requisitos, 46/46 escenarios.
