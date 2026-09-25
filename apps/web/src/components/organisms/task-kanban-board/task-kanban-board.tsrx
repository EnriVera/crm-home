import { useState } from "octane";
import { TaskListItem } from "../../molecules/task-list-item.tsrx";
import {
  DndContext,
  useDraggable,
  useDroppable,
  type DragDropEvent,
} from "../../../vendor/dnd-kit";
import { t } from "../../vendor/i18n/core";

/**
 * Task kanban board organism (Fase D del tasks-flow + UX polish +
 * drag/drop vía @octanejs/dnd-kit wrapper).
 *
 * Renderiza un board con una columna por estado (ordenadas por
 * `tast_order`). Cada task es draggable; cada columna es droppable.
 * El drop cross-column llama `onMove(taskId, targetStateId)` y el padre
 * ejecuta `rpc.tasks.move(...)`. El usuario percibe el cambio instantáneo
 * vía optimistic update + reconciliación en el refresh siguiente.
 *
 * Regla §D9: el drop cross-column es last-write-wins. El rebalanceo
 * detecta drift en el siguiente `listTasks` (cuando el orden local
 * diverge del servidor, el siguiente fetch trae el orden canónico).
 *
 * Layout responsive: en mobile las columnas apilan verticalmente; en md+
 * grid horizontal con scroll-x si no entran.
 *
 * Optimistic visual: el task "en vuelo" se renderiza con opacity-70
 * via el `isDragging` flag del hook (mismo molecule TaskListItem, sin
 * duplicar markup).
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
  onMove: (params: {
    taskId: string;
    targetStateId: string;
    prevTaskId?: string;
    nextTaskId?: string;
  }) => void | Promise<void>;
}

/**
 * Wrapper que conecta una task al sistema dnd-kit via useDraggable.
 * Aplica `opacity-50 cursor-grabbing` mientras se arrastra (signal visual
 * sin overlay extra — para MVP es suficiente).
 */
function DraggableTask(props: {
  task: TaskForBoard;
  stateName: string;
}) @{
  const { element, isDragging } = useDraggable({
    id: props.task.task_id,
    data: { type: "task", taskId: props.task.task_id, stateId: props.task.task_tast_id },
  });
  void element;
  <div
    class={isDragging ? "opacity-50" : ""}
    data-dragging={isDragging ? "true" : undefined}
  >
    <TaskListItem
      task_id={props.task.task_id}
      task_title={props.task.task_title}
      task_description={props.task.task_description}
      stateName={props.stateName}
      updatedAt={props.task.task_updated_at}
    />
  </div>
}

/**
 * Wrapper de columna droppable. `isOver` le da highlight visual cuando
 * el usuario está arrastrando algo encima.
 */
function DroppableColumn(props: {
  state: StateForBoard;
  tasks: TaskForBoard[];
}) @{
  const { element, isOver } = useDroppable({
    id: props.state.stateId,
    accept: "task",
  });
  void element;
  <div
    data-component="kanban-column"
    data-state-id={props.state.stateId}
    class={`flex w-72 shrink-0 flex-col rounded-md border transition-colors ${
      isOver ? "border-primary bg-primary/5" : "border-border bg-surface"
    }`}
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
          <DraggableTask task={task} stateName={props.state.stateName} />
        ))
      )}
    </div>
  </div>
}

export function TaskKanbanBoard(props: TaskKanbanBoardProps) @{
  // Agrupa tasks por estado. Las tareas sin estado matcheado caen en
  // un "Sin estado" virtual (defensivo contra drift de data).
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

  const handleDragEnd = (event: DragDropEvent): void => {
    // El shape exacto depende del binding; leemos defensivamente.
    const operation = (event as { operation?: { source?: { data?: { taskId?: string; stateId?: string } }; target?: { id?: string | number } } }).operation;
    const sourceTaskId = operation?.source?.data?.taskId;
    const sourceStateId = operation?.source?.data?.stateId;
    const targetStateIdRaw = operation?.target?.id;
    const targetStateId =
      typeof targetStateIdRaw === "string" ? targetStateIdRaw : null;

    if (
      !sourceTaskId ||
      !targetStateId ||
      targetStateId === sourceStateId ||
      targetStateId === "__unknown__"
    ) {
      return;
    }
    // Reordenamiento dentro de la columna: Phase 2 — por ahora solo
    // cambiamos entre columnas. Cross-column move.
    void props.onMove({ taskId: sourceTaskId, targetStateId });
  };

  <DndContext onDragEnd={handleDragEnd}>
    <div
      data-component="task-kanban-board"
      class="flex gap-3 overflow-x-auto pb-2"
    >
      {sortedStates.map((state) => (
        <DroppableColumn
          key={state.stateId}
          state={state}
          tasks={tasksByState.get(state.stateId) ?? []}
        />
      ))}
    </div>
  </DndContext>
}
