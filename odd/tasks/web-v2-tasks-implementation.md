# web-v2 — Tasks module implementation (T-11.4 + dependencies)

> Goal: implement the Tasks page end-to-end (T-11.4) with the foundational
> application/infrastructure/composable layer that was scaffolded but left empty.
> Closes the placeholder `Coming soon.` and gives a working Kanban + grid + drawer.
> Scope: tasks bounded context. Schedule, Clients, Config, and machines are
> separate features (out of scope here).

## Source

- PRD: `docs/PRD-v3.md` §5, §6, §7 (Tasks), §11.2 (cutover gate)
- Task list: `odd/tasks/web-v2-prd-v3.md` (T-6.5, T-8.1-3, T-11.4)
- Architecture: hex-style (domain → application → infrastructure → ui)

## Status legend

- `[ ]` pending
- `[~]` in progress
- `[x]` done
- `[!]` blocked (reason noted)

## Foundation (already delivered by previous sessions)

- `domain/task/entities.ts` — `Task`, `TaskState`, `TaskInput`, `TaskPatch`, `TaskPage`, `TaskMoved` (from `@crm/contract/task`); `validateCategoryRequiresType` policy.
- `domain/task/ports.ts` — `TaskRepository`, `TaskStateRepository`.
- `infrastructure/api/procedures/task-repository.ts` — `createOrpcTaskRepository()`, `createOrpcTaskStateRepository()`. Pattern: `callPath` over `orpcClient` for NestedClient access; `mapOrpcError` for error mapping.
- `application/auth/use-cases.ts` — pattern for new use cases (factory function over repo, zod validation, returns `Result<T, DomainError>`).

## Tasks (this feature)

### Track 6 — Application layer (T-6.5)

- [ ] **T-6.5a** `application/task/use-cases.ts`
  - `makeListTasks(repo)(query)` — list with pagination, search, filters (type, category, client, state). Validates `query` against `@crm/contract/task`.
  - `makeGetTask(repo)(id)` — fetch one.
  - `makeCreateTask(repo)(input)` — runs `validateCategoryRequiresType`; calls `repo.create(input)`.
  - `makeUpdateTask(repo)(id, patch)` — calls `repo.patch(id, patch)`. Re-validates `categoryRequiresType` when both `typeId` and `categoryId` are present in the patch.
  - `makeUpdateTaskState(repo)(id, stateId)` — convenience for state-only updates.
  - `makeReorderTaskInColumn(repo)(id, columnId, toIndex)` — kanban drag-drop wrapper around `repo.moveToColumn`.
  - `makeDeleteTask(repo)(id)` — calls `repo.remove(id)`.
  - `makeListTaskStates(repo)()` — `repo.listStates()`.
  - **Conventions**: factory pattern `makeXxx(repo)`, zod first, no Vue/Pinia, return `Result<T, DomainError>`. Follow `application/auth/use-cases.ts` style.

### Track 8 — Composables (T-8.1, T-8.2, T-8.3 + helpers)

- [ ] **T-8.1** `shared/composables/use-list-tasks.ts`
  - TanStack Query wrapper around `makeListTasks`. Accepts `query` ref/reactive, returns `{ data, isLoading, error, refetch }`.
  - `queryKey` derived from query params (stable hash).
- [ ] **T-8.2** `shared/composables/use-create-task.ts`
  - `useMutation` wrapper around `makeCreateTask`. On success, invalidates `["tasks"]` and `["tasks", { filters }]` keys.
- [ ] **T-8.3** `shared/composables/use-update-task-state.ts`
  - `useMutation` wrapper around `makeReorderTaskInColumn` + `makeUpdateTaskState`. Optimistic update on `["tasks"]`; rollback on error. Emits `invalidation-bus` event on success.
- [ ] **T-8.3b** `shared/composables/use-update-task.ts` — `useMutation` around `makeUpdateTask`.
- [ ] **T-8.3c** `shared/composables/use-delete-task.ts` — `useMutation` around `makeDeleteTask`. Optimistic removal.
- [ ] **T-8.3d** `shared/composables/use-list-task-states.ts` — TanStack Query wrapper around `makeListTaskStates`. Long cache (states rarely change).
- [ ] **T-8.3e** `shared/composables/use-task-form-listers.ts` — for `EditTaskDrawer`: types, categories, clients listers (`tasks.listForForm` + `tasks.searchClients` + `tasks.listCategoriesByType`).

### Track 11 — UI: Tasks page real (T-11.4)

- [ ] **T-11.4a** `ui/organisms/kanban-board/`
  - `KanbanBoard.vue` — receives `columns: TaskState[]` + `tasksByColumn: Map<TaskStateId, Task[]>`. Emits `move` event with `{ taskId, toColumnId, toIndex }`.
  - Internally uses `vue-draggable-plus` (T-4.10) wrapped in `shared/vendor/dnd/`.
  - Virtualizes long columns if >50 tasks (optional; defer if scope creep).
