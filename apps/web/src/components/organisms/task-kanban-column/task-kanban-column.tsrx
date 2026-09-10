import { t } from "../../../vendor/i18n/core";
import { useDroppable } from "../../../vendor/dnd-kit";

/**
 * Task kanban column organism. Header de estado + lista vertical de cards
 * + drop zone. Usa `useDroppable` del wrapper `vendor/dnd-kit` (regla §9).
 *
 * Drop cross-column: el board superior (task-kanban-board) escucha los
 * eventos dragEnd y llama `rpc.tasks.move`. La columna sólo expone
 * `setNodeRef` para que el sistema dnd sepa qué zona acepta drops.
 */

export interface TaskKanbanColumnProps {
  stateId: string;
  stateName: string;
  taskCount: number;
}

export function TaskKanbanColumn(props: TaskKanbanColumnProps) @{
  const { setNodeRef } = useDroppable({ id: `column-${props.stateId}` });

  <section
    data-component="task-kanban-column"
    data-state-id={props.stateId}
    ref={setNodeRef}
  >
    <header>
      <h3>{props.stateName}</h3>
      <span data-slot="count">{props.taskCount}</span>
    </header>
    {props.taskCount === 0 && <p>{t("tasks.state.empty")}</p>}
  </section>
}
