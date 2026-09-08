# Sync Report — stack-alignment

Archive-time sync fallback performed with explicit parent approval.

## Domains synced

| Domain | Operation | Canonical path |
| --- | --- | --- |
| api | ADDED requirement | `openspec/specs/api/spec.md` |
| design-system | ADDED requirement | `openspec/specs/design-system/spec.md` |
| vendor-bindings | NEW spec | `openspec/specs/vendor-bindings/spec.md` |
| web-auth-ui | MODIFIED requirements | `openspec/specs/web-auth-ui/spec.md` |
| web-shell | MODIFIED requirements | `openspec/specs/web-shell/spec.md` |
| web | MODIFIED + ADDED requirements | `openspec/specs/web/spec.md` |

## ADDED Requirements

| Domain | Requirement Name |
| --- | --- |
| api | Base fundacional effect y xstate instalada y confinada |
| design-system | Verificacion de bundle y SSR de bindings visuales |
| vendor-bindings | Instalacion pineada de bindings con consumidor inmediato |
| vendor-bindings | Stack base declarado instalado con limitaciones documentadas |
| vendor-bindings | Regla de wrapper reforzada y auditable |
| vendor-bindings | Base fundacional de api cableada en un adapter inicial minimo |
| vendor-bindings | Diferidos registrados con su change consumidor |
| vendor-bindings | Correcciones documentales del stack |
| vendor-bindings | Criterios verificables globales del change |
| web | Dependencias de bindings pineadas en apps/web |
| web | Wrappers minimos de toast y error-boundary bajo vendor/ |

## MODIFIED Requirements

| Domain | Requirement Name |
| --- | --- |
| web-auth-ui | Wrapper vendor/otp-input con contrato estable |
| web-auth-ui | Maquina de estados OTP tras el puerto OtpVerifier |
| web-shell | Sidebar redimensionable con colapso y estado persistido |
| web-shell | Iconos via wrapper vendor/icons con set cerrado |
| web | i18next con espanol por defecto |

## REMOVED Requirements

None.

## Same-domain active change warnings

No other active changes under `openspec/changes/` touch the synced domains.

## Notes

- `openspec/config.yaml` was already updated in the working tree during apply (commit `d287992` body declares this); no additional config sync was needed by this archive-time fallback.
- Addenda to `frontend-foundation` specs were applied during the apply phase and are present in the working tree; they are not part of this canonical spec sync because that change is already archived.
