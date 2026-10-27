# Judgment Day — Ledger round 1

target_identity: docs/PRD-v4.md (1041 lines, frozen at round 1)
round: 1
skill_resolution: paths-injected (judgment-day + nuxt4-patterns + vue-patterns [A] / nuqs [B])
contradictions: none (no claim-level contradictions between judges; two severity disagreements resolved at merge: image count A=WARNING/B=CRITICAL merged CRITICAL; router.options location A=WARNING(inferred)/B=CRITICAL(framework-contract) merged CRITICAL)

## Confirmed severe (both judges → fix candidates)

| Ledger ID | Judges | Severity | Location | Claim |
| --- | --- | --- | --- | --- |
| C-01 | A-006, B-014 | CRITICAL | §15.1 | API CORS allowlist hardcodes 5173/5174 (`apps/api/src/http/composition-root.ts:131`); web-v3 on 5175 blocked on every credentialed call; backend declared "unchanged" and no work item lists the allowlist change. |
| C-02 | A-011, B-005 | CRITICAL | header, §0, §15.2.2, §18 | Catalogue holds 23 PNGs (14 screens + 9 lateral-derecho drawers), not 22; gate wording "22 pantallas + laterales" double-counts drawers. Parity surface under-specified. |
| C-03 | A-017, B-001 | CRITICAL | §11.4 tree, §12.2 | `router.options.ts` placed at `app/router/router.options.ts`; Nuxt resolves it at `<srcDir>/router.options.ts` (Nuxt 4 srcDir = `app/`). Misplaced = zero routes loaded. |

## Confirmed warnings (both judges → info, recorded)

| Ledger ID | Judges | Location | Claim |
| --- | --- | --- | --- |
| W-01 | A-009, B-007 | §9.2 vs §17 | "Nueva tarea" drawer table still lists "Estado inicial + Fecha límite" contradicting the §17 decision to omit them in v1. |
| W-02 | A-007, B-011 | §12.6, §7.2, §12.2 | Anti-regression test unsatisfiable: 15 canonical rows vs 16 route objects (catch-all missing from §7.2); `/` row carries no meta; guest middleware never referenced by any route. |
| W-03 | A-015, B-017 | §12.3 vs §11.4 | `app/layouts/` absent from the normative tree; render path app.vue → layout → view undefined; `<NuxtPage>` vs `<RouterView>` unresolved in layout section. |
| W-04 | A-005, B-013 | §260, §25, §197 | Broken cross-references: palette "§8.2" (is §11.3), delta-table "tokens (§8)" (is §11.3), "PRD-v2 §8.4.3" (does not exist). |
| W-05 | A-012, B-009 | §7.1/§7.2, §11.1 | Sidebar language inconsistent: tree/spec English labels vs catalogue Spanish (FINANZAS/Ingresos/…) in 13 screens and English (FINANCE/Incomes/…) in schedule.png; "Español único en v1" locked. Not in §17 registry. |

## Suspect severe (one judge only → no auto-fix)

| Ledger ID | Judge | Severity | Location | Claim |
| --- | --- | --- | --- | --- |
| S-01 | A-001 | CRITICAL | §8.3 | Dashboard spec omits the active-timer card mandated by PRD-v2 §8.2 (Phase 1); spec describes Phase-2 finance cards instead. Mock itself lacks the timer card. |
| S-02 | A-002 | CRITICAL | §8.3, §8.4, §17 | "vence <fecha>" / "3 vencen esta semana" / kanban due-date require a due-date column the `task` table does not have; §17 resolves only the drawer field, not the read models. |
| S-03 | A-003 | CRITICAL | §8.7, §9.2 | Income/Expenses ESTADO (Cobrado/Pendiente, Pagado/Pendiente) has no backing column; mock-vs-schema conflict missing from §17 registry. |
| S-04 | A-004 | CRITICAL | §9.2 vs §17 | Drawer field lists for ingreso/egreso omit Tipo; §17 says the drawer must include it. Normative contradiction. |
| S-05 | B-002 | CRITICAL | §12.3 | With `pages: false`, layouts must render `<RouterView />`; `<NuxtPage />` requires the pages module. **FIXED post-approval (user-authorized scope extension): §12.3 now renders `<RouterView />` with the pages-module rationale.** |
| S-06 | B-003 | CRITICAL | §12.2/§12.4 | `guest.ts` is named middleware; no route declares `meta.middleware`, so the guard never fires. **FIXED post-approval: single `auth.global.ts` reading both `meta.auth` and `meta.guest`; `guest.ts` removed from the tree and §12.4.** |
| S-07 | B-004 | CRITICAL | §10.3/§11.4/§18 | Vendor rule self-contradiction: shadcn-vue primitives prescribed in `ui/atoms/` but only `shared/vendor/` may import third-party UI; no `vendor/shadcn-vue/` row. §18 gate unpassable. **FIXED post-approval: `vendor/shadcn-vue/` row added to the §10.3 table; `ui/atoms/` now re-exports from the vendor wrapper (no third-party imports).** |

## Info (single-judge warnings/suggestions and confirmed-warning details)

