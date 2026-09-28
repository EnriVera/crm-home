import { useEffect, useState } from "octane";
import { t } from "../vendor/i18n/core";
import { createRpcClient, type RpcClient } from "../../lib/api/rpc";
import { Button } from "../atoms/button.tsrx";
import { StatusMessage } from "../atoms/status-message.tsrx";
import { TaskStateForm } from "../organisms/task-state-form/task-state-form.tsrx";
import { DataList } from "../molecules/data-list.tsrx";
import { EmptyState } from "../molecules/empty-state.tsrx";
import { useOctaneQuery } from "../../hooks/use-octane-query";
import {
  buildStateSubmitParams,
  type TaskStateFormMode,
} from "../organisms/task-state-form/task-state-form.logic";

/**
 * Página `/tasks-config` (PR-F / WU14 + Fase C del tasks-flow + UX polish).
 *
 * Tab único MVP "Estados":
 * - Carga `rpc.tasks.states.list` y los renderiza como cards.
 * - Cada card: nombre, badge de orden (#N), botones mover ↑/↓, Editar, Eliminar.
 * - "Agregar estado" abre el TaskStateForm en mode="create" en un drawer.
 * - "Editar" abre el drawer en mode="update".
 * - "Eliminar" abre modal de confirmación → `rpc.tasks.states.remove`.
 *
 * Estructura visual (Operate / design.md):
 * - Header con título jerarquizado + primary CTA "Agregar estado" a la derecha.
 * - Una sola acción primaria por pantalla (la verde de "Agregar").
 * - Lista de estados como cards (mismo lenguaje que TaskListItem).
 * - Drawer lateral derecho para create/edit (mismo patrón que task drawer).
 * - Modal centrado para delete confirm.
 *
 * Sin item de nav en el sidebar (decisión confirmada del spec WU14).
 */

interface TaskState {
  tast_id: string;
  tast_name: string;
  tast_order: number;
}

const RPC = createRpcClient(import.meta.env.VITE_API_URL ?? "/rpc");

/**
 * Skeleton placeholder para una fila de estado (mismas dimensiones que la
 * fila real para evitar layout shift). Mismo lenguaje que TaskListItemSkeleton:
 * pulse sutil, aria-hidden, surface + border.
 */
function TaskStateRowSkeleton() @{
  <div
    aria-hidden="true"
    class="flex items-center gap-3 rounded-md border border-border bg-surface px-4 py-3"
  >
    <div class="h-7 w-7 shrink-0 animate-pulse rounded-full bg-background" />
    <div class="h-4 flex-1 animate-pulse rounded bg-background" />
    <div class="flex items-center gap-1">
      <div class="h-8 w-8 animate-pulse rounded-md bg-background" />
      <div class="h-8 w-8 animate-pulse rounded-md bg-background" />
      <div class="h-8 w-16 animate-pulse rounded-md bg-background" />
      <div class="h-8 w-16 animate-pulse rounded-md bg-background" />
    </div>
  </div>
}

