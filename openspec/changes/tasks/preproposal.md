# Pre-proposal state — tasks

> Orchestrator-owned gate state. Phase explore: done.

## Product decisions — CONFIRMED by product owner (2026-09-10)

1. **Research lane**: UNSELECTED — no sdd-research (no evidence capability; explore covered repo+PRD facts).
2. **`client` scope**: lookup only — single search-by-name endpoint (no CRUD). CRUD full deferred to its own change.
3. **`task_kanban_order` algorithm**: half-step with rebalance on `|gap| < 1e-6`.
4. **`/tasks-config` placement**: route exists WITHOUT nav item in `SHELL_ROUTES` (accessed by config gear within `/tasks`).
5. **Edit interaction**: navigate to `/tasks/:id` detail page with edit button there (no inline edit).
6. **Bindings**: `@octanejs/dnd-kit` and `@octanejs/lexical` installed per spec `workspace` blocking requirement; verification gate (npm + peer deps vs octane@0.2.3). Escalate on failure — no agent substitution.
7. **Attachments**: PRD §13 deferral — tables created, form field renders disabled with i18n key `tasks.form.attachmentsDisabled`. No upload endpoint.
8. **Closed-list green (from theme-quieter-minimalist)**: NO new green uses — only the 5 canonical places. Kanban state colors come from `task_state.tast_color`, not from primary green.

## Delivery decisions — PENDING (deferred to apply gate)

- Likely chained PRs (forecast >400 lines): PR-A backend migration+domain / PR-B backend HTTP+router / PR-C frontend wrappers+BaseView+/tasks / PR-D /tasks-config. User pattern in this session has been **stacked-to-develop**. Confirmation requested at tasks/apply gate via ask-on-risk.

## Design flags for sdd-design (not blocking proposal)

- D1: RPC client expansion (tasksContract + authContract coexist).
- D2: `BaseView` (React/TSRX) contract for list+detail+create-edit views.
- D3: half-step kanban with rebalanceo threshold + tests.
- D4: idempotent migration `002_tasks.ts` with `IF NOT EXISTS` for tables (`task`, `task_state`, `client`, `type_categories_client`, `attachments`, `task_attachments`).
- D5: lexical serialization (JSON vs HTML) — default JSON to avoid XSS, support re-edit.
- D6: PII telemetry gate (only IDs/categories; never title/description/emails).
- D7: i18n catalog with auto-detection of missing keys.
- D8: SSR strategy for kanban (interactive-only; SSR-stable initial state per `defaultLayout` pattern from sidebar).
- D9: Drag/drop concurrency (last-write-wins MVP, documented limitation).
- D10: `client` lookup endpoint shape (search by substring, return id+name+email).

## Risks carried

- Size: forecast >400 lines (probably 1500-2500) → ask-on-risk at apply.
- npm verification gate: `@octanejs/dnd-kit` and `@octanejs/lexical` could fail → escalation required (no silent substitution per workspace spec).
- kanban half-step collisions under high drag frequency → rebalanceo threshold of 1e-6 documented; tests required.
- Attachments deferral: explicit PRD §13 carve-out, but UX must communicate the disabled state honestly (not just hide the field).
- Closed-list green enforcement: grep gate must pass during apply; new modules cannot introduce non-listed uses.
