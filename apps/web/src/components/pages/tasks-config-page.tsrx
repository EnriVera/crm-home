import { useEffect, useState } from "octane";
import { t } from "../vendor/i18n/core";
import { createRpcClient, type RpcClient } from "../../lib/api/rpc";
import { TaskStateForm } from "../organisms/task-state-form/task-state-form.tsrx";
import {
  buildStateSubmitParams,
  type TaskStateFormMode,
} from "../organisms/task-state-form/task-state-form.logic";

/**
 * Página `/tasks-config` (PR-F / WU14 + Fase C del tasks-flow).
 *
 * Tab único MVP "Estados":
 * - Carga `rpc.tasks.states.list` y los renderiza en una lista.
 * - Por cada estado: nombre + orden + botones Editar / Eliminar / ↑ / ↓.
 * - "Agregar estado" abre el TaskStateForm en mode="create".
 * - "Editar" abre el TaskStateForm en mode="update" con `initial` del estado.
 * - "Eliminar" abre diálogo de confirmación → `rpc.tasks.states.remove`.
 * - ↑ / ↓ ajusta `tast_order` (swappea con el vecino) y llama
 *   `rpc.tasks.states.reorder` con el array completo.
 *
 * Sin item de nav en el sidebar (decisión confirmada del spec WU14).
 */

interface TaskState {
  tast_id: string;
  tast_name: string;
  tast_order: number;
}

const RPC = createRpcClient(import.meta.env.VITE_API_URL ?? "/rpc");

export function TasksConfigPage() @{
  const [states, setStates] = useState<TaskState[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editing, setEditing] = useState<TaskStateFormMode | null>(null);
  const [editingState, setEditingState] = useState<TaskState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Carga de estados.
  useEffect(() => {
    const load = async () => {
      try {
        const result = (await (RPC as RpcClient).tasks.states.list()) as TaskState[];
        setStates(result);
      } catch {
        setStates([]);
      }
    };
    void load();
  }, [refreshKey]);

  const handleSubmit = async (
    params: ReturnType<typeof buildStateSubmitParams>,
  ): Promise<void> => {
    if (params.stateId === null) {
      // create
      await (RPC as RpcClient).tasks.states.create({
        tast_name: params.input.tast_name,
        tast_order: params.input.tast_order,
      });
    } else {
      // update
      await (RPC as RpcClient).tasks.states.update({
        tast_id: params.stateId,
        tast_name: params.input.tast_name,
        tast_order: params.input.tast_order,
      });
    }
    setEditing(null);
    setEditingState(null);
    setRefreshKey((k) => k + 1);
  };

  const handleDelete = async (): Promise<void> => {
    if (!deletingId) return;
    try {
      await (RPC as RpcClient).tasks.states.remove({
        tast_id: deletingId,
      });
      setDeletingId(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "delete failed",
      );
      setDeletingId(null);
    }
  };

  const handleMove = async (
    tastId: string,
    direction: "up" | "down",
  ): Promise<void> => {
    const idx = states.findIndex((s) => s.tast_id === tastId);
    if (idx === -1) return;
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= states.length) return;
    const next = [...states];
    [next[idx], next[swapWith]] = [next[swapWith]!, next[idx]!];
    const reordered = next.map((s, i) => ({ tast_id: s.tast_id, tast_order: i }));
    // Optimistic update.
    setStates(next.map((s, i) => ({ ...s, tast_order: i })));
    try {
      await (RPC as RpcClient).tasks.states.reorder(reordered);
    } catch (err) {
      // Revert.
      setError(
        err instanceof Error ? err.message : "reorder failed",
      );
      setRefreshKey((k) => k + 1);
    }
  };

  <section data-page="tasks-config">
    <header>
      <h1>{t("tasks.statuses.label")}</h1>
    </header>

    {error && (
      <p data-slot="error" role="alert">
        {error}
      </p>
    )}

    <nav data-tab-bar role="tablist" aria-label={t("tasks.statuses.label")}>
      <button
        type="button"
        role="tab"
        aria-selected="true"
        data-tab="states"
        data-active="true"
      >
        {t("tasks.statuses.label")}
      </button>
    </nav>

    <section data-tab-panel="states">
      <button
        type="button"
        data-action="new-state"
        onClick={() => {
          setEditing("create");
          setEditingState(null);
        }}
      >
        {t("tasks.statuses.add")}
      </button>

      {states.length === 0 ? (
        <p data-slot="empty">{t("tasks.state.empty")}</p>
      ) : (
        <ul data-component="task-states-list">
          {states.map((s, i) => (
            <li
              key={s.tast_id}
              data-state-id={s.tast_id}
              data-state-order={s.tast_order}
            >
              <span>{s.tast_name}</span>
              <small>{`#${s.tast_order}`}</small>
              <button
                type="button"
                data-action="move-up"
                disabled={i === 0}
                onClick={() => {
                  void handleMove(s.tast_id, "up");
                }}
                aria-label={`Move ${s.tast_name} up`}
              >
                ↑
              </button>
              <button
                type="button"
                data-action="move-down"
                disabled={i === states.length - 1}
                onClick={() => {
                  void handleMove(s.tast_id, "down");
                }}
                aria-label={`Move ${s.tast_name} down`}
              >
                ↓
              </button>
              <button
                type="button"
                data-action="edit"
                onClick={() => {
                  setEditing("update");
                  setEditingState(s);
                }}
              >
                {t("tasks.statuses.edit")}
              </button>
              <button
                type="button"
                data-action="delete"
                onClick={() => setDeletingId(s.tast_id)}
              >
                {t("tasks.statuses.delete")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>

    {editing !== null && (
      <aside
        data-component="state-form-panel"
        role="dialog"
        aria-label={t("tasks.statuses.label")}
      >
        <header>
          <h2>
            {editing === "create"
              ? t("tasks.statuses.add")
              : t("tasks.statuses.edit")}
          </h2>
          <button
            type="button"
            aria-label={t("tasks.form.cancel")}
            onClick={() => {
              setEditing(null);
              setEditingState(null);
            }}
          >
            ×
          </button>
        </header>
        <TaskStateForm
          mode={editing}
          {...(editingState
            ? {
                existingStateId: editingState.tast_id,
                initial: {
                  tast_name: editingState.tast_name,
                  tast_order: editingState.tast_order,
                },
              }
            : {})}
          onSubmit={handleSubmit}
          onCancel={() => {
            setEditing(null);
            setEditingState(null);
          }}
        />
      </aside>
    )}

    {deletingId !== null && (
      <dialog
        open
        data-component="delete-state-confirmation"
        role="dialog"
      >
        <p>{t("tasks.statuses.deleteConfirm")}</p>
        <button
          type="button"
          data-action="cancel-delete-state"
          onClick={() => setDeletingId(null)}
        >
          {t("tasks.form.cancel")}
        </button>
        <button
          type="button"
          data-action="confirm-delete-state"
          onClick={() => {
            void handleDelete();
          }}
        >
          {t("tasks.statuses.delete")}
        </button>
      </dialog>
    )}
  </section>
}
