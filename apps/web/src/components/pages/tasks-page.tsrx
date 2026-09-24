import { useEffect, useState } from "octane";
import { t } from "../vendor/i18n/core";
import { createRpcClient, type RpcClient } from "../../lib/api/rpc";
import { BaseView, type ViewKind } from "../base-view/base-view.tsrx";
import { TaskForm } from "../organisms/task-form/task-form.tsrx";
import type {
  TaskFormState,
} from "../organisms/task-form/task-form.logic";
import type { TaskFilters } from "../organisms/task-form/task-form.logic";

/**
 * Página `/tasks` (PR-F / WU12 + Fase B del tasks-flow).
 *
 * Composición:
 * - Toolbar: botón "Nueva tarea" abre panel lateral con TaskForm (mode="create").
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

export function TasksPage() @{
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [filters, setFilters] = useState<TaskFilters>({ search: "" });
  const [creatingOpen, setCreatingOpen] = useState(false);
  const [taskStates, setTaskStates] = useState<TaskStateOption[]>([]);
  const [taskTypes, setTaskTypes] = useState<TypeForFormOption[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

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
        <button
          type="button"
          data-component="new-task-button"
          onClick={() => setCreatingOpen(true)}
        >
          {t("tasks.page.newTask")}
        </button>
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
      <aside
        data-component="create-task-panel"
        role="dialog"
        aria-label={t("tasks.form.createPanelTitle")}
      >
        <header>
          <h2>{t("tasks.form.createPanelTitle")}</h2>
          <button
            type="button"
            aria-label={t("tasks.form.cancel")}
            onClick={() => setCreatingOpen(false)}
          >
            ×
          </button>
        </header>
        {taskStates.length === 0 ? (
          <p data-slot="no-states">{t("tasks.form.noStatesAvailable")}</p>
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
      </aside>
    )}
  </section>
}
