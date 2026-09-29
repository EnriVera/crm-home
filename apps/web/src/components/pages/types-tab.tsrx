import { useEffect, useMemo, useRef, useState } from "octane";
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
  parseAsArrayOf,
  parseAsStringLiteral,
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
 *   - list (search + multi-module filter)
 *   - create (drawer via `?tab=types&new`)
 *   - edit   (drawer via `?tab=types&edit=<id>`)
 *   - remove (modal de confirmación local, no en URL)
 *
 * Estado en URL (via @octanejs/nuqs):
 *   - `search`  → useQueryState + useEffect para localStorage sync
 *   - `modules` → useQueryState (array via parseAsArrayOf) + localStorage
 *   - `new`     → useQueryState transient
 *   - `edit`    → useQueryState transient
 *
 * Filtros en localStorage (`crm-config-types-tab`):
 *   - `{ search: string, modules: TypeModuleName[] }` como JSON.
 *   - Hidratación one-shot en mount (si URL vacía, leer de storage).
 *   - Sync en cada cambio.
 *
 * Multi-select de módulos:
 *   - Botón "Módulos (N)" abre un dropdown con 4 checkboxes.
 *   - N seleccionados → filtra con OR (cualquier módulo del type).
 *   - 0 seleccionados → sin filtro (muestra todos).
 *   - X al lado del botón limpia la selección.
 *   - Sin opción "Todos los módulos" en el dropdown (vacío = sin filtro).
 */

const RPC = createRpcClient(import.meta.env.VITE_API_URL ?? "/rpc");

const STORAGE_KEY = "crm-config-types-tab";
const modulesFilterParser = parseAsArrayOf(
  parseAsStringLiteral(TYPE_MODULE_NAMES as unknown as readonly TypeModuleName[]),
).withDefault([] as TypeModuleName[]);

interface StoredFilters {
  search: string;
  modules: TypeModuleName[];
}

const MODULE_LABEL_KEYS: Record<TypeModuleName, string> = {
  tasks: "types.module.tasks",
  incomes: "types.module.incomes",
  expenses: "types.module.expenses",
  schedules: "types.module.schedules",
};

export function TypesTab() @{
  // ─── URL state: filtros (persistidos en URL + localStorage) ──────
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault(""),
  );
  const [modules, setModules] = useQueryState("module", modulesFilterParser);

  // ─── URL state: drawer create/edit (transient) ──────────────────
  const [isNewOpen, setIsNewOpen] = useQueryState(
    "new",
    parseAsBoolean.withDefault(false),
  );
  const [editId, setEditId] = useQueryState("edit", parseAsString.withDefault(""));

  // ─── Local state: confirmación de delete + multi-select dropdown ─
  const [deleteTypeId, setDeleteTypeId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isModuleMenuOpen, setIsModuleMenuOpen] = useState(false);
  const moduleMenuRef = useRef<HTMLDivElement | null>(null);

  // ─── Persistencia localStorage: hidratación one-shot + sync ────
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    if (typeof window === "undefined") return;
    if (search !== "" || modules.length > 0) return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === null) return;
      const parsed = JSON.parse(raw) as Partial<StoredFilters>;
      if (typeof parsed.search === "string" && parsed.search.length > 0) {
        setSearch(parsed.search);
      }
      if (
        Array.isArray(parsed.modules) &&
        parsed.modules.every((m) => TYPE_MODULE_NAMES.includes(m as TypeModuleName))
      ) {
        setModules(parsed.modules as TypeModuleName[]);
      }
    } catch {
      // localStorage deshabilitado o JSON inválido — caemos al default.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (hydratedRef.current === false) return;
    if (typeof window === "undefined") return;
    try {
      const data: StoredFilters = { search, modules };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Quota / private mode — la app sigue funcionando.
    }
  }, [search, modules]);

  // Click-outside para cerrar el dropdown de módulos.
  useEffect(() => {
    if (!isModuleMenuOpen) return;
    const handler = (event: MouseEvent): void => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (moduleMenuRef.current && !moduleMenuRef.current.contains(target)) {
        setIsModuleMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isModuleMenuOpen]);

  // ─── Query: list de types con filtros ────────────────────────────
  const typesQuery = useOctaneQuery<Type[]>(
    () =>
      (RPC as RpcClient).types.list({
        search,
        modules,
        limit: 100,
      }) as Promise<Type[]>,
    [search, modules],
  );
  const types = typesQuery.data ?? [];
  const loading = typesQuery.loading;
  const loadError = typesQuery.error;

  // El type que se está editando: primero busca en la lista (sin RPC).
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

  const toggleModule = (moduleValue: TypeModuleName): void => {
    const has = modules.includes(moduleValue);
    setModules(has ? modules.filter((m) => m !== moduleValue) : [...modules, moduleValue]);
  };

  const clearSearch = (): void => {
    setSearch("");
  };

  const clearModules = (): void => {
    setModules([]);
  };

  const moduleButtonLabel =
    modules.length === 0
      ? t("types.filters.modules")
      : `${t("types.filters.modules")} (${modules.length})`;

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

    {/* ─── Filtros: search + multi-select módulos + X ──────────── */}
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]">
      {/* Search con X para limpiar */}
      <div class="relative">
        <input
          type="search"
          value={search}
          onInput={(e: Event) => {
            const target = e.currentTarget as HTMLInputElement;
            setSearch(target.value);
          }}
          placeholder={t("types.search.placeholder")}
          aria-label={t("types.search.label")}
          class="w-full rounded-md border border-border bg-background px-3 py-2 pr-9 text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        />
        {search !== "" && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label={t("types.search.clear")}
            data-action="clear-search"
            class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-text-secondary hover:bg-surface hover:text-text-primary"
          >
            <span aria-hidden="true" class="block text-base leading-none">×</span>
          </button>
        )}
      </div>

      {/* Multi-select de módulos */}
      <div ref={moduleMenuRef} class="relative">
        <button
          type="button"
          onClick={() => setIsModuleMenuOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={isModuleMenuOpen}
          data-action="toggle-module-menu"
          class="flex w-full min-w-[180px] items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <span class="truncate">{moduleButtonLabel}</span>
          <span aria-hidden="true" class="text-xs">
            ▾
          </span>
        </button>
        {isModuleMenuOpen && (
          <div
            role="listbox"
            aria-multiselectable="true"
            class="absolute right-0 z-20 mt-1 w-56 rounded-md border border-border bg-surface py-1 shadow-lg"
          >
            {TYPE_MODULE_NAMES.map((moduleValue) => {
              const checked = modules.includes(moduleValue);
              return (
                <label
                  key={moduleValue}
                  class="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-background"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      toggleModule(moduleValue);
                    }}
                    class="h-4 w-4 rounded border-border text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  />
                  <span>{t(MODULE_LABEL_KEYS[moduleValue])}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* X grande para limpiar todos los filtros */}
      {(search !== "" || modules.length > 0) && (
        <button
          type="button"
          onClick={() => {
            clearSearch();
            clearModules();
          }}
          aria-label={t("types.filters.clearAll")}
          data-action="clear-all-filters"
          class="flex items-center gap-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-text-secondary hover:bg-surface hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <span aria-hidden="true">×</span>
          <span>{t("types.filters.clear")}</span>
        </button>
      )}
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
            search !== "" || modules.length > 0
              ? t("types.listEmpty.noResults")
              : t("types.listEmpty.noTypes")
          }
          description={
            search !== "" || modules.length > 0
              ? t("types.listEmpty.noResultsBody")
              : t("types.listEmpty.noTypesBody")
          }
          action={
            search === "" && modules.length === 0 ? (
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
