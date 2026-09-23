import { useEffect, useState } from "octane";
import { t } from "../vendor/i18n/core";
import { createRpcClient, type RpcClient } from "../../lib/api/rpc";
import { BaseView, type ViewKind } from "../base-view/base-view.tsrx";
import type { TaskFilters } from "../organisms/task-form/task-form.logic";

/**
 * Página `/tasks` (PR-F / WU12). Composición del módulo tasks:
 *
 * - Toolbar: botón "Nueva tarea" (`tasks.page.newTask`) + botón gear con
 *   tooltip `tasks.page.configTooltip` que navega a `/tasks-config`.
 * - BaseView con `id="tasks-list"` para persistir filtros en localStorage
 *   (namespace `base-view:tasks:tasks-list`, regla §D2 del design).
 * - rpc.tasks.list vía el namespace `tasks` del RpcClient multi-contract
 *   (W7). NUNCA `rpc.auth.*` para datos de tareas.
 *
 * El componente `.tsrx` no se testea en bun:test (plugin Octane). Las tests
 * E2E se cubren con el pipeline de Octane corriendo. La lógica de filter
 * persistence vive en BaseView.helpers (testeable) y la lógica del form
 * en task-form.logic.ts (testeable).
 */

interface TaskRow {
  task_id: string;
  task_title: string;
  task_description: string | null;
  task_clie_id: string | null;
  task_cate_id: string | null;
  task_tast_id: string;
}

const RPC = createRpcClient(import.meta.env.VITE_API_URL ?? "/rpc");

export function TasksPage() @{
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [filters, setFilters] = useState<TaskFilters>({ search: "" });

  useEffect(() => {
    const load = async () => {
      try {
        const result = (await (RPC as RpcClient).tasks.list({
          search: filters.search,
        })) as TaskRow[];
        setTasks(result);
      } catch {
        // Errores se manejan a nivel de UI (toast) en WU11+.
        setTasks([]);
      }
    };
    void load();
  }, [filters]);

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
          onClick={() => (globalThis.location.href = "/tasks?new=true")}
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
        row: (r) => (r as TaskRow).task_title,
      }}
      gridStructure={{
        columns: 3,
        card: (r) => (r as TaskRow).task_title,
      }}
      kanbanStructure={{
        board: ({ records }) => `${records.length} tasks`,
      }}
    />
  </section>
}