- I-01 (B-006): `/tasks-config` vs `/config?tab=estados` — the states screen has two incompatible homes (dedicated route vs config tab; the image shows it inside Config). Needs one decision.
- I-02 (B-008): kanban card "sombra sutil" contradicts "sin sombras decorativas" (§11.3). Mock shows soft shadow.
- I-03 (B-010): transfers mock shows cross-currency row (Banco Nación → Efectivo USD) forbidden by §6.6; not in §17 registry.
- I-04 (B-012): PRD-DESIGN §8 (animation contract, 12 items), §9 (empty/loading/error matrix), §10 (bans) not consolidated — no animation or loading-state contract in v4.
- I-05 (B-015): §17 row about `logs_taty_id` is a false statement (column does not exist in PRD-v2 §11 nor in §13).
- I-06 (B-016): `--color-success` semantic token missing vs PRD-DESIGN §4.3.
- I-07 (B-018): Config tabs: "apariencia" tab silently merged into Perfil; apps/monedas/adjuntos CRUD semantics unspecified (PRD-v2 §8.7 read-only rules).
- I-08 (B-019/A-016): `@nuxtjs/i18n` is a build-time module (no import surface to wrap); auto-import claim wrong for `app/shared/composables/` (not a Nuxt scan dir).
- I-09 (B-020/A-018): tasks switcher active state = white chip + green border (not green tint); "Filtros" is a bordered pill, not ghost.
- I-10 (A-010): client drawer collapses inherited area+number phone split and drops optional linked account (`clie_acco_id`).
- I-11 (A-013): Dashboard row declares two primary actions, contradicting the single-primary rule and the catalogue (one "+ Nueva tarea").
- I-12 (A-014): §16/§18 pull Phase-2 finance E2E criteria ("transfer externa", all of PRD-v2 §8) into the Phase-1 cutover gate.

## Round-1 scoped re-judgment outcome (both judges)

| Confirmed ID | Judge A | Judge B |
| --- | --- | --- |
| C-01 | RESOLVED | RESOLVED |
| C-02 | RESOLVED | RESOLVED |
| C-03 | RESOLVED | RESOLVED |

No CRITICAL fix-induced defects. Fix-induced INFO (not re-fixable per contract — WARNING/SUGGESTION remain info):

- FI-1 (B, WARNING): §15.1 head clause "no acepta hoy CORS de los tres" is literally self-contradictory (allowlist accepts 2 of 3 origins).
- FI-2 (B, WARNING): work item hardcodes exactly one origin literal; h3 matches origins by exact string equality and the API never reads `WEB_V3_PORT`, so "derivado de WEB_V3_PORT" is not implementable as stated and non-`localhost` hosts (127.0.0.1, CI) stay rejected under the single-change constraint.
- FI-3 (A, WARNING): "one-line" characterization under-specifies the edit — the adjacent comment block at `apps/api/src/http/composition-root.ts:124-126` ("Both frontends are allowed …") goes stale with a third origin.
- FI-4 (B, SUGGESTION): no §18 acceptance criterion/test guards the allowlist origin against silent reverts.

scoped_rejudgment: approved · fix rounds used: 1 of 2 · terminal_state: approved

## Evidence (both judges)

- Target read in full (1041 lines); PRD.md, PRD-v2.md, PRD-v3.md, PRD-DESIGN.md read as immutable context.
- SQL §13 diffed against PRD-v2 §11: byte-identical (schema fidelity exact; defects are in narrative/spec sections).
- Catalogue measured: 23 PNGs; every image path referenced in PRD-v4 resolves.
- Repo facts: apps/ = api, web, web-v2; `apps/api/src/http/composition-root.ts:125-131` CORS allowlist 5173/5174; `apps/web-v2/vite.config.ts` WEB_V2_PORT ?? 5174; no nuxt installed locally (router.options resolution verified via framework contract, not runtime).

## Round-2 decisions (user-confirmed 2026-10-27, post-approval scope)

Resolutions applied to docs/PRD-v4.md (this commit); no re-judgment needed — user arbitration, not judge findings.

| ID | Resolution |
| --- | --- |
| S-01 | §8.3 gains a conditional "Timer activo" card (renders only while a timer runs — catalogue absence explained; satisfies PRD-v2 Phase-1 "timer activo" mandate). |
| S-02 (variant A) | `task.task_due_date timestamptz NULL` + partial index added to §13; §17 updated: drawer still hides it in v1 (§17 decision intact), seeds populate it; tasks without due date render nothing. Read models (§8.3/§8.4) and visual parity now have backing data. |
| S-03 | `income.inco_status` / `expenses.expe_status` varchar(10) NOT NULL DEFAULT 'paid' CHECK ('pending','paid') added to §13; §17 records the decision; §14 seeds mix statuses. Default 'paid' preserves current behavior. |
| S-04 | §9.2 drawer rows for ingreso/egreso now include Tipo (obligatory select, `inco_type_id`/`expe_type_id` NOT NULL); Categoría marked optional on egreso. §17 decision now matches the normative table. |
| FI-1 | §15.1 head clause rewritten: "todavía no acepta CORS desde los tres frontends … queda bloqueada por CORS hoy" (no self-contradiction). |
| FI-2 | Work item changed: dev CORS reads `WEB_ORIGINS` (comma-separated) with default covering 5173/5174/5175; env override covers 127.0.0.1/CI without code changes. |
| FI-3 | `apps/api/src/http/composition-root.ts` comment block updated (three frontends + WEB_ORIGINS). |
| FI-4 | §18 gains the regression criterion; `router.test.ts` adds two guards (default allowlist accepts 5173/5174/5175; WEB_ORIGINS override replaces default). Verified: 237 pass / 0 fail, typecheck clean. |

Evidence: `apps/api/src/http/composition-root.ts` (WEB_ORIGINS + AppEnv), `apps/api/src/http/router.test.ts` (2 new tests), `docs/PRD-v4.md` §8.3/§9.2/§13/§14/§15.1/§17/§18.
