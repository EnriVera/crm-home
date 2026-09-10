# Tasks — theme-quieter-minimalist

> Change SDD: `theme-quieter-minimalist` · Fase: tasks
> Source of truth: `openspec/changes/theme-quieter-minimalist/{proposal,design,specs/design-system/spec}.md`
> Artifact store: `openspec` · Branch: `develop` · Test runner: `bun test` (strict TDD per `openspec/config.yaml`).
> Delivery strategy preset: `ask-on-risk`. Estimate: ~15–20 implementation lines + ~80–100 prose lines for the residual governance follow-up (DESIGN.md + canonical spec delta). Both fit the 400-line review budget. **Single-PR is recommended** for the implementation half; the governance follow-up is **out of scope per the prompt's hard constraint** ("Do not edit DESIGN.md or canonical specs") and is documented only as a residual gate for the orchestrator, not as apply tasks here.

## Review Workload Forecast

| Field | Value |
| ------- | ------- |
| Estimated changed lines | ~15–20 implementation + ~80–100 prose (governance follow-up, residual gate) |
| 400-line budget risk | Low |
| Chained PRs recommended | No (single-PR for implementation; governance follow-up residual gate) |
| Suggested split | Single implementation PR (this tasks.md). Governance follow-up (DESIGN.md + canonical spec) is documented in design §6 as residual, gated by orchestrator decision; if pursued later, prefer single PR (≤100 prose lines) or stacking policy-prose → code in a small chain. |
| Delivery strategy | ask-on-risk (preset; not activated by size — change is small) |
| Chain strategy | pending (orchestrator decision required only if governance follow-up is approved as chained PR; no chaining needed for the implementation PR in this tasks.md) |

```text
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low
```

## Work unit grouping

This change is small enough to ship as **one cohesive implementation work unit** with three TDD-shaped sub-tasks (RED → GREEN → TRIANGULATE → REFACTOR per slice). The unit groups:

1. **Slice A — tokens.css**: palette rewrite (no behavior change observable through component tests; verified by snapshot-style assertions on the tokens file + WCAG computation smoke).
2. **Slice B — component classes**: `button.tsrx` ghost, `nav-group.tsrx` active header, `otp-input.tsrx` caret, `skip-link.tsrx` focus fill (RED: assert old class string absent / new class string present; GREEN: apply diffs; TRIANGULATE: add cross-theme assertions; REFACTOR: tighten comments).
3. **Slice C — verification & handover**: greps per design §2 D5, manual smoke test script, `bun test` green, PR body with implementation map and AA table reference.

A separate, residual **governance work unit** (DESIGN.md + canonical spec edits) is **not** in this tasks.md because the prompt forbids editing those files in this phase. It is documented at the end as a residual gate for the orchestrator to schedule (likely PR-A if chaining is approved).

> **TDD note (strict TDD enabled, no exceptions for this change):** there are no pre-existing snapshot/golden tests over `tokens.css` hex values (explore + design §2 D5 + proposal §4 D5 confirmed). For slice B, the RED step writes tests asserting the presence of the new utility classes and the absence of the old `primary-*` utilities on the affected class strings. These tests can run as plain `bun test` assertions over the file contents (read source → string match), which is the cheapest reliable probe without spinning up a DOM render harness (no `@testing-library`/`happy-dom` is wired yet — see config `frontend.adopted` "diferidos: testing-library").

## Tasks

### Slice A — tokens.css palette rewrite (light + dark)

