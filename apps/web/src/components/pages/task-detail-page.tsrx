import { useEffect, useState } from "octane";
import { t } from "../vendor/i18n/core";
import { createRpcClient, type RpcClient } from "../../lib/api/rpc";
import { Button } from "../atoms/button.tsrx";
import { StatusMessage } from "../atoms/status-message.tsrx";
import { TaskForm } from "../organisms/task-form/task-form.tsrx";
import {
  closeDeleteConfirmation,
  initialDeleteConfirmationState,
  openDeleteConfirmation,
  TASKS_LIST_PATH,
  type DeleteConfirmationState,
} from "./task-detail-page/task-detail-page.logic";

/**
 * Página `/tasks/:id` (PR-F / WU13 + Fase B del tasks-flow + UX polish impeccable).
 *
 * Render plan:
 * - Modo lectura (default): muestra el task cargado (título, descripción,
 *   estado, fechas) con botones Editar / Eliminar / Mover.
 * - Modo edición: el TaskForm se monta como drawer lateral derecho (mismo
 *   lenguaje visual que el drawer "Nueva tarea" en tasks-page).
 *
 * Carga: `rpc.tasks.get({ task_id })` + `rpc.tasks.states.list()` + typesForForm
 * (para lookup del nombre del estado y los options de Tipo en el form).
 *
 * Estructura visual (Operate / design.md):
 * - Header con back-link + título jerarquizado.
 * - Meta (estado, fechas) como definition list en grid 2-col sobre surface card.
 * - Descripción como card separado, body grande para legibilidad.
 * - Acciones: ghost buttons para Edit / Delete / Mover. Delete abre modal
 *   de confirmación con backdrop (mismo patrón que el drawer).
 * - Una sola acción primaria por pantalla — la edición NO es primaria aquí
 *   (se delega al drawer).
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

function CloseIcon() @{
  // 16x16, 1.5 stroke, currentColor. Inline SVG para evitar dependencia extra.
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    aria-hidden="true"
  >
    <line x1="4" y1="4" x2="16" y2="16" />
    <line x1="16" y1="4" x2="4" y2="16" />
  </svg>
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
  const [editing, setEditing] = useState(false);

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

  // Escape cierra el panel de edición / confirmación de delete.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        if (confirmState.visible) {
          setConfirmState(closeDeleteConfirmation());
        } else if (editing) {
          setEditing(false);
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editing, confirmState.visible]);

  // Lock body scroll cuando el drawer está abierto.
  useEffect(() => {
    if (!editing && !confirmState.visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [editing, confirmState.visible]);

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
    // Local optimistic-style update: cerramos el drawer y reflejamos el
    // nuevo estado en el detail sin reload. El `stateName` derivado y los
    // timestamps se recomputan automáticamente en el próximo render.
    setTask({
      ...task,
      task_title: state.title,
      task_description: state.description,
      task_tast_id: state.stateId || task.task_tast_id,
      task_type_id: state.typeId || task.task_type_id,
      task_cate_id: state.categoryId,
      task_clie_id: state.clientId,
    });
    setEditing(false);
  };

  const handleCancelEdit = (): void => {
    setEditing(false);
  };

  const handleMove = async (newStateId: string): Promise<void> => {
    if (!task || task.task_tast_id === newStateId) return;
    setMoveError(null);
    try {
      await (RPC as RpcClient).tasks.move({
        task_id: task.task_id,
        target_state_id: newStateId,
      });
      // Local update: el stateName derivado se recalcula con el nuevo
      // task_tast_id. Sin reload, sin navegar away.
      setTask({ ...task, task_tast_id: newStateId });
    } catch {
      setMoveError(t("tasks.detail.moveError"));
    }
  };

  <article
    data-page="task-detail"
    data-task-id={props.taskId}
    class="mx-auto w-full max-w-4xl px-6 py-8 sm:py-10"
  >
    <header class="mb-8">
      <a
        href="/tasks"
        class="inline-flex items-center gap-1 text-sm text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus rounded"
      >
        <span aria-hidden="true">←</span>
        {t("tasks.page.title")}
      </a>
      <h1 class="mt-3 text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
        {task ? task.task_title || props.taskId : t("tasks.detail.loading")}
      </h1>
    </header>

    {error && (
      <StatusMessage variant="error" class="mb-6">
        {error}
      </StatusMessage>
    )}

    {task && !editing && (
      <div class="flex flex-col gap-6">
        <section
          data-slot="meta"
          class="rounded-md border border-border bg-surface p-5"
        >
          <h2 class="mb-4 text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Detalle
          </h2>
          <dl class="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-[max-content_1fr]">
            {stateName && (
              <>
                <dt class="text-sm font-medium text-text-secondary">
                  {t("tasks.detail.stateLabel")}
                </dt>
                <dd>
                  <span class="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium text-text-primary">
                    {stateName}
                  </span>
                </dd>
              </>
            )}
            <dt class="text-sm font-medium text-text-secondary">
              {t("tasks.detail.createdAtLabel")}
            </dt>
            <dd class="text-sm text-text-primary">{formatDate(task.task_created_at)}</dd>
            <dt class="text-sm font-medium text-text-secondary">
              {t("tasks.detail.updatedAtLabel")}
            </dt>
            <dd class="text-sm text-text-primary">{formatDate(task.task_updated_at)}</dd>
          </dl>
        </section>

        <section
          data-slot="description"
          class="rounded-md border border-border bg-surface p-5"
        >
          <h2 class="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">
            {t("tasks.form.descriptionLabel")}
          </h2>
          {task.task_description ? (
            <p class="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
              {task.task_description}
            </p>
          ) : (
            <p class="text-sm italic text-text-secondary/70">
              {t("tasks.card.noDescription")}
            </p>
          )}
        </section>

        <section
          data-slot="actions"
          class="flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface p-5"
        >
          <Button
            variant="primary"
            data-action="edit"
            disabled={!task || editing}
            onClick={() => setEditing(true)}
          >
            {t("tasks.card.edit")}
          </Button>
          {task && taskStates.length > 0 && (
            <label
              data-slot="move-control"
              class="ml-auto inline-flex items-center gap-2"
            >
              <span class="text-xs font-medium text-text-secondary">
                {t("tasks.detail.moveLabel")}
              </span>
              <select
                data-action="move-to-state"
                value={task.task_tast_id}
                onChange={(e: Event) => {
                  const target = e.currentTarget as HTMLSelectElement;
                  if (target.value) {
                    void handleMove(target.value);
                  }
                }}
                class="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                {taskStates.map((s) => (
                  <option key={s.tast_id} value={s.tast_id}>
                    {s.tast_name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <Button
            variant="ghost"
            data-action="delete"
            class="!text-error hover:bg-error/10"
            disabled={!task || deleting}
            onClick={() => {
              setDeleteError(null);
              setConfirmState(openDeleteConfirmation(props.taskId));
            }}
          >
            {deleting ? t("tasks.detail.deleting") : t("tasks.card.delete")}
          </Button>
        </section>

        {deleteError && (
          <StatusMessage variant="error">{deleteError}</StatusMessage>
        )}
        {moveError && (
          <StatusMessage variant="error">{moveError}</StatusMessage>
        )}
      </div>
    )}

    {/* Drawer de edición (mismo lenguaje que el de "Nueva tarea"). */}
    {editing && task && (
      <>
        <div
          data-component="edit-task-backdrop"
          class="fixed inset-0 z-30 bg-black/40"
          onClick={handleCancelEdit}
          aria-hidden="true"
        />
        <aside
          data-component="edit-task-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-task-panel-title"
          tabindex="-1"
          class="fixed top-0 right-0 z-40 flex h-screen w-[min(480px,90vw)] flex-col border-l border-border bg-surface shadow-2xl"
        >
          <header class="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
            <h2
              id="edit-task-panel-title"
              class="text-lg font-semibold text-text-primary"
            >
              {t("tasks.form.editPanelTitle")}
            </h2>
            <button
              type="button"
              aria-label={t("tasks.form.cancel")}
              onClick={handleCancelEdit}
              data-action="close-edit-task-panel"
              class="rounded-md p-1 text-text-secondary transition-colors hover:bg-background hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <CloseIcon />
            </button>
          </header>
          <div class="flex-1 overflow-y-auto px-6 py-4">
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
          </div>
        </aside>
      </>
    )}

    {/* Modal de confirmación de delete (con backdrop, mismo patrón que el drawer). */}
    {confirmState.visible && task && (
      <>
        <div
          data-component="delete-confirmation-backdrop"
          class="fixed inset-0 z-30 bg-black/40"
          onClick={() => setConfirmState(closeDeleteConfirmation())}
          aria-hidden="true"
        />
        <div
          data-component="delete-confirmation"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirmation-title"
          class="fixed left-1/2 top-1/2 z-40 w-[min(420px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface p-6 shadow-2xl"
        >
          <h2
            id="delete-confirmation-title"
            class="text-lg font-semibold text-text-primary"
          >
            {t("tasks.detail.deleteConfirmTitle")}
          </h2>
          <p class="mt-2 text-sm text-text-secondary">
            {t("tasks.detail.deleteConfirmBody")}
          </p>
          <div class="mt-6 flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              data-action="cancel-delete"
              disabled={deleting}
              onClick={() => setConfirmState(closeDeleteConfirmation())}
            >
              {t("tasks.detail.deleteConfirmCancel")}
            </Button>
            <Button
              variant="primary"
              data-action="confirm-delete"
              class="!bg-error hover:!bg-error/90"
              disabled={deleting}
              onClick={() => {
                void handleDelete();
              }}
            >
              {deleting
                ? t("tasks.detail.deleting")
                : t("tasks.detail.deleteConfirmAccept")}
            </Button>
          </div>
        </div>
      </>
    )}
  </article>
}
