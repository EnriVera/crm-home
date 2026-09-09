# Sync Report — backend-auth

> Archive-time sync fallback executed with explicit parent/orchestrator approval
> (native status indicated `sync-report.md` missing and `archive: ready`).
> Change: `backend-auth` · Branch: `develop` · Date: 2026-09-09

## Status

- **Sync verdict:** ✅ success
- **Archive-time fallback:** approved by parent prompt
- **Same-domain active changes:** none
- **Destructive merges (REMOVED requirements):** none

## Domains synced

| Domain | Operation | Canonical path |
| -------- | ----------- | ---------------- |
| `api-auth` | NEW full spec copied | `openspec/specs/api-auth/spec.md` |
| `api` | MODIFIED 1 requirement | `openspec/specs/api/spec.md` |
| `web-auth-ui` | ADDED 1 requirement, MODIFIED 2 requirements | `openspec/specs/web-auth-ui/spec.md` |
| `web-shell` | ADDED 1 requirement, MODIFIED 1 requirement | `openspec/specs/web-shell/spec.md` |
| `web` | MODIFIED 1 requirement | `openspec/specs/web/spec.md` |

## Requirement deltas applied

### ADDED

- `web-auth-ui`: **Adapter OtpVerifier real vía RPC**
- `web-shell`: **Guard de sesión en las rutas del shell**

### MODIFIED

- `api`: **Kysely cableado con migraciones versionadas** (replaced previous
  "Kysely cableado sin migraciones" block)
- `web-auth-ui`: **Máquina de estados OTP tras el puerto OtpVerifier**
- `web-auth-ui`: **Pantalla /login con validación client-side**
- `web-shell`: **Rutas destino del shell como placeholders protegidos**
- `web`: **Redirect de la ruta raíz según sesión** (replaced previous
  "Redirect de la ruta raíz a /login" block)

### REMOVED

- None.

## Merge notes

- `api-auth` did not exist in `openspec/specs/`; the change spec was copied as
  the full domain spec.
- For `api` and `web`, the delta requirement name changed from the canonical
  baseline; the old canonical requirement block was identified via the
  `(Previously: ...)` annotation in the delta and replaced with the new block.
- All other canonical requirements were preserved.
- No requirement block was deleted.
- `pi-lens` autofixed markdown formatting on the newly written/canonical spec
  files during the sync; the semantic content was unchanged.

## Warnings

- No active same-domain changes detected.
- No destructive canonical spec removals performed.

## Next step

Archive the change after writing `archive-report.md` and confirming the Final
Task Completion Gate.
