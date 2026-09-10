# Componente `BaseView`

## Contrato

`BaseView` es un componente compartido del meta-framework Octane que encapsula
la lógica de **3 vistas** (list, grid, kanban) detrás de un switcher interno,
con **filtros activos persistidos en `localStorage`**.

```
┌──────────────────────────────────────────────────────────────┐
│  BaseView                                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                          │
│  │  list   │ │  grid   │ │ kanban  │  ← ViewSwitcher (interno)  │
│  └─────────┘ └─────────┘ └─────────┘                          │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  SearchInput (W11) + render de la vista activa     │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

## Firma

```ts
interface BaseViewProps<F extends BaseViewFilters> {
  id?: string;                  // opcional, default "default"
  moduleId?: string;            // namespace del localStorage
  filters?: F;                  // estado inicial (override del localStorage)
  records: unknown[];
  views?: ViewKind[];           // default ["list", "grid", "kanban"]
  onFilterChange?: (filters: F) => void;
  listStructure: { row: (record: unknown) => unknown };
  gridStructure: { columns?: number; card: (record: unknown) => unknown };
  kanbanStructure: { board: (input: { records: unknown[]; onMove: unknown }) => unknown };
}
```

## Regla §D2: NO fork por módulo

Cualquier filtro nuevo se agrega al shape genérico `F extends BaseViewFilters`:

```ts
type TaskFilters = BaseViewFilters & { status?: TaskStateId };
const [filters, setFilters] = useState<TaskFilters>(...);
<BaseView<TaskFilters> ... />
```

NO crear `BaseViewTask`, `BaseViewClient`, etc. La composición se hace en el
call site vía `<BaseView<TaskFilters> ... />`.

## Persistencia localStorage

Namespace: `base-view:<moduleId>:<id|default>`. Ejemplo:
`base-view:tasks:tasks-list`. NO colisiona con `crm-sidebar-layout` (otro
namespace del meta-framework Octane).

El componente:

1. En mount: lee `localStorage["base-view:tasks:tasks-list"]` y lo parsea a `F`.
   Si el JSON es inválido o no existe, usa `{}` (estado vacío).
2. En cada cambio de filtros: serializa `F` a JSON y lo escribe.

## SSR-safe

Los `.tsrx` no resuelven en `bun:test` directo (requieren plugin de Octane).
Los helpers puros (`buildBaseViewStorageKey`, `serializeFilters`,
`parsePersistedFilters`) están aislados en `base-view.helpers.ts` y se testean
directamente. Los tests E2E (render real) se cubren con el pipeline de Octane.

## Ejemplo de uso

```tsx
import { BaseView, type TaskFilters } from "@/components/base-view";
import { ListTaskRow, GridTaskCard, TaskKanbanBoard } from "@/components/tasks";

function TasksPage() @{
  const [filters, setFilters] = useState<TaskFilters>({});
  const tasks = useTasks(filters);

  <BaseView<TaskFilters>
    id="tasks-list"
    moduleId="tasks"
    filters={filters}
    records={tasks}
    views={["list", "grid", "kanban"]}
    onFilterChange={setFilters}
    listStructure={{ row: (r) => <ListTaskRow task={r} /> }}
    gridStructure={{ columns: 3, card: (r) => <GridTaskCard task={r} /> }}
    kanbanStructure={{
      board: ({ records, onMove }) => (
        <TaskKanbanBoard tasks={records} onMove={onMove} />
      ),
    }}
  />
}
```
