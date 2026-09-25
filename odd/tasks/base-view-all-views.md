# BaseView: enable all 3 views

## Scope

Enable list + grid + kanban in `tasks-page` via `BaseView`. Currently only
list is exposed (`views={["list"]}` disables the switcher).

## Current state (audit)

- `BaseView` has inline render for each view (duplicated with `views/*` modules)
- `views/list.tsrx`, `views/grid.tsrx`, `views/kanban.tsrx` exist but are
  orphan — BaseView doesn't use them
- `view-switcher.tsrx` exists but is orphan (BaseView has its own)
- `task-kanban-board.tsrx` organism exists but is a Phase 2 stub
- Switcher labels are English ("list", "grid", "kanban") — no i18n
- tasks-page passes `views={["list"]}` → no switcher shown

## Plan

### Wave A: Single source of truth for view rendering

BaseView delegates to the views/* modules (which become the canonical
renderers). Delete the orphan `view-switcher.tsrx` (BaseView has its
own switcher inline).

### Wave B: Localize switcher labels

Pass `t()` translations for "list" / "grid" / "kanban". Keys already
exist at `tasks.views.{list,grid,kanban}` in es.json.

### Wave C: Implement kanban organism

`task-kanban-board.tsrx`:

- Group tasks by `task_tast_id`
- Render one column per state (sorted by `tast_order`)
- Column header: state name + count
- Column body: TaskListItem cards (reuse molecule)
- Empty column: small "Sin tareas" placeholder

No dnd-kit for MVP (Phase 2 deferred per existing contract).

### Wave D: Wire tasks-page to all 3 views

```ts
views={["list", "grid", "kanban"]}
listStructure={...existing...}
gridStructure={{
  columns: 3,
  card: (r) => <TaskListItem ... />,
}}
kanbanStructure={{
  board: ({ records }) => <TaskKanbanBoard tasks={records} states={taskStates} />,
}}
```

## Out of scope

- dnd-kit drag/drop in kanban (Phase 2)
- Persistence of selected view across pages (localStorage key per moduleId)
- Other surfaces (clients, finance) — they have placeholders, no records

## Verification

- Switcher shows "Lista / Grilla / Kanban" in es.json translation
- Click each option → renders the corresponding view
- Kanban: tasks grouped by state, columns sorted by tast_order
- Grid: 3 columns, same content as list (compact card)
- List: unchanged behavior

## Notes

The view-switcher.tsrx file (orphan) gets deleted — it duplicates
BaseView's inline switcher and was never imported anywhere.
