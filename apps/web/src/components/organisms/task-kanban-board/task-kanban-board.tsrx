import { TaskListItem } from "../../molecules/task-list-item.tsrx";
import { t } from "../../vendor/i18n/core";

/**
 * Task kanban board organism (Fase D del tasks-flow + UX polish).
 *
 * Renderiza un board con una columna por estado (ordenadas por
 * `tast_order`). Cada columna tiene:
 * - Header con nombre del estado + count de tasks
 * - Lista de cards `TaskListItem` (reutiliza el molecule del list view)
 * - Empty placeholder cuando no hay tasks
 *
 * Sin dnd-kit drag-and-drop (Phase 2 deferido según contrato del
 * organismo original — el usuario mueve via el dropdown "Mover a" en
 * `/tasks/:id`). Esta vista es read-only de Fase 1.
 *
 * Layout responsive:
 * - En mobile: columnas apiladas verticalmente
 * - En md+: grid horizontal con scroll-x si no entran
 */

export interface TaskForBoard {
  task_id: string;
  task_title: string;
  task_description: string | null;
  task_tast_id: string;
  task_updated_at: string | null;
}

export interface StateForBoard {
  stateId: string;
  stateName: string;
  stateOrder: number;
}

export interface TaskKanbanBoardProps {
  states: StateForBoard[];
  tasks: TaskForBoard[];
}

function KanbanColumn(props: {
  state: StateForBoard;
  tasks: TaskForBoard[];
}) @{
  <div
    data-component="kanban-column"
    data-state-id={props.state.stateId}
    class="flex w-72 shrink-0 flex-col rounded-md border border-border bg-surface"
  >
    <header class="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
      <h3 class="truncate text-sm font-semibold text-text-primary">
        {props.state.stateName}
      </h3>
      <span
        data-component="kanban-column-count"
        class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-background px-1.5 text-xs font-medium text-text-secondary"
      >
        {props.tasks.length}
      </span>
    </header>
    <div class="flex flex-col gap-2 overflow-y-auto p-2" style={{ minHeight: "80px" }}>
      {props.tasks.length === 0 ? (
        <p class="px-2 py-4 text-center text-xs italic text-text-secondary/70">
          {t("tasks.state.empty")}
        </p>
      ) : (
        props.tasks.map((task) => (
          <TaskListItem
            task_id={task.task_id}
            task_title={task.task_title}
            task_description={task.task_description}
            stateName={props.state.stateName}
            updatedAt={task.task_updated_at}
          />
        ))
      )}
    </div>
  </div>
}

export function TaskKanbanBoard(props: TaskKanbanBoardProps) @{
  // Agrupa tasks por estado. Las tareas sin estado matcheado caen en
  // un "Sin estado" virtual (no debería pasar en data real, pero es
  // defensivo contra drift).
  const tasksByState = new Map<string, TaskForBoard[]>();
  for (const state of props.states) {
    tasksByState.set(state.stateId, []);
  }
  for (const task of props.tasks) {
    const bucket = tasksByState.get(task.task_tast_id);
    if (bucket) bucket.push(task);
    else {
      const fallback = tasksByState.get("__unknown__") ?? [];
      fallback.push(task);
      tasksByState.set("__unknown__", fallback);
    }
  }

  // Ordena columnas por state_order.
  const sortedStates = [...props.states].sort(
    (a, b) => a.stateOrder - b.stateOrder,
  );

  <div
    data-component="task-kanban-board"
    class="flex gap-3 overflow-x-auto pb-2"
  >
    {sortedStates.map((state) => (
      <KanbanColumn
        key={state.stateId}
        state={state}
        tasks={tasksByState.get(state.stateId) ?? []}
      />
    ))}
  </div>
}