function CloseIcon() @{
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

export function TasksConfigPage() @{
  const [editing, setEditing] = useState<TaskStateFormMode | null>(null);
  const [editingState, setEditingState] = useState<TaskState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Carga de estados vía useOctaneQuery. Cancel + finally vienen gratis del
  // QueryObserver (el bug original del useEffect sin finally está curado
  // por el query core, no por el hook).
  const statesQuery = useOctaneQuery<TaskState[]>(
    () =>
      (RPC as RpcClient).tasks.states.list() as Promise<TaskState[]>,
    [],
  );
  const states = statesQuery.data ?? [];
  const loading = statesQuery.loading;
  const loadError = statesQuery.error;

  function refresh(): void {
    statesQuery.refetch();
  }

  // Escape cierra drawer / modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        if (deletingId !== null) {
          setDeletingId(null);
        } else if (editing !== null) {
          setEditing(null);
          setEditingState(null);
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editing, deletingId]);

  // Lock body scroll cuando drawer o modal están abiertos.
  useEffect(() => {
    if (editing === null && deletingId === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [editing, deletingId]);

  const handleSubmit = async (
    params: ReturnType<typeof buildStateSubmitParams>,
  ): Promise<void> => {
    if (params.stateId === null) {
      await (RPC as RpcClient).tasks.states.create({
        tast_name: params.input.tast_name,
        tast_order: params.input.tast_order,
      });
    } else {
      await (RPC as RpcClient).tasks.states.update({
        tast_id: params.stateId,
        tast_name: params.input.tast_name,
        tast_order: params.input.tast_order,
      });
    }
    setEditing(null);
    setEditingState(null);
    refresh();
  };

  const handleDelete = async (): Promise<void> => {
    if (!deletingId) return;
    try {
      await (RPC as RpcClient).tasks.states.remove({
        tast_id: deletingId,
      });
      setDeletingId(null);
      refresh();
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
    try {
      await (RPC as RpcClient).tasks.states.reorder(reordered);
      refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "reorder failed",
      );
      refresh();
    }
  };

  <section
    data-page="tasks-config"
    class="mx-auto w-full max-w-3xl px-6 py-8 sm:py-10"
  >
    <header class="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div class="min-w-0">
        <h1 class="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
          {t("tasks.statuses.label")}
        </h1>
        <p class="mt-1 text-sm text-text-secondary">
          {states.length === 0
            ? "Configurá los estados del kanban."
            : states.length === 1
            ? "1 estado configurado"
            : `${states.length} estados configurados`}
        </p>
      </div>
      <Button
        variant="primary"
        data-action="new-state"
        onClick={() => {
          setEditing("create");
          setEditingState(null);
        }}
      >
        {t("tasks.statuses.add")}
      </Button>
    </header>

    <DataList
      loading={loading}
      error={loadError ?? error}
      isEmpty={states.length === 0}
      className="flex flex-col gap-3"
      skeleton={
        <>
          <TaskStateRowSkeleton />
          <TaskStateRowSkeleton />
          <TaskStateRowSkeleton />
        </>
      }
      emptyState={
        <EmptyState
          kind="empty"
          padding="py-12"
          title={t("tasks.state.empty")}
          description="Los estados son las columnas del kanban. Empezá creando el primero."
          action={
            <Button
              variant="primary"
              onClick={() => {
                setEditing("create");
                setEditingState(null);
              }}
            >
              {t("tasks.statuses.add")}
            </Button>
          }
        />
      }
    >
      <ul data-component="task-states-list" class="flex flex-col gap-3">
        {states.map((s, i) => (
          <li
            key={s.tast_id}
            data-state-id={s.tast_id}
            data-state-order={s.tast_order}
            class="flex items-center gap-3 rounded-md border border-border bg-surface px-4 py-3"
          >
            <span class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-background text-xs font-medium text-text-secondary">
              #{s.tast_order}
            </span>
            <span class="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">
              {s.tast_name}
            </span>
            <div class="flex items-center gap-1">
              <button
                type="button"
                data-action="move-up"
                disabled={i === 0}
                onClick={() => {
                  void handleMove(s.tast_id, "up");
                }}
                aria-label={`Mover ${s.tast_name} arriba`}
                class="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-background hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
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
                aria-label={`Mover ${s.tast_name} abajo`}
                class="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-background hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                ↓
              </button>
              <Button
                variant="ghost"
                data-action="edit"
                onClick={() => {
                  setEditing("update");
                  setEditingState(s);
                }}
              >
                {t("tasks.statuses.edit")}
              </Button>
              <Button
                variant="ghost"
                data-action="delete"
                class="!text-error hover:bg-error/10"
                onClick={() => setDeletingId(s.tast_id)}
              >
                {t("tasks.statuses.delete")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </DataList>

    {/* Drawer de edición/creación de estado (mismo lenguaje que task drawer). */}
    {editing !== null && (
      <>
        <div
          data-component="state-form-backdrop"
          class="fixed inset-0 z-30 bg-black/40"
          onClick={() => {
            setEditing(null);
            setEditingState(null);
          }}
          aria-hidden="true"
        />
        <aside
          data-component="state-form-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="state-form-panel-title"
          tabindex="-1"
          class="fixed top-0 right-0 z-40 flex h-screen w-[min(420px,90vw)] flex-col border-l border-border bg-surface shadow-2xl"
        >
          <header class="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
            <h2
              id="state-form-panel-title"
              class="text-lg font-semibold text-text-primary"
            >
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
              data-action="close-state-form-panel"
              class="rounded-md p-1 text-text-secondary transition-colors hover:bg-background hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <CloseIcon />
            </button>
          </header>
          <div class="flex-1 overflow-y-auto px-6 py-4">
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
          </div>
        </aside>
      </>
    )}

    {/* Modal de confirmación de delete. */}
    {deletingId !== null && (
      <>
        <div
          data-component="delete-state-backdrop"
          class="fixed inset-0 z-30 bg-black/40"
          onClick={() => setDeletingId(null)}
          aria-hidden="true"
        />
        <div
          data-component="delete-state-confirmation"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-state-title"
          class="fixed left-1/2 top-1/2 z-40 w-[min(420px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface p-6 shadow-2xl"
        >
          <h2
            id="delete-state-title"
            class="text-lg font-semibold text-text-primary"
          >
            {t("tasks.statuses.deleteConfirm") ??
              "¿Eliminar este estado?"}
          </h2>
          <p class="mt-2 text-sm text-text-secondary">
            {t("tasks.statuses.deleteConfirmBody") ??
              "Esta acción no se puede deshacer."}
          </p>
          <div class="mt-6 flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              data-action="cancel-delete-state"
              onClick={() => setDeletingId(null)}
            >
              {t("tasks.form.cancel")}
            </Button>
            <Button
              variant="primary"
              data-action="confirm-delete-state"
              class="!bg-error hover:!bg-error/90"
              onClick={() => {
                void handleDelete();
              }}
            >
              {t("tasks.statuses.delete")}
            </Button>
          </div>
        </div>
      </>
    )}
  </section>
}