- [x] **RED** — Add `apps/web/src/styles/tokens.test.ts` asserting the new pure-neutral hex values for both themes. The test reads `tokens.css` as text and asserts: (a) `:root` block declares the five light neutrals (`#ffffff`, `#f5f5f5`, `#e5e5e5`, `#171717`, `#737373`); (b) `.dark` block declares the five dark neutrals (`#0a0a0a`, `#141414`, `#262626`, `#fafafa`, `#a3a3a3`); (c) the `@theme` primary scale `primary-50…900` lines remain byte-identical (assert by substring presence); (d) `--color-success` and `--color-focus` (light `#15803d`, dark `#4ade80`) and `--color-error` (light `#dc2626`, dark `#f87171`) lines remain unchanged. `bun test apps/web/src/styles/tokens.test.ts` must fail (no file or no matching vars yet). <!-- sdd-owner: implementation -->
- [x] **GREEN** — Edit `apps/web/src/styles/tokens.css`: in `:root` replace `--color-surface #f6f8f7`, `--color-border #e2e8f0`, `--color-text-primary #0f172a`, `--color-text-secondary #52606d` with the §2 D1 pure-neutral values and the inline rationale comments (neutral-100/200/900/500; `text-secondary` flagged "AA 4.65:1 sobre #ffffff"); in `.dark` replace the same five tokens with the user-verbatim values (`#0a0a0a` / `#141414` / `#262626` / `#fafafa` / `#a3a3a3`) and the "user-verbatim, sin tinte verde" comment per design §3.1. Adjust or remove the `--color-error` line's hardcoded "≈7:1 sobre #0b120c" comment so it is not misleading after the background changes (`#f87171` sobre `#0a0a0a` ≈ 7.07:1 AAA — either re-anchor to `#0a0a0a` or remove the ratio). Run `bun test apps/web/src/styles/tokens.test.ts`: must pass. <!-- sdd-owner: implementation -->
- [x] **TRIANGULATE** — Extend the same test with explicit WCAG-ratio assertions computed in code using the relative-luminance formula from WCAG 2.x (sRGB → linear → (L1+0.05)/(L2+0.05)). Assert the four ratios in design §5.1 row "text-primary light/dark" and "text-secondary light/dark" against `bg-background` and `bg-surface` (rounded to 0.1 tolerance). This catches accidental hex typos at the unit-test layer instead of relying solely on browser axe-core. `bun test apps/web/src/styles/tokens.test.ts`: must pass. <!-- sdd-owner: implementation -->
- [x] **REFACTOR** — Tighten the inline comments in `tokens.css` to match design §3.1 wording exactly (one short comment per token, no run-on prose). Re-run `bun test` to confirm no observability regression. <!-- sdd-owner: implementation -->

### Slice B — component class fixes (4 components)

- [x] **RED** — Add `apps/web/src/components/__class-fixtures.test.ts` (or per-component colocated tests) that read each affected source file as text and assert: (a) `button.tsrx` `VARIANT_CLASS.ghost` no longer contains the substring `text-primary-700` or `dark:text-primary-400`, and contains `text-text-primary` and `dark:text-text-primary`; (b) `nav-group.tsrx` `stateClass` ternary active-branch no longer contains `text-primary-700` or `dark:text-primary-400`, and contains `text-text-primary` and `font-medium`; (c) `otp-input.tsrx` `CELL_CLASS` no longer contains `caret-primary` and contains `caret-text-primary` plus the D4 support comment (Chrome 57+, Firefox 53+, Safari 11.1+); (d) `skip-link.tsrx` class no longer contains `focus:bg-primary focus:text-white`, and contains `focus:bg-text-primary focus:text-background` and **still** contains `focus-visible:outline-focus` (the canonical green ring must be preserved per design §2 D2). Also assert the inverse — components listed in design §3.6 as out-of-scope (`nav-item.tsrx`, `status-message.tsrx`, `login-verification-page.tsrx`, `routes/index.tsrx`, `button.tsrx` primary variant) still contain their allowed primary usages. Run `bun test`: must fail (current code violates the new assertions). <!-- sdd-owner: implementation -->
- [x] **GREEN** — Apply the four component diffs verbatim from design §3.2–§3.5:
  - `apps/web/src/components/atoms/button.tsrx` → rewrite the `ghost` row of `VARIANT_CLASS` and its comment.
  - `apps/web/src/components/molecules/nav-group.tsrx` → rewrite the active branch of `stateClass` to `text-text-primary font-medium` and verify (by manual inspection in dev server) that `font-medium` actually wins the cascade against the existing `font-semibold`; if the cascade ordering conflicts, move `font-medium` to the last position of the className as the smallest viable fix.
  - `apps/web/src/components/vendor/otp-input/otp-input.tsrx` → change `caret-primary` to `caret-text-primary` in `CELL_CLASS` and prepend the D4 caret-color support comment.
  - `apps/web/src/components/atoms/skip-link.tsrx` → swap `focus:bg-primary focus:text-white` for `focus:bg-text-primary focus:text-background`, keep `focus-visible:outline-focus` intact, prepend the fill-replaces-green comment.

  Run `bun test apps/web/src/components/__class-fixtures.test.ts`: must pass for all four components. <!-- sdd-owner: implementation -->
