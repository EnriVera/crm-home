/**
 * Task state badge molecule. Color de fondo derivado del `task_state`
 * (placeholder: token neutral en MVP; Fase 2 con `@octanejs/colorful`).
 */

export interface TaskStateBadgeProps {
  stateId: string;
  stateName: string;
}

export function TaskStateBadge(props: TaskStateBadgeProps) @{
  <span data-state-id={props.stateId} data-component="task-state-badge">
    {props.stateName}
  </span>
}
