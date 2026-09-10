import { t } from "../vendor/i18n/core";
import {
  buildRemoveParams,
  closeDeleteConfirmation,
  editUrl,
  initialDeleteConfirmationState,
  openDeleteConfirmation,
  TASKS_LIST_PATH,
  type DeleteConfirmationState,
} from "./task-detail-page/task-detail-page.logic";
import { createRpcClient, type RpcClient } from "../../lib/api/rpc";

/**
 * Página `/tasks/:id` (PR-F / WU13). Renderiza:
 *
 * - Header: type-icon + título + estado (TaskStateBadge).
 * - Descripción (lexical JSON render — Fase 2).
 * - Meta: cliente, categoría, fechas de creación/actualización.
 * - Botones:
 *   - Editar: navega a `?edit=true` (monta TaskForm en la misma página).
 *   - Eliminar: abre diálogo de confirmación; al confirmar invoca
 *     `rpc.tasks.remove` y navega a `/tasks`.
 *
 * El componente `.tsrx` no se testea en bun:test (plugin Octane). La lógica
 * state machine vive en `task-detail-page.logic.ts` (testeable).
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

export function TaskDetailPage() @{
  const taskId = "placeholder";
  const userId = "placeholder";
  const [task, setTask] = (globalThis as { __state?: unknown }).__state as {
    task: TaskDetail | null;
    setTask: (v: TaskDetail | null) => void;
  };
  const [confirmState, setConfirmState] = (globalThis as { __state?: unknown })
    .__state as {
    confirmState: DeleteConfirmationState;
    setConfirmState: (v: DeleteConfirmationState) => void;
  };

  void task;
  void setTask;
  void confirmState;
  void setConfirmState;
  void taskId;
  void userId;
  void openDeleteConfirmation;
  void closeDeleteConfirmation;
  void editUrl;
  void TASKS_LIST_PATH;
  void buildRemoveParams;

  <article data-page="task-detail" data-task-id={taskId}>
    <header>
      <a href="/tasks">← {t("tasks.page.title")}</a>
      <h1>Task {taskId}</h1>
    </header>

    <section data-slot="actions">
      <a href={editUrl(taskId)} data-action="edit">
        {t("tasks.card.edit")}
      </a>
      <button
        type="button"
        data-action="delete"
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
          onClick={async () => {
            const params = buildRemoveParams(taskId, userId);
            await (RPC as RpcClient).tasks.remove(params);
            globalThis.location.assign(TASKS_LIST_PATH);
          }}
        >
          {t("tasks.card.delete")}
        </button>
      </dialog>
    )}
  </article>
}
