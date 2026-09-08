# Archive Report — monorepo-scaffold

> Change: `monorepo-scaffold` (CRM-HOME)  
> Branch: `develop`  
> Archive date: 2026-09-08  
> Artifact store: openspec

## Archive status

**PASS** — change archived successfully.

## Preconditions checked

| Artifact | Path | Status |
| --- | --- | --- |
| Proposal | `openspec/changes/monorepo-scaffold/proposal.md` | read |
| Design | `openspec/changes/monorepo-scaffold/design.md` | read |
| Tasks | `openspec/changes/monorepo-scaffold/tasks.md` | read |
| Specs | `openspec/changes/monorepo-scaffold/specs/{api,web,workspace}/spec.md` | read |
| Apply progress | `openspec/changes/monorepo-scaffold/apply-progress.md` | missing (not required) |
| Verify report | `openspec/changes/monorepo-scaffold/verify-report.md` | read — PASS, 18/18 requirements, 28/28 scenarios, 0 blockers, 0 critical findings |
| Sync report | `openspec/changes/monorepo-scaffold/sync-report.md` | missing — archive-time sync fallback performed per parent instruction to complete openspec archive moves |
| Config | `openspec/config.yaml` | read |

## Final Task Completion Gate

Re-read `tasks.md` immediately before sync/move: **all 40 implementation tasks checked `[x]`**. No lines matching `^\s*- \[ \]` found. Gate passes.

## Verification summary

- `bun test` exit 0, 5 pass / 0 fail
- `bunx turbo run build` exit 0, 3 tasks
- `bunx turbo run typecheck` exit 0, 4/4 tasks
- `GET /health` → 200 (api dev)
- `GET /` → 200 with Spanish SSR text (web dev)
- `docker compose up -d` + `pg_isready` → healthy postgres
- 3 Conventional Commits on `develop`

Findings recorded in verify report: 4 non-blocking observations (O1–O4). No unresolved `FAIL`, `BLOCKED`, `CRITICAL`, or verification blockers.

## Canonical spec sync

`sync-report.md` was absent, so archive-time sync fallback was executed under the parent instruction to perform the full openspec archive closure.

Domains synced:

| Domain | Canonical path | Operation | Requirement names affected |
| --- | --- | --- | --- |
| `workspace` | `openspec/specs/workspace/spec.md` | ADDED (new canonical spec, full copy) | Workspace bun con workspaces `apps/*` y `packages/*`; Pipeline turborepo con fallback `bun --filter`; Tooling de entorno; Paquetes compartidos `@crm/tsconfig` y `@crm/types`; Verificación y pinning de versiones; Smoke tests verdes en workspace raíz; Commits Conventional Commits en develop |
| `api` | `openspec/specs/api/spec.md` | ADDED (new canonical spec, full copy) | Estructura clean architecture auditable por path; Endpoint GET /health operativo; OpenTelemetry con degradación a no-op; Kysely cableado sin migraciones; Smoke test de arranque |
| `web` | `openspec/specs/web/spec.md` | ADDED (new canonical spec, full copy) | Stack con versiones pineadas y verificadas; Estructura atomic design con vendor/; i18next con español por defecto; Ruta inicial mínima y base de router; Tokens de estilo semánticos; Smoke test de arranque |

No MODIFIED or REMOVED requirements were applied because the canonical specs did not exist prior to this archive.

No destructive merges were performed.

## Active same-domain change warnings

Other active changes under `openspec/changes/*/specs/{domain}/spec.md` that touch the same domains:

- `api`: `stack-alignment/specs/api/spec.md`
- `web`: `frontend-foundation/specs/web/spec.md`, `stack-alignment/specs/web/spec.md`
- `workspace`: no other active change

These are noted for future merge/conflict awareness. They did not block this archive because the canonical specs were newly created from the monorepo-scaffold deltas.

## actionContext / status findings

- `mode`: repo-local
- `workspaceRoot`: `/run/media/enri/DISCO DURO/crm-home/crm`
- `allowedEditRoots`: repo root only
- All archive paths remain within the authoritative workspace and allowed edit roots.
- `artifactStore`: openspec
- `delivery_strategy` for this change: `exception-ok` (`size:exception` accepted explicitly)

## Archived path

`openspec/changes/monorepo-scaffold/` → `openspec/changes/archive/2026-09-08-monorepo-scaffold/`

## Memory observation IDs

Not applicable — artifact store is `openspec`; no Engram persistence was performed for this report.

## Notes

- `apply-progress.md` was not present; task completion was validated via `tasks.md` and the verify report.
- `sync-report.md` was not present; the parent explicitly instructed completing the openspec archive closure, which was interpreted as approval for archive-time canonical-spec sync fallback.
- No git commit was performed per parent instruction.
