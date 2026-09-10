import { t } from "../vendor/i18n/core";
import { createRpcClient, type RpcClient } from "../lib/api/rpc";

/**
 * Página `/tasks-config` (PR-F / WU14). Tab "Estados" (único MVP — Tabs
 * Tipos/Categorías quedan para Fase 2).
 *
 * - Lista los task states del usuario (`rpc.tasks.states.list`).
 * - Botones Nuevo / Editar / Eliminar por estado.
 * - Diálogo de confirmación al eliminar (`tasks.statuses.deleteConfirm`).
 *
 * El componente .tsrx no se testea en bun:test (plugin Octane). La lógica
 * de validación vive en task-state-form.logic.ts (testeable).
 *
 * SIN item de nav en el sidebar (decisión confirmada del spec WU14).
 */

const RPC = createRpcClient(import.meta.env.VITE_API_URL ?? "/rpc");

export function TasksConfigPage() @{
  <section data-page="tasks-config">
    <header>
      <h1>{t("tasks.statuses.label")}</h1>
    </header>

    {/* Único tab MVP */}
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
      <button type="button" data-action="new-state">
        {t("tasks.statuses.add")}
      </button>

      <ul data-component="task-states-list">
        {/* Phase 2: iterar rpc.tasks.states.list + render TaskStateRow */}
      </ul>
    </section>
  </section>
}
