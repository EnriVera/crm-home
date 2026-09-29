import { useEffect, useMemo, useState } from "octane";
import { t } from "../vendor/i18n/core";
import { createRpcClient, type RpcClient } from "../../lib/api/rpc";
import { Button } from "../atoms/button.tsrx";
import { Icon } from "../vendor/icons";
import { DataList } from "../molecules/data-list.tsrx";
import { EmptyState } from "../molecules/empty-state.tsrx";
import { TypeForm } from "../organisms/type-form/type-form.tsrx";
import { useOctaneQuery } from "../../hooks/use-octane-query";
import {
  useQueryState,
  parseAsString,
  parseAsBoolean,
} from "@octanejs/nuqs";
import {
  TYPE_MODULE_NAMES,
  type TypeModuleName,
  type TypeModules,
  type Type,
} from "@crm/types";

/**
 * Tab `tipos` dentro de `/config?tab=types`.
 *
 * CRUD completo (PRD-v2.md §8.7):
 *   - list (search + module filter, ambos persistidos en URL + localStorage)
 *   - create (drawer via `?tab=types&new`)
 *   - edit   (drawer via `?tab=types&edit=<id>`)
 *   - remove (modal de confirmación local, NO en URL)
 *
 * Estado en URL (via @octanejs/nuqs):
 *   - `search`  → usePersistedQueryState (URL + localStorage)
 *   - `module`  → usePersistedQueryState (URL + localStorage). Internamente
 *                 se persiste como string; al leer se valida contra
 *                 TYPE_MODULE_NAMES y se normaliza a `TypeModuleName | null`.
 *   - `new`     → useQueryState transient (sin localStorage)
 *   - `edit`    → useQueryState transient (sin localStorage)
 *
 * Decisión de scope: el modal de confirmación de delete vive en local
 * state (no URL) — un reload accidental no debería completar un delete
 * que el user no confirmó explícitamente.
 *
 * Multi-módulo: cada type puede tener N módulos. La lista muestra un
 * tag por módulo; array vacío `[]` = "all modules" → un único tag "Todos".
 * El filter `module=null` matchea los all-modules (lo hace el backend
 * con `type_modules = '{}'`).
 */

const RPC = createRpcClient(import.meta.env.VITE_API_URL ?? "/rpc");

/** Set cerrado de módulos + null, para el filter del UI. */
const MODULE_FILTER_VALUES = ["", ...TYPE_MODULE_NAMES] as const;
type ModuleFilterValue = (typeof MODULE_FILTER_VALUES)[number];

/** Normaliza un string del URL a `TypeModuleName | null`. */
function parseModuleFilter(value: string): TypeModuleName | null {
  if (value === "") return null;
  return (TYPE_MODULE_NAMES as readonly string[]).includes(value)
    ? (value as TypeModuleName)
    : null;
}

/** Serializa `TypeModuleName | null` a string para el URL. */
function serializeModuleFilter(value: TypeModuleName | null): string {
  return value ?? "";
}

const MODULE_FILTER_OPTIONS = [
  { value: null, labelKey: "types.filter.allModules" },
  { value: "tasks", labelKey: "types.module.tasks" },
  { value: "incomes", labelKey: "types.module.incomes" },
  { value: "expenses", labelKey: "types.module.expenses" },
  { value: "schedules", labelKey: "types.module.schedules" },
] as const satisfies ReadonlyArray<{
  value: TypeModuleName | null;
  labelKey: string;
}>;

