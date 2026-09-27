import { useEffect, useRef, useState } from "octane";
import { t } from "../vendor/i18n/core";
import { createRpcClient, type RpcClient } from "../../lib/api/rpc";
import { BaseView, type ViewKind } from "../base-view/base-view.tsrx";
import { Button } from "../atoms/button.tsrx";
import { StatusMessage } from "../atoms/status-message.tsrx";
import { Icon } from "../vendor/icons";
import { TaskListItem } from "../molecules/task-list-item.tsrx";
import { TaskKanbanBoard } from "../organisms/task-kanban-board/task-kanban-board.tsrx";
import { DataList } from "../molecules/data-list.tsrx";
import { TaskForm } from "../organisms/task-form/task-form.tsrx";
import type {
  TaskFormState,
} from "../organisms/task-form/task-form.logic";
import type { TaskFilters } from "../organisms/task-form/task-form.logic";

/**
 * Página `/tasks` (PR-F / WU12 + Fase B del tasks-flow + UX polish impeccable).
 *
 * Composición:
 * - Toolbar: botón "Nueva tarea" abre un drawer lateral derecho con el
 *   TaskForm (mode="create") o un empty state rico cuando no hay task_states
 *   configurados (con CTA a /tasks-config — sigue la regla de "empty states
 *   should teach the interface" de la skill impeccable).
 * - Botón gear navega a `/tasks-config`.
 * - BaseView con `id="tasks-list"` lista los records del `RPC.tasks.list`.
 *   Cada record se renderiza como anchor → /tasks/:id (Fase D).
 *
 * El componente `.tsrx` no se testea en bun:test (plugin Octane). Las tests
 * E2E se cubren con agent-browser. La lógica de filter persistence vive en
 * BaseView.helpers (testeable) y la lógica del form en task-form.logic.ts
 * (testeable).
 */

interface TaskRow {
  task_id: string;
  task_title: string;
  task_description: string | null;
  task_clie_id: string | null;
  task_cate_id: string | null;
  task_tast_id: string;
  task_type_id: string | null;
  task_updated_at: string | null;
  task_created_at: string | null;
}

interface TaskStateOption {
  tast_id: string;
  tast_name: string;
}

interface TypeForFormOption {
  type_id: string;
  type_name: string;
}

const RPC = createRpcClient(import.meta.env.VITE_API_URL ?? "/rpc");

function emptyCategoriesLookup(): string[] {
  return [];
}

