import { useState } from "octane";
import { t } from "../vendor/i18n/core";
import { createRpcClient, type RpcClient } from "../../lib/api/rpc";
import { Button } from "../atoms/button.tsrx";
import { Icon } from "../vendor/icons";
import { DataList } from "../molecules/data-list.tsrx";
import { EmptyState } from "../molecules/empty-state.tsrx";
import { TypeForm } from "../organisms/type-form/type-form.tsrx";
import { useOctaneQuery } from "../../hooks/use-octane-query";
import type { Type } from "@crm/types";

/**
 * Tab `tipos` dentro de `/config?tab=types`.
 *
 * CRUD completo (PRD-v2.md §8.7):
 *   - list (search + module filter)
 *   - create (drawer lateral derecho)
 *   - edit (drawer lateral derecho, mismo componente en `mode="edit"`)
 *   - remove (soft-delete vía botón en cada fila)
 *
 * Render plan:
 *   - Header: title + count + "+ Nuevo tipo" button.
 *   - Filtros: search (case-insensitive prefix) + module select.
 *   - Lista: cada fila tiene nombre, módulo badge, fecha de creación
 *     relativa, y acciones Edit / Delete.
 *   - EmptyState si no hay types (con CTA al create).
 *
 * Integración con `useQueryState('tab')` (Phase 5 de este change):
 * este tab se monta dentro de `<ConfigPage>` solo cuando
 * `activeTab === "types"`. El deep-link `/config?tab=types` carga el
 * tab directo (ver `config-page.tsrx`).
 *
 * Decisión de scope: la "vista grilla" del PRD se reemplaza por una
 * lista vertical (DataList) — el form drawer es un único flujo con
 * name + module (sin columnas, sin BaseView). El PRD menciona
 * BaseView para la grilla de tasks/clients/incomes (vistas múltiples);
 * para un CRUD tan chico (5 campos totales) la lista compacta es
 * suficiente y evita el costo del BaseView molecule hasta que se
 * justifique.
 */

const RPC = createRpcClient(import.meta.env.VITE_API_URL ?? "/rpc");

const MODULE_OPTIONS = [
  { value: "tasks", labelKey: "types.module.tasks" },
  { value: "incomes", labelKey: "types.module.incomes" },
  { value: "expenses", labelKey: "types.module.expenses" },
  { value: "schedules", labelKey: "types.module.schedules" },
] as const;

type ModuleFilter = "" | (typeof MODULE_OPTIONS)[number]["value"];

