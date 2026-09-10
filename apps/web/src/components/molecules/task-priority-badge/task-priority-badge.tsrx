/**
 * Task priority badge molecule. 3 niveles en MVP (low, mid, high).
 * Sin acento de color en MVP — solo shape diferenciado por nivel.
 */

export type TaskPriority = "low" | "mid" | "high";

export interface TaskPriorityBadgeProps {
  priority: TaskPriority;
}

export function TaskPriorityBadge(props: TaskPriorityBadgeProps) @{
  <span data-priority={props.priority} data-component="task-priority-badge">
    {props.priority}
  </span>
}
