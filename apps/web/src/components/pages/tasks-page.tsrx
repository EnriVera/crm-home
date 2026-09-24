import { useEffect, useRef, useState } from "octane";
import { t } from "../vendor/i18n/core";
import { createRpcClient, type RpcClient } from "../../lib/api/rpc";
import { BaseView, type ViewKind } from "../base-view/base-view.tsrx";
import { Button } from "../atoms/button.tsrx";
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

export function TasksPage() @{
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [filters, setFilters] = useState<TaskFilters>({ search: "" });
  const [creatingOpen, setCreatingOpen] = useState(false);
  const [taskStates, setTaskStates] = useState<TaskStateOption[]>([]);
  const [taskTypes, setTaskTypes] = useState<TypeForFormOption[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  // Carga de la lista de tasks.
  useEffect(() => {
    const load = async () => {
      try {
        const result = (await (RPC as RpcClient).tasks.list({
          search: filters.search,
        })) as TaskRow[];
        setTasks(result);
      } catch {
        setTasks([]);
      }
    };
    void load();
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
    await (RPC as RpcClient).tasks.create({
      task_title: state.title,
      task_description: state.description,
      task_tast_id: state.stateId || undefined,
      task_type_id: state.typeId || undefined,
    });
    setCreatingOpen(false);
    setRefreshKey((k) => k + 1);
  };

  <section data-page="tasks">
    <header class="flex items-center justify-between gap-4">
      <h1>{t("tasks.page.title")}</h1>
      <div class="flex gap-2">
        <a
          href="/tasks-config"
          aria-label={t("tasks.page.configTooltip")}
          title={t("tasks.page.configTooltip")}
          data-component="tasks-config-link"
        >
          ⚙
        </a>
        <Button
          variant="primary"
          onClick={() => setCreatingOpen(true)}
          data-component="new-task-button"
        >
          {t("tasks.page.newTask")}
        </Button>
      </div>
    </header>

    <BaseView<TaskFilters>
      id="tasks-list"
      moduleId="tasks"
      filters={filters}
      records={tasks}
      views={["list", "grid", "kanban"] satisfies ViewKind[]}
      onFilterChange={setFilters}
      listStructure={{
        row: (r) => (
          <a href={`/tasks/${(r as TaskRow).task_id}`}>
            {(r as TaskRow).task_title}
          </a>
        ),
      }}
      gridStructure={{
        columns: 3,
        card: (r) => (
          <a href={`/tasks/${(r as TaskRow).task_id}`}>
            {(r as TaskRow).task_title}
          </a>
        ),
      }}
      kanbanStructure={{
        board: ({ records }) => `${records.length} tasks`,
      }}
    />

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
