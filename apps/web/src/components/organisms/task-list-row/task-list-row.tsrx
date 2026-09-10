import { t } from "../../../vendor/i18n/core";

/**
 * Task list row organism (vista list). Markup:
 * type-icon | cliente/estado | título | descripción.
 */

export interface TaskListRowProps {
  task: {
    task_id: string;
    task_title: string;
    task_description: string | null;
  };
}

export function TaskListRow(props: TaskListRowProps) @{
  <li data-component="task-list-row" data-task-id={props.task.task_id}>
    <span data-slot="type-icon" />
    <div data-slot="header">
      <span data-slot="client">{t("tasks.card.noClient")}</span>
      <span data-slot="state">{t("tasks.card.noCategory")}</span>
    </div>
    <strong>{props.task.task_title}</strong>
    <p>{props.task.task_description ?? t("tasks.card.noDescription")}</p>
  </li>
}
