import { t } from "../vendor/i18n/core";

/**
 * Molecule: una fila de la lista de tareas (`/tasks` view=list).
 *
 * Render plan (Operate / PRD §6.2):
 * - `<a>` semántico hacia `/tasks/:id` (full row clickable).
 * - Card-like sin shadow: surface + border 1px + rounded-md.
 * - Layout: horizontal flex, left cluster (title + description preview),
 *   right cluster (state badge + updated date).
 * - Hover: surface (background subtle), border emphasis.
 * - Focus: outline-focus canónico.
 * - Spacing consistente con el resto del sistema (`px-4 py-3`).
 *
 * "Empty states should teach the interface" (impeccable): si el row no
 * tiene description, mostramos un placeholder muted ("Sin descripción")
 * para que el usuario entienda el campo, no que "no hay nada".
 */

export interface TaskListItemProps {
  task_id: string;
  task_title: string;
  task_description: string | null;
  stateName: string | null;
  updatedAt: string | null;
}

function formatRelativeDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin}m`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `hace ${diffHours}h`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `hace ${diffDays}d`;
  return date.toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
  });
}

export function TaskListItem(props: TaskListItemProps) @{
  const descriptionText =
    props.task_description?.trim() || t("tasks.card.noDescription");
  const descriptionIsPlaceholder = !props.task_description?.trim();

  <a
    href={`/tasks/${props.task_id}`}
    data-component="task-list-item"
    class="group flex items-start gap-4 rounded-md border border-border bg-surface px-4 py-3 transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
  >
    <div class="min-w-0 flex-1">
      <h3 class="truncate text-sm font-semibold text-text-primary group-hover:text-primary-700 dark:group-hover:text-primary-300">
        {props.task_title}
      </h3>
      <p
        class={`mt-1 line-clamp-1 text-sm ${
          descriptionIsPlaceholder
            ? "italic text-text-secondary/70"
            : "text-text-secondary"
        }`}
      >
        {descriptionText}
      </p>
    </div>
    <div class="flex shrink-0 flex-col items-end gap-1.5">
      {props.stateName ? (
        <span
          data-component="task-list-item-state"
          class="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium text-text-primary"
        >
          {props.stateName}
        </span>
      ) : null}
      {props.updatedAt ? (
        <time
          datetime={props.updatedAt}
          class="text-xs text-text-secondary"
        >
          {formatRelativeDate(props.updatedAt)}
        </time>
      ) : null}
    </div>
  </a>
}