- [x] **TRIANGULATE** — Add cross-theme string assertions confirming the new utilities are theme-agnostic by construction (`text-text-primary` resolves against both `:root` and `.dark` via `tokens.css`). Also add a triangulation assertion that the skip-link fill string contains both `bg-text-primary` and `text-background` **in that order** so future renames can't silently swap them (which would yield white-on-white or near-zero contrast). Run `bun test`: must pass. <!-- sdd-owner: implementation -->
- [x] **REFACTOR** — Standardize the rationale comment style across the four components (one short line of WHY above each class change). No functional change; only comment polish. Re-run `bun test`. <!-- sdd-owner: implementation -->

### Slice C — verification & handover (no new code, only gates)

- [x] Run the three greps from design §2 D5 / proposal §7 SC #4–5 verbatim; record the output (0 hits in forbidden paths) in the PR body. The greps are:
  1. `grep -R "text-primary-\|bg-primary-\|border-primary-\|ring-primary-\|caret-primary" apps/web/src/components/` (allowed hits: `nav-item.tsrx`, `login-verification-page.tsrx`, `routes/index.tsrx`, `button.tsrx` `primary` row).
  2. `grep -R "primary" apps/web/src/components/` filtered to `button.tsrx` ghost / `nav-group.tsrx` / `otp-input.tsrx` / `skip-link.tsrx` (must return 0 occurrences).
  3. `grep -R "primary-700\|primary-400" apps/api/src packages/` (must return 0 hits; if any, escalate to product owner before commit).
  <!-- sdd-owner: implementation -->
- [ ] Manual smoke test in `apps/web` (per design §8.2): for `/login` and `/dashboard` in both themes, tab through the document and confirm — (1) skip-link appears as a neutral high-contrast pill with a green focus outline (not green-fill); (2) the active `NavGroup` header reads as high-contrast bold (not green) while its active `NavItem` child remains green; (3) no flash of incorrect theme on first paint; (4) the OTP cell caret is neutral (`#171717` / `#fafafa`), not green; (5) ghost buttons render with neutral text and the green focus ring still appears on Tab. Record the result (pass/fail per route per theme) in the PR body. <!-- sdd-owner: implementation -->
- [x] Run the full workspace suite: `bun test` from repo root. Result must be green with 0 new failures. If a visual snapshot test appears (none expected per design §2 D5), update the snapshot or document the delta in the PR body. <!-- sdd-owner: implementation -->
- [ ] Open the PR with title following `conventional-commits` (config `git.commits.convention`); PR body must include — (a) the 5-file inventory with net lines per file, (b) the AA verification table reference (design §5), (c) the three grep outputs as evidence, (d) the smoke-test matrix, (e) the line "0 tests assert hex values; the three greps above are part of the apply checklist (design §2 D5)", and (f) a one-line note pointing to the **governance follow-up residual** (below) so reviewers know the prose change is gated separately. <!-- sdd-owner: implementation -->

## Residual governance follow-up (NOT apply tasks — out of scope this phase)

These two changes are the residual gate documented in proposal §2.4 and design §6. They must **not** be executed in this tasks.md because the prompt explicitly forbids editing `DESIGN.md` or canonical specs in this phase. They are listed here only so the orchestrator can schedule them (likely PR-A if chaining is approved, or a follow-up PR-A after the implementation PR lands):

- `DESIGN.md` §1, §2.2, §2.3, §6, §8 — 5 reescrituras verbatim del design §6.1 (elenco cerrado de 5 usos, tabla semántica dark pure-neutral, regla de contraste AA ajustada a nav activo + link inline, ghost/secondary sin acento, bans absolutos añadidos).
- `openspec/specs/design-system/spec.md` requisito "Regla de contraste AA documentada y aplicada" — el scenario "Texto interactivo en tema claro" pasa a enumerar `NavItem` activo + link inline como los únicos dos casos permitidos para `primary-700` como texto pequeño, con exclusión explícita de ghost buttons, cabeceras de grupo, caret y skip-link fill. El resto del requisito queda intacto (ya canónico en `specs/design-system/spec.md`).

Chaining recommendation (design §6.3): if the orchestrator approves the governance follow-up, prefer **single PR** (prose ≤100 líneas) or **PR-A governance → PR-B implementation** for "regla antes que realidad". Implementing tasks.md as written here lands PR-B (implementation) first; the orchestrator can decide to add PR-A afterward without rejection risk.