- [ ] **T-11.4b** `ui/organisms/task-grid/`
  - `TaskGrid.vue` — table view of tasks, sortable columns, row click opens drawer.
- [ ] **T-11.4c** `ui/organisms/base-view/`
  - `BaseView.vue` — header (title + actions), view-mode switcher (kanban/grid/list), filter bar, body slot. Per PRD §6.7.
  - Persists last view-mode in `infrastructure/persistence/persisted-filters.ts` (defer if file doesn't exist; use localStorage ad-hoc).
- [ ] **T-11.4d** `ui/molecules/edit-task-drawer/`
  - `EditTaskDrawer.vue` — shadcn-vue `Sheet` wrapper. Form with vee-validate + zod (TaskInput schema from `@crm/contract/task`).
  - Fields: title (Input), description (Textarea — Tiptap deferred), type (Select — populated by `useTaskFormListers`), category (Select — depends on type), client (Combobox), state (Select).
  - Save → `useUpdateTask` or `useCreateTask`. Delete button → `useDeleteTask` with confirm.
- [ ] **T-11.4e** `ui/molecules/task-card/`
  - `TaskCard.vue` — used by Kanban. Shows title, client name, type chip, category chip. Click opens drawer.
- [ ] **T-11.4f** `ui/pages/tasks/index.vue` (replace placeholder)
  - `<BaseView>` + `<KanbanBoard>` default; switcher between kanban/grid.
  - "+ New task" button opens `EditTaskDrawer` in create mode.
  - Empty state: friendly message + CTA.
  - Loading state: skeleton.
  - Error state: retry button.

### Track 13 — Tests (light, not exhaustive)

- [ ] **T-13.x** `tests/unit/application/task/use-cases.test.ts`
  - `validateCategoryRequiresType` re-uses.
  - `makeListTasks` with in-memory fake repo: returns ok, returns err on validation.
  - `makeCreateTask` enforces category-requires-type policy.
  - `makeReorderTaskInColumn` calls repo with correct shape.

## Dependency graph (this feature)

```text
T-6.5a (application/task use cases)
  ↓
T-8.1, T-8.2, T-8.3, T-8.3b/c/d/e (composables)
  ↓
T-11.4a (KanbanBoard organism) — independent of composables for body
T-11.4b (TaskGrid organism)     — independent of composables for body
T-11.4c (BaseView organism)     — used by page
T-11.4d (EditTaskDrawer)        — uses useTaskFormListers
T-11.4e (TaskCard)              — used by KanbanBoard
  ↓
T-11.4f (Tasks page composition)
```

## Cross-track rules (apply)

1. **No inline zod for entities** — use `@crm/contract/task` schemas.
2. **No direct orpc from a component** — composable → use case → port → adapter.
3. **No third-party UI import outside `src/shared/vendor/`** — lint-enforced.
4. **No raw hex/font in any component** — design tokens only.
5. **One work-unit commit per task** — `web-v2:` prefix, Conventional Commits.

## Commit plan (work-unit)

1. `web-v2(task): add application/task use cases (T-6.5a)`
2. `web-v2(task): add use-list-tasks + use-task-form-listers composables (T-8.1, T-8.3d, T-8.3e)`
3. `web-v2(task): add use-create-task + use-update-task + use-delete-task + use-update-task-state (T-8.2, T-8.3, T-8.3b, T-8.3c)`
4. `web-v2(task): add BaseView + TaskCard + KanbanBoard organisms (T-11.4a, T-11.4c, T-11.4e)`
5. `web-v2(task): add TaskGrid organism + EditTaskDrawer molecule (T-11.4b, T-11.4d)`
6. `web-v2(task): compose Tasks page with view switcher and drawer wiring (T-11.4f)`
7. `web-v2(task): tests for application/task use cases (T-13.x)`

## Out of scope (deferred)

- Tiptap rich text description (use plain `<textarea>` v1; PRD §6.7 marks as Phase 2 enhancement).
- WebSocket realtime invalidation for tasks (PRD §6.5). Tasks use refetch-on-mutation for v1.
- Timer machine (T-9.1) — Schedule feature.
- Other BCs (client, schedule, config, finance) — separate features.
- Visual polish pass (PRD §8.2 aesthetic) — after T-11.4 lands.

## Acceptance (this feature done when)

- `bunx vue-tsc --noEmit` in `apps/web-v2/` returns 0 errors.
- `bun test` in `apps/web-v2/` passes (existing 12 + new use-case tests).
- Tasks page renders the Kanban board with real data from the API (4+ seeded tasks across 3+ states).
- Drag-drop between columns persists (PATCH `/tasks/move`).
- Drawer create/edit form submits, invalidates, and reflects in board without full page reload.
- Delete with confirm removes task from board.
- Build size delta on `/tasks` < 100KB gzipped.
- All work-unit commits land on `develop` with the `web-v2:` prefix.
