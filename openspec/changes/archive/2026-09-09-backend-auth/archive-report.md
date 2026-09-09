# Archive Report — backend-auth

> Change: `backend-auth` · Repository: `/run/media/enri/DISCO DURO/crm-home/crm`
> Branch: `develop` · Archive date: 2026-09-09
> Artifact store: openspec

## Archive status

- **Status:** ✅ archived
- **Verification:** PASS (17/17 requirements, 45/45 scenarios, 0 blockers/criticals)
- **Implementation tasks:** 93/93 complete, 0 unchecked
- **Sync:** archive-time fallback completed successfully
- **Move target:** `openspec/changes/archive/2026-09-09-backend-auth/`

## Artifacts read

- [x] `openspec/changes/backend-auth/proposal.md`
- [x] `openspec/changes/backend-auth/design.md`
- [x] `openspec/changes/backend-auth/tasks.md`
- [x] `openspec/changes/backend-auth/apply-progress.md` (referenced; not edited)
- [x] `openspec/changes/backend-auth/verify-report.md`
- [x] `openspec/changes/backend-auth/specs/api-auth/spec.md` (new domain)
- [x] `openspec/changes/backend-auth/specs/api/spec.md` (delta)
- [x] `openspec/changes/backend-auth/specs/web-auth-ui/spec.md` (delta)
- [x] `openspec/changes/backend-auth/specs/web-shell/spec.md` (delta)
- [x] `openspec/changes/backend-auth/specs/web/spec.md` (delta)
- [x] `openspec/config.yaml`

## Domains synced into canonical specs

| Domain | Operation | Canonical spec |
| -------- | ----------- | ---------------- |
| `api-auth` | NEW full spec | `openspec/specs/api-auth/spec.md` |
| `api` | MODIFIED 1 requirement | `openspec/specs/api/spec.md` |
| `web-auth-ui` | ADDED 1, MODIFIED 2 requirements | `openspec/specs/web-auth-ui/spec.md` |
| `web-shell` | ADDED 1, MODIFIED 1 requirement | `openspec/specs/web-shell/spec.md` |
| `web` | MODIFIED 1 requirement | `openspec/specs/web/spec.md` |

## Requirement deltas applied

### ADDED

- `web-auth-ui`: Adapter OtpVerifier real vía RPC
- `web-shell`: Guard de sesión en las rutas del shell

### MODIFIED

- `api`: Kysely cableado con migraciones versionadas
- `web-auth-ui`: Máquina de estados OTP tras el puerto OtpVerifier
- `web-auth-ui`: Pantalla /login con validación client-side
- `web-shell`: Rutas destino del shell como placeholders protegidos
- `web`: Redirect de la ruta raíz según sesión

### REMOVED

- None.

## Same-domain active change warnings

- None. Native status reported `sameDomainActiveChanges: []` and `collisions: []`.

## Final Task Completion Gate

- Re-read `openspec/changes/backend-auth/tasks.md` immediately before archive
  write/move.
- No `- [ ]` implementation task markers found.
- Native status: `taskProgress.total = 93`, `complete = 93`, `remaining = 0`,
  `unchecked = []`.
- No stale-checkbox reconciliation required.

## Structured status and action context

- `artifactStore`: openspec
- `apply`: all_done
- `verify`: ready / PASS
- `archive`: ready → archived
- `actionContext.mode`: repo-local
- `allowedEditRoots`: `/run/media/enri/DISCO DURO/crm-home/crm`
- All edits confined to `openspec/` (bookkeeping only).

## Destructive merge guard

- No REMOVED requirements.
- No large destructive MODIFIED blocks (only requirement text replacements).
- No explicit destructive-merge approval required beyond parent approval for the
  archive-time sync fallback.

## Delivery / follow-up facts recorded

- Implementation: 8 commits (`357dd1c..e62666d`) on `develop`, one per work unit.
- Test results: `bun test` 129 pass / 0 fail (14 integration skips without
  `TEST_DATABASE_URL` by design; 8/8 pass with it); `bunx turbo typecheck`
  4/4; `bunx turbo lint` 3/3.
- Baseline `web-auth-ui` preserved: only the one-line verifier swap in
  `otp-form.tsrx`.
- Delivery decision: chained PRs, stacked-to-main — PR slicing still pending
  (future settle/delivery step, not part of this archive).
- Non-blocking follow-ups:
  - `SESSION_COOKIE_SECURE` defaults to `true`; devs must set `false` for local
    HTTP testing.
  - Low infra/HTTP coverage without `TEST_DATABASE_URL` is by design
    (integration tests opt-in).
- Attempt accounting: apply attempt passed but was reset once with maintainer
  authorization (budget mis-sized 2500 vs 3931 actual); verify attempt completed
  cleanly.

## Notes

- `sync-report.md` did not exist; archive-time sync fallback was executed with
  explicit parent/orchestrator approval.
- `pi-lens` autofixed markdown formatting on the canonical spec files and the
  newly created reports; semantic content was unchanged.
- No `apps/` or `packages/` files were edited, formatted, or committed by this
  archive phase.

## Archived path

```text
openspec/changes/backend-auth/
  -> openspec/changes/archive/2026-09-09-backend-auth/
```
