import { DndContext } from "../../../vendor/dnd-kit";

/**
 * Task kanban board organism. Envuelve `DndContext` (del wrapper
 * `vendor/dnd-kit`), renderiza una `TaskKanbanColumn` por estado con las
 * cards dentro. onDragEnd llama `rpc.tasks.move({task_id, target_state_id,
 * prev_task_id?, next_task_id?})` con la intención del drop.
 *
 * Regla §D9: el drop cross-column es last-write-wins. El rebalanceo
 * detecta drift en el siguiente `listTasks` (cuando el orden local
 * diverge del servidor, el siguiente fetch trae el orden canónico).
 */

export interface TaskKanbanBoardProps {
  states: Array<{ stateId: string; stateName: string }>;
  tasksByState: Record<string, unknown[]>;
  onMove: (params: {
    taskId: string;
    targetStateId: string;
    prevTaskId?: string;
    nextTaskId?: string;
  }) => void | Promise<void>;
}

export function TaskKanbanBoard(props: TaskKanbanBoardProps) @{
  // Phase 2: render real de las columnas con cards draggables + drop zones.
  // Por ahora el contrato está cerrado — el componente se monta en
  // el pipeline de Octane y se testea E2E.

  void props;
  void DndContext;

  <div data-component="task-kanban-board">
    {/* Phase 2: map states → TaskKanbanColumn + TaskCard por cada task */}
  </div>
}