export function TypesTab() @{
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingType, setEditingType] = useState<Type | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const typesQuery = useOctaneQuery<Type[]>(
    () =>
      (RPC as RpcClient).types.list({
        search,
        module: moduleFilter === "" ? null : moduleFilter,
        limit: 100,
      }) as Promise<Type[]>,
    [search, moduleFilter],
  );
  const types = typesQuery.data ?? [];
  const loading = typesQuery.loading;
  const loadError = typesQuery.error;

  const handleCreate = async (payload: {
    type_name: string;
    type_module: Type["type_module"];
  }) => {
    setActionError(null);
    try {
      await (RPC as RpcClient).types.create(payload);
      setCreateOpen(false);
      typesQuery.refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleUpdate = async (payload: {
    type_id: string;
    type_name?: string;
    type_module?: Type["type_module"];
  }) => {
    setActionError(null);
    try {
      await (RPC as RpcClient).types.update(payload);
      setEditingType(null);
      typesQuery.refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = async (typeId: string) => {
    setDeletingId(typeId);
    setActionError(null);
    try {
      await (RPC as RpcClient).types.remove({ type_id: typeId });
      setDeletingId(null);
      typesQuery.refetch();
    } catch {
      setDeletingId(null);
      setActionError(t("types.errors.deleteFailed"));
    }
  };

  <div data-component="types-tab" class="flex flex-col gap-6">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div class="min-w-0">
        <h2 class="text-sm font-medium text-text-secondary">
          {t("types.title")}
        </h2>
          {types.length > 0 && (
          <p class="mt-1 text-xs text-text-secondary">
            {types.length === 1
              ? t("types.count.one")
              : `${types.length} tipos`}
          </p>
        )}
      </div>
      <Button variant="primary" onClick={() => setCreateOpen(true)}>
        {t("types.actions.new")}
      </Button>
    </header>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <input
        type="search"
        value={search}
        onInput={(e: Event) => {
          const target = e.currentTarget as HTMLInputElement;
          setSearch(target.value);
        }}
        placeholder={t("types.search.placeholder")}
        aria-label={t("types.search.label")}
        class="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      />
      <select
        value={moduleFilter}
        onInput={(e: Event) => {
          const target = e.currentTarget as HTMLSelectElement;
          setModuleFilter(target.value as ModuleFilter);
        }}
        aria-label={t("types.filter.moduleLabel")}
        class="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <option value="">{t("types.filter.allModules")}</option>
        {MODULE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {t(opt.labelKey)}
          </option>
        ))}
      </select>
    </div>

    {actionError !== null && (
      <div
        role="alert"
        class="rounded-md border border-error bg-surface px-4 py-2 text-sm text-error"
      >
        {actionError}
      </div>
    )}

    <DataList
      loading={loading}
      error={loadError}
      isEmpty={types.length === 0}
      className="flex flex-col gap-3"
      skeleton={
        <>
          <div
            aria-hidden="true"
            class="rounded-md border border-border bg-surface px-4 py-3"
          >
            <div class="h-4 w-1/3 animate-pulse rounded bg-background" />
            <div class="mt-2 h-3 w-1/2 animate-pulse rounded bg-background" />
          </div>
        </>
      }
      emptyState={
        <EmptyState
          icon={<Icon name="gear" size={48} />}
          title={
            search !== "" || moduleFilter !== ""
              ? t("types.listEmpty.noResults")
              : t("types.listEmpty.noTypes")
          }
          description={
            search !== "" || moduleFilter !== ""
              ? t("types.listEmpty.noResultsBody")
              : t("types.listEmpty.noTypesBody")
          }
          action={
            search === "" && moduleFilter === "" ? (
              <Button
                variant="primary"
                onClick={() => setCreateOpen(true)}
              >
                {t("types.actions.new")}
              </Button>
            ) : undefined
          }
        />
      }
    >
      <ul class="flex flex-col gap-3">
        {types.map((type) => (
          <li
            key={type.type_id}
            data-component="type-row"
            class="flex items-stretch gap-3 rounded-md border border-border bg-surface transition-colors hover:bg-background"
          >
            <div class="flex min-w-0 flex-1 flex-col justify-center gap-1 px-4 py-3">
              <div class="flex items-center gap-2">
                <span class="truncate text-sm font-medium text-text-primary">
                  {type.type_name}
                </span>
                <span class="inline-flex items-center rounded-full bg-background px-2 py-0.5 text-xs font-medium text-text-secondary">
                  {t(`types.module.${type.type_module}`)}
                </span>
              </div>
            </div>
            <div class="flex shrink-0 items-center gap-1 px-2">
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  setActionError(null);
                  setEditingType(type);
                }}
                aria-label={t("types.actions.edit")}
                class="px-3 py-1 text-sm"
              >
                {t("types.actions.edit")}
              </Button>
              <Button
                variant="ghost"
                type="button"
                disabled={deletingId === type.type_id}
                onClick={() => {
                  void handleDelete(type.type_id);
                }}
                aria-label={t("types.actions.delete")}
                class="px-3 py-1 text-sm text-error hover:bg-error/10"
              >
                {deletingId === type.type_id
                  ? t("types.actions.deleting")
                  : t("types.actions.delete")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </DataList>

    {createOpen ? (
      <TypeForm
        mode="create"
        onSubmit={handleCreate}
        onClose={() => setCreateOpen(false)}
      />
    ) : null}

    {editingType !== null ? (
      <TypeForm
        mode="edit"
        initial={{
          name: editingType.type_name,
          module: editingType.type_module,
        }}
        editingId={editingType.type_id}
        onSubmit={async (payload) => {
          await handleUpdate({
            type_id: editingType.type_id,
            type_name: payload.type_name,
            type_module: payload.type_module,
          });
        }}
        onClose={() => setEditingType(null)}
      />
    ) : null}
  </div>
}
