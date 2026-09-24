import { useEffect, useState } from "octane";
import { t } from "../vendor/i18n/core";
import { createRpcClient, type RpcClient } from "../../lib/api/rpc";
import {
  closeDeleteConfirmation,
  editUrl,
  initialDeleteConfirmationState,
  isEditModeFromSearchParams,
  openDeleteConfirmation,
  TASKS_LIST_PATH,
  type DeleteConfirmationState,
} from "./task-detail-page/task-detail-page.logic";

/**
 * Página `/tasks/:id` (PR-F / WU13).
 *
 * Render plan:
 * - Header: back link + título + estado (TaskStateBadge lookup por ID).
 * - Descripción (plain text por ahora — rich text llega en Fase 2).
 * - Meta: estado, fechas de creación/actualización.
 * - Botones:
 *   - Editar: navega a `?edit=true` (monta TaskForm en la misma página, Fase B).
 *   - Eliminar: abre diálogo de confirmación; al confirmar invoca
 *     `rpc.tasks.remove({ task_id })` y navega a `/tasks`.
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
  task_type_id: string;
  task_kanban_order: number;
  task_created_at: string;
  task_updated_at: string;
}

interface TaskState {
  tast_id: string;
  tast_name: string;
  tast_order: number;
}

const RPC = createRpcClient(import.meta.env.VITE_API_URL ?? "/rpc");

function formatDate(iso: string): string {
  // Render defensivo: si el parser falla, mostramos el string crudo.
  try {
    return new Date(iso).toLocaleString("es", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function TaskDetailPage(props: { taskId: string; url: string }) @{
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [taskStates, setTaskStates] = useState<TaskState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<DeleteConfirmationState>(
    initialDeleteConfirmationState,
  );

  const editMode = isEditModeFromSearchParams(
    new URL(props.url, "http://internal").searchParams,
  );

  // Carga: task + lista de estados (para resolver el nombre del estado en el render).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [taskData, statesData] = await Promise.all([
          (RPC as RpcClient).tasks.get({ task_id: props.taskId }),
          (RPC as RpcClient).tasks.states.list(),
        ]);
        if (!cancelled) {
          setTask(taskData as TaskDetail);
          setTaskStates(statesData as TaskState[]);
        }
      } catch {
        if (!cancelled) {
          setError(t("tasks.detail.errorTitle"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.taskId]);

  const stateName = taskStates.find((s) => s.tast_id === task?.task_tast_id)
    ?.tast_name;

  const handleDelete = async (): Promise<void> => {
    if (!task || deleting) return;
    try {
      setDeleting(true);
      setDeleteError(null);
      await (RPC as RpcClient).tasks.remove({ task_id: task.task_id });
      // Hard navigation para que el shell re-renderice sin el task eliminado.
      globalThis.location.assign(TASKS_LIST_PATH);
    } catch {
      setDeleteError(t("tasks.detail.deleteError"));
      setDeleting(false);
      setConfirmState(closeDeleteConfirmation());
    }
  };

  <article data-page="task-detail" data-task-id={props.taskId}>
    <header>
      <a href="/tasks">← {t("tasks.page.title")}</a>
      <h1>
        {task ? task.task_title || props.taskId : t("tasks.detail.loading")}
      </h1>
    </header>

    {editMode && task && (
      <p data-slot="edit-mode-hint">{t("tasks.detail.editModeHint")}</p>
    )}

    {error && (
      <p data-slot="error" role="alert">
        {error}
      </p>
    )}

    {task && (
      <>
        <section data-slot="meta">
          <dl>
            {stateName && (
              <>
                <dt>{t("tasks.detail.stateLabel")}</dt>
                <dd>{stateName}</dd>
              </>
            )}
            <dt>{t("tasks.detail.createdAtLabel")}</dt>
            <dd>{formatDate(task.task_created_at)}</dd>
            <dt>{t("tasks.detail.updatedAtLabel")}</dt>
            <dd>{formatDate(task.task_updated_at)}</dd>
          </dl>
        </section>

        <section data-slot="description">
          <p>{task.task_description ?? t("tasks.card.noDescription")}</p>
        </section>
      </>
    )}

    <section data-slot="actions">
      <a
        href={editUrl(props.taskId)}
        data-action="edit"
        aria-disabled={!task}
      >
        {t("tasks.card.edit")}
      </a>
      <button
        type="button"
        data-action="delete"
        disabled={!task || deleting}
        onClick={() => {
          setDeleteError(null);
          setConfirmState(openDeleteConfirmation(props.taskId));
        }}
      >
        {deleting ? t("tasks.detail.deleting") : t("tasks.card.delete")}
      </button>
    </section>

    {deleteError && (
      <p data-slot="delete-error" role="alert">
        {deleteError}
      </p>
    )}

    {confirmState.visible && task && (
      <dialog open data-component="delete-confirmation">
        <h2>{t("tasks.detail.deleteConfirmTitle")}</h2>
        <p>{t("tasks.detail.deleteConfirmBody")}</p>
        <button
          type="button"
          data-action="cancel-delete"
          disabled={deleting}
          onClick={() => setConfirmState(closeDeleteConfirmation())}
        >
          {t("tasks.detail.deleteConfirmCancel")}
        </button>
        <button
          type="button"
          data-action="confirm-delete"
          disabled={deleting}
          onClick={() => {
            void handleDelete();
          }}
        >
          {deleting
            ? t("tasks.detail.deleting")
            : t("tasks.detail.deleteConfirmAccept")}
        </button>
      </dialog>
    )}
  </article>
}
