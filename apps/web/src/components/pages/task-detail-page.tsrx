import { useEffect, useState } from "octane";
import { t } from "../vendor/i18n/core";
import { createRpcClient, type RpcClient } from "../../lib/api/rpc";
import { TaskForm } from "../organisms/task-form/task-form.tsrx";
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
 * Página `/tasks/:id` (PR-F / WU13 + Fase B del tasks-flow).
 *
 * Render plan:
 * - Modo lectura (default): muestra el task cargado (título, descripción,
 *   estado, fechas) con botones Editar / Eliminar.
 * - Modo edición (`?edit=true`): muestra el TaskForm pre-populado con
 *   los datos del task. Submit → `rpc.tasks.update(...)`. Cancel → vuelve
 *   al modo lectura.
 *
 * Carga: `rpc.tasks.get({ task_id })` + `rpc.tasks.states.list()` (para lookup
 * del nombre del estado en el render). El router inyecta `x-user-id` desde
 * la cookie de sesión, así que delete/update lo tienen sin wiring extra.
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
  task_type_id: string | null;
  task_kanban_order: number;
  task_created_at: string;
  task_updated_at: string;
}

interface TaskState {
  tast_id: string;
  tast_name: string;
  tast_order: number;
}

interface TypeForFormOption {
  type_id: string;
  type_name: string;
}

const RPC = createRpcClient(import.meta.env.VITE_API_URL ?? "/rpc");

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function emptyCategoriesLookup(): string[] {
  return [];
}

export function TaskDetailPage(props: { taskId: string; url: string }) @{
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [taskStates, setTaskStates] = useState<TaskState[]>([]);
  const [taskTypes, setTaskTypes] = useState<TypeForFormOption[]>([]);
  const [moveError, setMoveError] = useState<string | null>(null);
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

  // Carga: task + lista de estados + lista de tipos.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [taskData, statesData, typesData] = await Promise.all([
          (RPC as RpcClient).tasks.get({ task_id: props.taskId }),
          (RPC as RpcClient).tasks.states.list(),
          (RPC as RpcClient).tasks.typesForForm(),
        ]);
        if (!cancelled) {
          setTask(taskData as TaskDetail);
          setTaskStates(statesData as TaskState[]);
          setTaskTypes(typesData as TypeForFormOption[]);
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
      globalThis.location.assign(TASKS_LIST_PATH);
    } catch {
      setDeleteError(t("tasks.detail.deleteError"));
      setDeleting(false);
      setConfirmState(closeDeleteConfirmation());
    }
  };

  const handleUpdate = async (state: {
    title: string;
    description: string | null;
    clientId: string | null;
    typeId: string;
    categoryId: string | null;
    stateId: string;
  }): Promise<void> => {
    if (!task) return;
    await (RPC as RpcClient).tasks.update({
      task_id: task.task_id,
      task_title: state.title,
      task_description: state.description,
      task_tast_id: state.stateId || undefined,
      task_type_id: state.typeId || null,
      task_cate_id: state.categoryId,
      task_clie_id: state.clientId,
    });
    // Hard reload para refrescar el detail con los datos nuevos y quitar `?edit=true`.
    globalThis.location.assign(`/tasks/${task.task_id}`);
  };

  const handleCancelEdit = (): void => {
    globalThis.location.assign(`/tasks/${props.taskId}`);
  };

  const handleMove = async (newStateId: string): Promise<void> => {
    if (!task || task.task_tast_id === newStateId) return;
    setMoveError(null);
    try {
      await (RPC as RpcClient).tasks.move({
        task_id: task.task_id,
        target_state_id: newStateId,
      });
      // Recargamos para refrescar el detail con el nuevo estado + orden.
      globalThis.location.reload();
    } catch {
      setMoveError(t("tasks.detail.moveError"));
    }
  };

  <article data-page="task-detail" data-task-id={props.taskId}>
    <header>
      <a href="/tasks">← {t("tasks.page.title")}</a>
      <h1>
        {task ? task.task_title || props.taskId : t("tasks.detail.loading")}
      </h1>
    </header>

    {error && (
      <p data-slot="error" role="alert">
        {error}
      </p>
    )}

    {editMode && task && (
      <aside
        data-component="edit-task-panel"
        role="dialog"
        aria-label={t("tasks.form.editPanelTitle")}
      >
        <header>
          <h2>{t("tasks.form.editPanelTitle")}</h2>
        </header>
        <TaskForm
          mode="update"
          initial={{
            title: task.task_title,
            description: task.task_description,
            clientId: task.task_clie_id,
            typeId: task.task_type_id ?? "",
            categoryId: task.task_cate_id,
            stateId: task.task_tast_id,
          }}
          availableStates={taskStates.map((s) => ({
            tast_id: s.tast_id,
            tast_name: s.tast_name,
          }))}
          availableTypes={taskTypes}
          availableCategoriesFor={emptyCategoriesLookup}
          onSubmit={handleUpdate}
          onCancel={handleCancelEdit}
        />
      </aside>
    )}

    {task && !editMode && (
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
      <a href={editUrl(props.taskId)} data-action="edit" aria-disabled={!task}>
        {t("tasks.card.edit")}
      </a>
      {task && taskStates.length > 0 && (
        <label data-slot="move-control">
          <span>{t("tasks.detail.moveLabel")}</span>
          <select
            data-action="move-to-state"
            value={task.task_tast_id}
            onChange={(e: Event) => {
              const target = e.currentTarget as HTMLSelectElement;
              if (target.value) {
                void handleMove(target.value);
              }
            }}
          >
            {taskStates.map((s) => (
              <option key={s.tast_id} value={s.tast_id}>
                {s.tast_name}
              </option>
            ))}
          </select>
        </label>
      )}
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
    {moveError && (
      <p data-slot="move-error" role="alert">
        {moveError}
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
