/**
 * Vista kanban del `BaseView`. Delega el render del board concreto al
 * organism `task-kanban-board` (creado en WU11). Este archivo solo
 * conecta los records y el callback `onMove` con el padre.
 */

export interface KanbanViewProps<R> {
  records: R[];
  board: (input: { records: R[]; onMove: unknown }) => unknown;
  onMove: unknown;
}

export function KanbanView<R>(props: KanbanViewProps<R>) @{
  <div data-view="kanban">
    {props.board({
      records: props.records,
      onMove: props.onMove,
    })}
  </div>
}