function CloseIcon() @{
  // 16x16, 1.5 stroke, currentColor. Inline SVG para evitar dependencia de lucide.
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

function InboxIcon() @{
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
}

/**
 * Empty state para el drawer de "Nueva tarea" cuando todavía no hay
 * task_states configurados. Sigue la regla de la skill impeccable
 * ("empty states should teach the interface, not say 'nothing here'"):
 * icono + headline + descripción + acción primaria (CTA a /tasks-config) +
 * acción secundaria (cancelar).
 */
function CreateTaskEmptyStates() @{
  <div
    data-slot="no-states"
    class="flex flex-col items-center text-center py-8 px-2"
  >
    <div class="mb-4 text-text-secondary">
      <InboxIcon />
    </div>
    <h3 class="text-base font-semibold text-text-primary mb-2">
      {t("tasks.form.noStatesTitle")}
    </h3>
    <p class="text-sm text-text-secondary mb-6 max-w-xs">
      {t("tasks.form.noStatesDescription")}
    </p>
    <button
      type="button"
      onClick={() => globalThis.location.assign("/tasks-config")}
      data-action="go-to-tasks-config"
      class="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 dark:hover:bg-primary-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      {t("tasks.form.noStatesCta")}
    </button>
    <button
      type="button"
      onClick={() => globalThis.history.back()}
      class="mt-3 text-sm text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus rounded"
    >
      {t("tasks.form.cancel")}
    </button>
  </div>
}

/**
 * Skeleton placeholder mientras se carga la lista (mismas dimensiones que
 * un TaskListItem real para evitar layout shift). El pulse de opacidad es
 * deliberadamente sutil — la idea es "acá va algo", no "estoy cargando
 * furiosamente". Sin esto, en hard reload el user veía flash del empty
 * state durante ~100-300ms antes de que aparezcan las cards, lo que se
 * sentía como "tarda en cargar" aunque la red fuera instantánea.
 */
function TaskListItemSkeleton() @{
  <div
    aria-hidden="true"
    class="flex items-start gap-4 rounded-md border border-border bg-surface px-4 py-3"
  >
    <div class="min-w-0 flex-1 space-y-2">
      <div class="h-4 w-2/3 animate-pulse rounded bg-background" />
      <div class="h-3 w-full animate-pulse rounded bg-background" />
    </div>
    <div class="flex shrink-0 flex-col items-end gap-2">
      <div class="h-5 w-16 animate-pulse rounded-full bg-background" />
      <div class="h-3 w-12 animate-pulse rounded bg-background" />
    </div>
  </div>
}

export function TasksPage() @{
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [filters, setFilters] = useState<TaskFilters>({ search: "" });
  const [creatingOpen, setCreatingOpen] = useState(false);
  const [taskStates, setTaskStates] = useState<TaskStateOption[]>([]);
  const [taskTypes, setTaskTypes] = useState<TypeForFormOption[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  // Estado de carga: empieza en true para evitar el flash de empty state
  // en hard reload (el SSR no tiene los datos, el primer render con tasks=[]
  // mostraba "No hay tareas" durante 100-300ms antes de que llegue la data).
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  // Carga de la lista de tasks.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const result = (await (RPC as RpcClient).tasks.list({
          search: filters.search,
        })) as TaskRow[];
        if (!cancelled) {
          setTasks(result);
        }
      } catch {
        if (!cancelled) {
          setLoadError(t("tasks.listLoadError"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [filters, refreshKey]);

  // Carga de task_states y task_types para los selects del form.
  useEffect(() => {
    const load = async () => {
      try {
        const [states, types] = await Promise.all([
          (RPC as RpcClient).tasks.states.list() as Promise<TaskStateOption[]>,
          (RPC as RpcClient).tasks.typesForForm() as Promise<TypeForFormOption[]>,
        ]);
        setTaskStates(states);
        setTaskTypes(types);
      } catch {
        setTaskStates([]);
        setTaskTypes([]);
      }
    };
    void load();
  }, []);

  // Escape cierra el drawer. Listener solo activo cuando el drawer está abierto.
  useEffect(() => {
    if (!creatingOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCreatingOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [creatingOpen]);

  // Focus el primer input del form al abrir el drawer (después del slide-in).
  useEffect(() => {
    if (!creatingOpen) return;
    const id = setTimeout(() => titleInputRef.current?.focus(), 220);
    return () => clearTimeout(id);
  }, [creatingOpen]);

  // Lock body scroll cuando el drawer está abierto.
  useEffect(() => {
    if (!creatingOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [creatingOpen]);

  const handleCreate = async (state: TaskFormState): Promise<void> => {
    // OPTIMISTIC UPDATE: cerramos el drawer y mostramos la task nueva al
    // toque, antes de que el RPC complete. Si falla, removemos la task
    // optimista y mostramos el error. Si succeed, el setRefreshKey trae
    // la version canónica del server (con el ID real).
    const tempId = `pending-${crypto.randomUUID()}`;
    const optimisticTask: TaskRow = {
      task_id: tempId,
      task_title: state.title,
      task_description: state.description,
      task_clie_id: null,
      task_cate_id: null,
      task_tast_id: state.stateId || "",
      task_type_id: state.typeId || null,
      task_updated_at: new Date().toISOString(),
      task_created_at: new Date().toISOString(),
    };
    setTasks((prev) => [optimisticTask, ...prev]);
    setCreatingOpen(false);
    try {
      await (RPC as RpcClient).tasks.create({
        task_title: state.title,
        task_description: state.description,
        task_tast_id: state.stateId || undefined,
        task_type_id: state.typeId || undefined,
      });
      // Re-fetch desde el server: la task optimista se reemplaza por la
      // canónica (con ID real) gracias al replace por task_id. Si la
      // API re-ordena items, también queda el orden correcto.
      setRefreshKey((k) => k + 1);
    } catch (err) {
      // Roll back: remover la optimista + exponer el error inline.
      setTasks((prev) => prev.filter((t) => t.task_id !== tempId));
      setLoadError(
        err instanceof Error ? err.message : "create failed",
      );
    }
  };

  // Lookup: stateId → state name (closure sobre taskStates).
  const stateNameById = new Map(taskStates.map((s) => [s.tast_id, s.tast_name]));

  <section data-page="tasks" class="mx-auto w-full max-w-4xl px-6 py-8 sm:py-10">
    <header class="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div class="min-w-0">
        <h1 class="text-2xl font-bold text-text-primary tracking-tight sm:text-3xl">
          {t("tasks.page.title")}
        </h1>
        {tasks.length > 0 && (
          <p class="mt-1 text-sm text-text-secondary">
            {tasks.length === 1
              ? "1 tarea"
              : `${tasks.length} tareas`}
          </p>
        )}
      </div>
      <div class="flex items-center gap-2">
        <a
          href="/tasks-config"
          aria-label={t("tasks.page.configTooltip")}
          title={t("tasks.page.configTooltip")}
          data-component="tasks-config-link"
          class="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-text-secondary transition-colors hover:bg-background hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <Icon name="gear" size={18} />
        </a>
        <Button
          variant="primary"
          onClick={() => setCreatingOpen(true)}
        >
          {t("tasks.page.newTask")}
        </Button>
      </div>
    </header>

    <DataList
      loading={loading}
      error={loadError}
      isEmpty={tasks.length === 0}
      className="flex flex-col gap-3"
      skeleton={
        <>
          <TaskListItemSkeleton />
          <TaskListItemSkeleton />
          <TaskListItemSkeleton />
        </>
      }
      emptyState={
        <div
          data-component="tasks-list-empty"
          class="flex flex-col items-center rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center"
        >
          <div class="mb-4 text-text-secondary">
            <Icon name="check-square" size={48} />
          </div>
          <h2 class="text-lg font-semibold text-text-primary">
            {t("tasks.listEmpty.title")}
          </h2>
          <p class="mt-2 max-w-sm text-sm text-text-secondary">
            {t("tasks.listEmpty.description")}
          </p>
          <Button
            variant="primary"
            onClick={() => setCreatingOpen(true)}
            class="mt-6"
          >
            {t("tasks.page.newTask")}
          </Button>
        </div>
      }
    >
      <BaseView<TaskFilters>
        id="tasks-list"
        moduleId="tasks"
        filters={filters}
        records={tasks}
        views={["list", "grid", "kanban"] satisfies ViewKind[]}
        onFilterChange={setFilters}
        listStructure={{
          row: (r) => {
            const task = r as TaskRow;
            const stateName = stateNameById.get(task.task_tast_id) ?? null;
            return (
              <TaskListItem
                task_id={task.task_id}
                task_title={task.task_title}
                task_description={task.task_description}
                stateName={stateName}
                updatedAt={task.task_updated_at}
              />
            );
          },
        }}
        gridStructure={{
          columns: 3,
          card: (r) => {
            const task = r as TaskRow;
            const stateName = stateNameById.get(task.task_tast_id) ?? null;
            return (
              <TaskListItem
                task_id={task.task_id}
                task_title={task.task_title}
                task_description={task.task_description}
                stateName={stateName}
                updatedAt={task.task_updated_at}
              />
            );
          },
        }}
        kanbanStructure={{
          board: ({ records, onMove }) => (
            <TaskKanbanBoard
              tasks={records as Parameters<typeof TaskKanbanBoard>[0]["tasks"]}
              states={taskStates.map((s) => ({
                stateId: s.tast_id,
                stateName: s.tast_name,
                stateOrder: 0,
              }))}
              onMove={async (params) => {
                // OPTIMISTIC MOVE: movemos localmente y disparamos el RPC
                // en background. Si falla, revertimos vía refreshKey.
                const previousTasks = tasks;
                setTasks((prev) =>
                  prev.map((t) =>
                    t.task_id === params.taskId
                      ? { ...t, task_tast_id: params.targetStateId }
                      : t,
                  ),
                );
                try {
                  await (RPC as RpcClient).tasks.move({
                    task_id: params.taskId,
                    target_state_id: params.targetStateId,
                  });
                  setRefreshKey((k) => k + 1);
                } catch {
                  setTasks(previousTasks);
                  setLoadError(t("tasks.detail.moveError"));
                }
                void onMove;
              }}
            />
          ),
        }}
      />
    </DataList>

    {creatingOpen && (
      <>
        {/* Backdrop: oscurece la página y cierra el drawer al hacer click */}
        <div
          data-component="create-task-backdrop"
          class="fixed inset-0 z-30 bg-black/40 transition-opacity duration-200"
          onClick={() => setCreatingOpen(false)}
          aria-hidden="true"
        />
        {/* Drawer lateral derecho */}
        <aside
          data-component="create-task-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-task-panel-title"
          tabindex="-1"
          class="fixed top-0 right-0 z-40 flex h-screen w-[min(480px,90vw)] flex-col border-l border-border bg-surface shadow-2xl"
        >
          <header class="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
            <h2
              id="create-task-panel-title"
              class="text-lg font-semibold text-text-primary"
            >
              {t("tasks.form.createPanelTitle")}
            </h2>
            <button
              type="button"
              aria-label={t("tasks.form.cancel")}
              onClick={() => setCreatingOpen(false)}
              data-action="close-create-task-panel"
              class="rounded-md p-1 text-text-secondary transition-colors hover:bg-background hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <CloseIcon />
            </button>
          </header>
          <div class="flex-1 overflow-y-auto px-6 py-4">
            {taskStates.length === 0 ? (
              <CreateTaskEmptyStates />
            ) : (
              <TaskForm
                mode="create"
                initial={{}}
                availableStates={taskStates}
                availableTypes={taskTypes}
                availableCategoriesFor={emptyCategoriesLookup}
                onSubmit={handleCreate}
                onCancel={() => setCreatingOpen(false)}
              />
            )}
          </div>
        </aside>
      </>
    )}
  </section>
}
