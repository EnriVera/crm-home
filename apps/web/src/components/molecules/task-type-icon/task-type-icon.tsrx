/**
 * Task type icon molecule. Mini wrapper del Icon genérico del wrapper
 * `vendor/icons/`. Cada `type_id` mapea a un ícono distinto (placeholder
 * en MVP — Fase 2 con mapping real).
 */

export interface TaskTypeIconProps {
  typeId: string;
}

export function TaskTypeIcon(props: TaskTypeIconProps) @{
  <span data-type-id={props.typeId} data-component="task-type-icon">
    {/* Phase 2: render <Icon name={iconForType(typeId)} /> */}
  </span>
}
