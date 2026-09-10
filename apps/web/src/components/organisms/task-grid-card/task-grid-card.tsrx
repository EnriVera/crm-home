import { t } from "../../../vendor/i18n/core";

/**
 * Task grid card organism (vista grid). Variante de task-card optimizada
 * para layout en grilla.
 */

export interface TaskGridCardProps {
  task: {
    task_id: string;
    task_title: string;
    task_description: string | null;
  };
}

export function TaskGridCard(props: TaskGridCardProps) @{
  <div data-component="task-grid-card" data-task-id={props.task.task_id}>
    <strong>{props.task.task_title}</strong>
    <p>{props.task.task_description ?? t("tasks.card.noDescription")}</p>
  </div>
}