export function TypesTab() @{
  // ─── URL state: filtros (persistidos en URL + localStorage) ──────
  // Uso `useQueryState` directo + useEffect para localStorage en vez
  // de `usePersistedQueryState` porque el hook genérico tiene un
  // problema de inferencia con `parseAsString.withDefault("")` que
  // propaga `string | null` a los call sites downstream. Con
  // `useQueryState` directo el tipo es estricto `string`.
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault(""),
  );
  const [moduleFilterRaw, setModuleFilterRaw] = useQueryState(
    "module",
    parseAsString.withDefault(""),
  );

  // Persistencia localStorage: si la URL está vacía en mount,
  // hidrata desde localStorage. En cada cambio, escribe a
  // localStorage con la key namespace por tab.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storageKey = "crm-config-types-tab";
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === null) return;
      const parsed = JSON.parse(stored) as {
        search?: string;
        module?: string;
      };
      if (search === "" && typeof parsed.search === "string") {
        setSearch(parsed.search);
      }
      if (moduleFilterRaw === "" && typeof parsed.module === "string") {
        setModuleFilterRaw(parsed.module);
      }
    } catch {
      // localStorage deshabilitado o JSON inválido — caemos al default.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        "crm-config-types-tab",
        JSON.stringify({ search, module: moduleFilterRaw }),
      );
    } catch {
      // Quota / private mode — la app sigue funcionando.
    }
  }, [search, moduleFilterRaw]);

  const moduleFilter = parseModuleFilter(moduleFilterRaw);
  const setModuleFilter = (value: TypeModuleName | null): void => {
    setModuleFilterRaw(value === null ? "" : (value as string));
  };

  // ─── URL state: drawer create/edit (transient) ──────────────────
  const [isNewOpen, setIsNewOpen] = useQueryState(
    "new",
    parseAsBoolean.withDefault(false),
  );
  const [editId, setEditId] = useQueryState("edit", parseAsString.withDefault(""));

  // ─── Local state: confirmación de delete ─────────────────────────
  const [deleteTypeId, setDeleteTypeId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // ─── Query: list de types con filtros ─────────────────────────────
  const typesQuery = useOctaneQuery<Type[]>(
    () =>
      (RPC as RpcClient).types.list({
        search,
        module: moduleFilter,
        limit: 100,
      }) as Promise<Type[]>,
    [search, moduleFilter],
  );
  const types = typesQuery.data ?? [];
  const loading = typesQuery.loading;
  const loadError = typesQuery.error;

  // El type que se está editando: primero busca en la lista (sin RPC),
  // si no está (recarga con deep-link a /edit) → no se muestra el drawer.
  const editingType = useMemo(
    () => (editId === "" ? null : types.find((t) => t.type_id === editId) ?? null),
    [types, editId],
  );

  // ─── Handlers ──────────────────────────────────────────────────────
  const handleCreate = async (payload: {
    type_name: string;
    type_modules: TypeModules;
  }): Promise<void> => {
    setActionError(null);
    try {
      await (RPC as RpcClient).types.create({
        type_name: payload.type_name,
        type_modules: [...payload.type_modules],
      });
      setIsNewOpen(false);
      typesQuery.refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleUpdate = async (payload: {
    type_name: string;
    type_modules: TypeModules;
  }): Promise<void> => {
    setActionError(null);
    try {
      if (editingType === null) return;
      await (RPC as RpcClient).types.update({
        type_id: editingType.type_id,
        type_name: payload.type_name,
        type_modules: [...payload.type_modules],
      });
      setEditId("");
      typesQuery.refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (deleteTypeId === null) return;
    setDeleting(true);
    setActionError(null);
    try {
      await (RPC as RpcClient).types.remove({ type_id: deleteTypeId });
      setDeleteTypeId(null);
      setDeleting(false);
      typesQuery.refetch();
    } catch (err) {
      setDeleting(false);
      setActionError(err instanceof Error ? err.message : String(err));
    }
  };

  // ─── Render ───────────────────────────────────────────────────────
  <div data-component="types-tab" class="flex flex-col gap-6">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div class="min-w-0">
        <h2 class="text-sm font-medium text-text-secondary">{t("types.title")}</h2>
        {types.length > 0 && (
          <p class="mt-1 text-xs text-text-secondary">
            {types.length === 1
              ? t("types.count.one")
              : `${types.length} ${t("types.count.many")}`}
          </p>
        )}
      </div>
      <Button
        variant="primary"
        onClick={() => {
          setActionError(null);
          setIsNewOpen(true);
        }}
      >
        {t("types.actions.new")}
      </Button>
    </header>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <input
        type="search"
        value={(search ?? "") as string}
        onInput={(e: Event) => {
          const target = e.currentTarget as HTMLInputElement;
          setSearch(target.value);
        }}
        placeholder={t("types.search.placeholder")}
        aria-label={t("types.search.label")}
        class="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      />
      <select
        value={(moduleFilter ?? "") as string}
        onInput={(e: Event) => {
          const target = e.currentTarget as HTMLSelectElement;
          const next = parseModuleFilter(target.value);
          setModuleFilter(next);
        }}
        aria-label={t("types.filter.moduleLabel")}
        class="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {MODULE_FILTER_OPTIONS.map((opt) => (
          <option
            key={opt.value ?? "all"}
            value={opt.value ?? ""}
          >
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
            search !== "" || moduleFilter !== null
              ? t("types.listEmpty.noResults")
              : t("types.listEmpty.noTypes")
          }
          description={
            search !== "" || moduleFilter !== null
              ? t("types.listEmpty.noResultsBody")
              : t("types.listEmpty.noTypesBody")
          }
          action={
            search === "" && moduleFilter === null ? (
              <Button variant="primary" onClick={() => setIsNewOpen(true)}>
                {t("types.actions.new")}
              </Button>
            ) : undefined
          }
        />
      }
    >
      <ul class="flex flex-col gap-3">
        {types.map((type) => {
          const moduleTags =
            type.type_modules.length === 0
              ? [t("types.module.allModules")]
              : type.type_modules.map((m) =>
                  t(`types.module.${m}` as "types.module.tasks"),
                );
          return (
            <li
              key={type.type_id}
              data-component="type-row"
              class="flex items-stretch gap-3 rounded-md border border-border bg-surface transition-colors hover:bg-background"
            >
              <div class="flex min-w-0 flex-1 flex-col justify-center gap-2 px-4 py-3">
                <span class="truncate text-sm font-medium text-text-primary">
                  {type.type_name}
                </span>
                <div class="flex flex-wrap items-center gap-1.5">
                  {moduleTags.map((tag, idx) => (
                    <span
                      key={`${type.type_id}-tag-${idx}`}
                      class="inline-flex items-center rounded-full bg-background px-2 py-0.5 text-xs font-medium text-text-secondary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div class="flex shrink-0 items-center gap-1 px-2">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    setActionError(null);
                    setEditId(type.type_id);
                  }}
                  aria-label={t("types.actions.edit")}
                  class="px-3 py-1 text-sm"
                >
                  {t("types.actions.edit")}
                </Button>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    setActionError(null);
                    setDeleteTypeId(type.type_id);
                  }}
                  aria-label={t("types.actions.delete")}
                  class="px-3 py-1 text-sm text-error hover:bg-error/10"
                >
                  {t("types.actions.delete")}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </DataList>

    {/* Drawer: create */}
    {isNewOpen ? (
      <TypeForm
        mode="create"
        onSubmit={handleCreate}
        onClose={() => setIsNewOpen(false)}
      />
    ) : null}

    {/* Drawer: edit (sólo si el type está en la lista cacheada) */}
    {editId !== "" && editingType !== null ? (
      <TypeForm
        mode="edit"
        editingId={editingType.type_id}
        initial={{
          name: editingType.type_name,
          modules: editingType.type_modules,
        }}
        onSubmit={handleUpdate}
        onClose={() => setEditId("")}
      />
    ) : null}

    {/* Modal de confirmación de delete */}
    {deleteTypeId !== null ? (
      <div
        data-component="delete-confirm-modal"
        class="fixed inset-0 z-50 flex items-center justify-center"
      >
        <button
          type="button"
          aria-label={t("types.confirm.delete.cancel")}
          class="absolute inset-0 bg-black/40"
          onClick={() => {
            if (deleting) return;
            setDeleteTypeId(null);
          }}
        />
        <div class="relative z-10 mx-4 w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-2xl">
          <h3 class="text-base font-semibold text-text-primary">
            {t("types.confirm.delete.title")}
          </h3>
          <p class="mt-2 text-sm text-text-secondary">
            {t("types.confirm.delete.body")}
          </p>
          <div class="mt-6 flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              type="button"
              disabled={deleting}
              onClick={() => setDeleteTypeId(null)}
            >
              {t("types.confirm.delete.cancel")}
            </Button>
            <Button
              variant="primary"
              type="button"
              disabled={deleting}
              onClick={() => {
                void handleDelete();
              }}
              class="bg-error text-white hover:bg-error/90"
            >
              {deleting
                ? t("types.actions.deleting")
                : t("types.confirm.delete.confirm")}
            </Button>
          </div>
        </div>
      </div>
    ) : null}
  </div>
}
