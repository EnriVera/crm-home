import { t } from "../../../vendor/i18n/core";

/**
 * Task card organism (usado por grilla + kanban). Markup:
 * type-icon + title + description + category + client + state + botones
 * Editar/Eliminar.
 *
 * Implementación MVP — los organismos completos se renderizan en
 * pipeline de Octane (no testeable en bun:test).
 */

export interface TaskCardProps {
  task: {
    task_id: string;
    task_title: string;
    task_description: string | null;
    task_clie_id: string | null;
    task_cate_id: string | null;
    task_tast_id: string;
  };
}

export function TaskCard(props: TaskCardProps) @{
  <article data-component="task-card" data-task-id={props.task.task_id}>
    <header>
      <h3>{props.task.task_title}</h3>
    </header>
    <p>{props.task.task_description ?? t("tasks.card.noDescription")}</p>
    <footer>
      <button type="button">{t("tasks.card.edit")}</button>
      <button type="button">{t("tasks.card.delete")}</button>
    </footer>
  </article>
}
