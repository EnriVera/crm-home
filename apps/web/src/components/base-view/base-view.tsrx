import { useEffect, useState } from "octane";
import { t } from "../vendor/i18n/core";
import {
  buildBaseViewStorageKey,
  parsePersistedFilters,
  serializeFilters,
} from "./base-view.helpers";

/**
 * Componente compartido `BaseView` (PRD §D2 / design §D2).
 *
 * Encapsula 3 vistas (list, grid, kanban) detrás de un switcher interno
 * (estado local), con filtros activos persistidos en localStorage bajo
 * `base-view:<moduleId>:<viewId|default>`.
 *
 * El padre NO controla el view switch (es estado interno del componente).
 * Las 3 vistas concretas se renderizan vía `listStructure.row`,
 * `gridStructure.card` o `kanbanStructure.board` que el padre provee.
 *
 * Extensión por módulo: cualquier filtro nuevo se agrega al shape `F extends
 * BaseViewFilters` del genérico — NO forkear el componente por módulo.
 */

// Tipos públicos.

export type ViewKind = "list" | "grid" | "kanban";

export interface BaseViewFilters {
  search?: string;
}

export interface BaseViewProps<F extends BaseViewFilters> {
  /** Identificador opcional del view (e.g. "tasks-list"). Si no se da, usa "default". */
  id?: string;
  /** Módulo al que pertenece el view (e.g. "tasks"). Usado para namespace localStorage. */
  moduleId?: string;
  /** Estado actual de filtros. El componente hidrata desde localStorage en mount. */
  filters?: F;
  /** Records a renderizar (la vista seleccionada decide cómo). */
  records: unknown[];
  /** Vistas disponibles en el switcher. Default: todas (list, grid, kanban). */
  views?: ViewKind[];
  /** Callback cuando el usuario cambia los filtros. */
  onFilterChange?: (filters: F) => void;
  /** Estructura list: cómo renderizar cada row. */
  listStructure: { row: (record: unknown) => unknown };
  /** Estructura grid: cuántas columnas y cómo renderizar cada card. */
  gridStructure: {
    columns?: number;
    card: (record: unknown) => unknown;
  };
  /** Estructura kanban: cómo renderizar el board (delega al organism task-kanban-board). */
  kanbanStructure: {
    board: (input: { records: unknown[]; onMove: unknown }) => unknown;
  };
}

export function BaseView<F extends BaseViewFilters>(props: BaseViewProps<F>) @{
  const availableViews: ViewKind[] = props.views ?? ["list", "grid", "kanban"];
  const moduleId = props.moduleId ?? "default";

  // Estado interno del switcher (no controlado por el padre).
  const [view, setView] = useState<ViewKind>(availableViews[0]!);

  // Estado interno de filtros. Hidrata desde localStorage en mount.
  const [filters, setFilters] = useState<F>(() => {
    if (typeof localStorage === "undefined") return (props.filters ?? {}) as F;
    const raw = localStorage.getItem(
      buildBaseViewStorageKey(props.id, moduleId),
    );
    return parsePersistedFilters<F>(raw);
  });

  // Persiste cambios de filtros a localStorage.
  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(
      buildBaseViewStorageKey(props.id, moduleId),
      serializeFilters(filters),
    );
  }, [filters, props.id, moduleId]);

  // Wrapper para que el callback externo reciba cambios del usuario.
  const handleFilterChange = (next: F) => {
    setFilters(next);
    props.onFilterChange?.(next);
  };

  // Selección de vista según el switcher.
  const renderView = () => {
    if (view === "list") {
      return props.listStructure.row;
    }
    if (view === "grid") {
      return props.gridStructure.card;
    }
    return props.kanbanStructure.board;
  };

  <div data-base-view={props.id ?? "default"}>
    {/* Switcher interno — el padre no lo controla. Se oculta cuando solo
        hay una vista disponible (no tiene sentido mostrar un toggle). */}
    {availableViews.length > 1 && (
      <nav
        data-view-switcher
        class="mb-4 inline-flex items-center gap-1 rounded-md border border-border bg-surface p-1"
      >
        {availableViews.map((v) => (
          <button
            key={v}
            type="button"
            data-active={v === view}
            onClick={() => setView(v)}
            class={`rounded-sm px-3 py-1 text-sm transition-colors ${
              v === view
                ? "bg-background font-medium text-text-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {t(`tasks.views.${v}`)}
          </button>
        ))}
      </nav>
    )}

    {/* Render de la vista seleccionada. Cada vista decide su layout
        via clases Tailwind en este section — la lógica de cada item
        vive en `listStructure.row` / `gridStructure.card` /
        `kanbanStructure.board` que el padre provee. */}
    <section
      data-view={view}
      class={`${view === "grid" ? "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" : ""}`}
    >
      {view === "list" &&
        props.records.map((record, i) => (
          <div key={i}>{props.listStructure.row(record)}</div>
        ))}
      {view === "grid" &&
        props.records.map((record, i) => (
          <div key={i}>{props.gridStructure.card(record)}</div>
        ))}
      {view === "kanban" &&
        props.kanbanStructure.board({
          records: props.records,
          onMove: () => {},
        })}
    </section>
  </div>
}
