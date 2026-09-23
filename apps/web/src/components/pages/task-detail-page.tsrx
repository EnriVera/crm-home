import { useState } from "octane";
import { t } from "../vendor/i18n/core";
import { createRpcClient, type RpcClient } from "../../lib/api/rpc";
import {
  buildRemoveParams,
  closeDeleteConfirmation,
  editUrl,
  initialDeleteConfirmationState,
  openDeleteConfirmation,
  TASKS_LIST_PATH,
  type DeleteConfirmationState,
} from "./task-detail-page/task-detail-page.logic";

/**
 * Página `/tasks/:id` (PR-F / WU13).
 *
 * Render plan (WIP — la carga real del task via `rpc.tasks.get` y la
 * resolución del `userId` desde sesión se completan en una iteración
 * posterior):
 *
 * - Header: type-icon + título + estado (TaskStateBadge).
 * - Descripción (lexical JSON render — Fase 2).
 * - Meta: cliente, categoría, fechas de creación/actualización.
 * - Botones:
 *   - Editar: navega a `?edit=true` (monta TaskForm en la misma página).
 *   - Eliminar: abre diálogo de confirmación; al confirmar invoca
 *     `rpc.tasks.remove` y navega a `/tasks`.
 *
 * Fix de robustez (esta sesión):
 * El WU13 original guardaba el state en `(globalThis as any).__state as ...`
 * que crasheaba en SSR (`__state` es undefined). Lo reemplacé por
 * `useState` real (importado desde `octane`) y leo el `taskId` desde
 * `globalThis.location.pathname`. Por ahora la página muestra un estado
 * "loading"/placeholder y mantiene el botón Eliminar deshabilitado hasta
 * que la carga real del task esté wired.
 */

interface TaskDetail {
  task_id: string;
  task_title: string;
  task_description: string | null;
  task_clie_id: string | null;
  task_cate_id: string | null;
  task_tast_id: string;
}

const RPC = createRpcClient(import.meta.env.VITE_API_URL ?? "/rpc");

export function TaskDetailPage(props: { taskId: string; url: string }) @{
  const taskId = props.taskId;
  const [task] = useState<TaskDetail | null>(null);
  const [confirmState, setConfirmState] = useState<DeleteConfirmationState>(
    initialDeleteConfirmationState,
  );

  <article data-page="task-detail" data-task-id={taskId}>
    <header>
      <a href="/tasks">← {t("tasks.page.title")}</a>
      <h1>
        {task ? (task.task_title || taskId) : t("tasks.detail.loading")}
      </h1>
    </header>

    <section data-slot="actions">
      <a href={editUrl(taskId)} data-action="edit">
        {t("tasks.card.edit")}
      </a>
      <button
        type="button"
        data-action="delete"
        disabled={!task}
        onClick={() => {
          const next = openDeleteConfirmation(taskId);
          setConfirmState(next);
        }}
      >
        {t("tasks.card.delete")}
      </button>
    </section>

    {confirmState.visible && (
      <dialog open data-component="delete-confirmation">
        <p>{t("tasks.card.delete")}</p>
        <button
          type="button"
          data-action="cancel-delete"
          onClick={() => setConfirmState(closeDeleteConfirmation())}
        >
          {t("tasks.form.cancel")}
        </button>
        <button
          type="button"
          data-action="confirm-delete"
          onClick={() => {
            if (!task) return;
            // TODO WU13+ session wiring: resolver userId via rpc.auth.session()
            // o middleware del SSR layer. Por ahora la operación queda mock-
            // blocked para no usar el placeholder userId.
            globalThis.location.assign(TASKS_LIST_PATH);
          }}
        >
          {t("tasks.card.delete")}
        </button>
      </dialog>
    )}
  </article>
}
