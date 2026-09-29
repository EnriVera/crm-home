# types-tab-fixes

> Fixes 6 issues reportados en el tab `tipos` de `/config` + introduce `usePersistedQueryState` (URL + localStorage) como hook reusable para toda la app.

## Goal

Resolver los 6 issues reportados:

1. **Delete confirmation modal** — el botón delete dispara el soft-delete directo, sin confirmación. Falla de UX/seguridad.
2. **Multi-módulo** — un type puede pertenecer a N módulos. Si la lista está vacía, aplica a todos (`null` = "all modules"). Hoy es 1-módulo-only.
3. **Filtro por módulo roto + no se muestra en la lista** — el `select` de filtro no se ve reflejado en la query, y el módulo no aparece como tag en cada row.
4. **Filtros en URL + localStorage** — `search` y `module` deben sobrevivir reload. URL es source of truth, localStorage es caché per-BaseView. Pattern reusable.
5. **Create/edit en URL** — `?tab=types&new` y `?tab=types&edit=<id>` para deep-link del drawer.
6. **i18n fallback roto** — cuando `type.type_module` no matchea el set cerrado (ej. `Tasks` con mayúscula), se ve la key literal `types.module.Tasks` en la lista.

## Compatibility / breaking changes

- **DB schema change**: `types.type_module TEXT NOT NULL` → `types.type_modules TEXT[] NOT NULL DEFAULT '{}'`. Migration 007 (data-only + backfill `[type_module]` para rows existentes).
- **Contract breaking**: `type_module: TypeModule` → `type_modules: TypeModule[]` en el output schema. RPC clients existentes rompen — al ser un solo cliente (typesRpcClient) no hay external users, pero el impacto es local.
- **Frontend storage pattern**: nuevo hook `apps/web/src/hooks/use-persisted-query-state.ts` exporta `usePersistedQueryState({ key, parser, default })` que wrappea `useQueryState` + sync a `localStorage`. Reusable para cualquier filtro futuro.

## Phases

### Phase 1 — Hook `usePersistedQueryState`

- `apps/web/src/hooks/use-persisted-query-state.ts`:
  - Input: `{ key: string, parser: Parser<T>, defaultValue: T, storageKey?: string }`.
  - Wraps `useQueryState(key, parser.withDefault(defaultValue))` from `@octanejs/nuqs`.
  - On mount: if URL has no value for the key AND localStorage has a value, calls `setX(localStorageValue)` to populate URL.
  - On every value change: writes the value to `localStorage.setItem(\`crm-\${storageKey ?? key}\`, JSON.stringify(value))`.
  - SSR-safe: guards `typeof window === "undefined"`.
- `apps/web/src/hooks/use-persisted-query-state.test.ts`: bun:test que cubre (a) read from URL, (b) write to localStorage on change, (c) hydrate from localStorage on mount, (d) SSR no-op.

### Phase 2 — Migration 007: multi-module

- `apps/api/src/infrastructure/kysely/migrations/007_types_multi_module.ts`:
  - `ALTER TABLE types ADD COLUMN type_modules TEXT[] NOT NULL DEFAULT '{}';`
  - `UPDATE types SET type_modules = ARRAY[LOWER(type_module)];` (backfill)
  - `ALTER TABLE types DROP COLUMN type_module;`
  - `down`: revert.
- Update `apps/api/src/infrastructure/kysely/database.ts`:
  - `types` table: remove `type_module: string`, add `type_modules: string[]` (Postgres `TEXT[]` maps to TS `string[]` in kysely).
  - `KyselyTypeRepository` query column names: `type_module` → `type_modules`.

### Phase 3 — Backend domain + use cases

- `apps/api/src/domain/ports/type-repository.ts`:
  - Remove `TypeModule` exported type (replaced by `TypeModuleName` + `TypeModules: TypeModuleName[]`).
  - `TypeRow.modules: TypeModuleName[]` (replaces `module: TypeModule`).
  - `TypeRepository.list({ module: TypeModuleName | null })`: filter via array-contains (`type_modules @> ARRAY[module]`). When `module === null`, return rows where `type_modules = '{}'` (the "all modules" types).
  - `TypeRepository.insert/update({ modules: TypeModuleName[] })`.
- `apps/api/src/application/types/{list,create,update}-type.ts`:
  - Validation: `modules` is an array; each element must be in `TYPE_MODULES`; empty array is allowed (= "all").
  - `CreateType` and `UpdateType` normalize to sorted unique array.
- `apps/api/src/application/types/errors.ts`: no change (errors are still `InvalidTypeInput` + `TypeNotFound`).
- Update `apps/api/src/application/types/*.test.ts` to test multi-module behavior (15+ tests):
  - List with `module: "tasks"` returns types where `tasks` is in `type_modules` array.
  - List with `module: null` returns types where `type_modules` is empty.
  - Create with empty `modules` array persists as `[]`.
  - Update can add/remove modules from the array.

### Phase 4 — Contract + RPC

- `packages/types/src/contracts/types.ts`:
  - `TYPE_MODULES` tuple + `typeModuleSchema` (unchanged).
  - `typeSchema` output: `type_modules: z.array(typeModuleSchema)`. Remove `type_module`.
  - `listTypesInputSchema.module: typeModuleSchema.nullable().default(null)`.
  - `createTypeInputSchema.type_modules: z.array(typeModuleSchema).default([])`.
  - `updateTypeInputSchema.type_modules: z.array(typeModuleSchema).optional()`.
- Re-export from `packages/types/src/index.ts` (no change, just upsert).
- `apps/web/src/lib/api/rpc.ts`: no change (uses generic typesContract client).

### Phase 5 — Frontend types-tab

- `apps/web/src/components/pages/types-tab.tsrx`:
  - URL state via `useQueryStates` from `@octanejs/nuqs`:
    - `tab` (already migrated) — moved to page-level (config-page).
    - `search: parseAsString.withDefault("")` — persisted.
    - `module: parseAsStringLiteral(["tasks", "incomes", "expenses", "schedules"] as const).nullable().withDefault(null)` — persisted.
    - `new: parseAsBoolean.withDefault(false)` — NOT persisted (transient drawer open state).
    - `edit: parseAsString.withDefault("")` — NOT persisted (transient edit id).
  - Wraps `search` + `module` with `usePersistedQueryState` (Phase 1 hook) for localStorage mirror.
  - List rendering: each type's `type_modules` array renders as one `<Tag>` per module, OR a single tag "Todos" if empty.
  - Filter by module: actually triggers the query (Issue 3).
  - Delete: shows a confirmation modal (Issue 1). New component or inline `deleteTypeId !== null` state + backdrop.
  - Drawer mount:
    - `new === true` → mount `<TypeForm mode="create">`.
    - `edit === "<uuid>"` → fetch the type (via `findById` if needed) and mount `<TypeForm mode="edit">`.
    - Otherwise no drawer.
  - "Nuevo tipo" button: `setNew(true)` (no longer local `createOpen`).
  - Edit button: `setEdit(type.type_id)`.
  - Drawer close: `setNew(false)` or `setEdit("")`.
  - i18n fallback: if `type.type_modules` has values not in the closed set, display them as raw lowercase (Issue 6).

### Phase 6 — Frontend type-form

- `apps/web/src/components/organisms/type-form/type-form.tsrx`:
  - Modules field: replace `<select>` with a set of `<label><input type="checkbox">` per module.
  - Empty selection = "all modules" semantics.
  - On submit: send `type_modules: TypeModule[]` (empty array if none selected).
- `apps/web/src/components/organisms/type-form/type-form.logic.ts`:
  - `TypeFormState.modules: TypeModuleName[]`.
  - `TYPE_FORM_MODULES` unchanged.
  - Validation: each module must be in the closed set; empty array allowed.
  - `typeFormToApiPayload`: `{ type_name, type_modules }` (was `type_module`).

### Phase 7 — i18n

- `apps/web/src/lib/i18n/locales/es.json`:
  - `types.module.allModules` → "Todos" (for the empty-array case in the list).
  - Existing `types.module.{tasks,incomes,expenses,schedules}` unchanged.
  - `types.confirm.delete.title` → "¿Eliminar este tipo?"
  - `types.confirm.delete.body` → "Esta acción no se puede deshacer."
  - `types.confirm.delete.confirm` → "Eliminar"
  - `types.confirm.delete.cancel` → "Cancelar"
- `t()` fallback helper: if `getI18n().exists(key)` returns false, return the raw value. The display code in TypesTab does:

  ```
  type.type_modules.length === 0
    ? t("types.module.allModules")
    : type.type_modules.map((m) => t(`types.module.${m}`, { defaultValue: m }))
  ```

  Use i18next's `defaultValue` option (it exists in v22+).

## Open question (a resolver antes de Phase 3)

¿La migration a TEXT[] rompe algún seed o fixture? Revisé:

- `001_initial.ts`: tabla `types` existe sin seed de rows (cada user crea los suyos).
- `apps/api/src/application/tasks/list-types-for-form.ts` lee types por módulo — necesita actualización al nuevo contrato.

Voy a actualizar `list-types-for-form` como parte de Phase 4 (no es trabajo aparte, sale con el cambio de port).

## Acceptance

- [ ] `usePersistedQueryState` hook + test verde
- [ ] Migration 007 aplica sin errores sobre dev DB con types existentes
- [ ] Backend tests verdes (15+ con multi-module)
- [ ] Contract actualizado + frontend compila
- [ ] `?tab=types&new` abre create drawer; back cierra
- [ ] `?tab=types&edit=<uuid>` abre edit drawer con type cargado
- [ ] Reload con `?tab=types&search=foo&module=tasks` preserva filtros
- [ ] Filtros persisten en `localStorage[\`crm-config-types-tab\`]`
- [ ] Delete button muestra modal de confirmación
- [ ] Module display: array vacío → "Todos" tag; N módulos → N tags
- [ ] Filtro por módulo funciona (kysely array-contains)
- [ ] Valores de módulo no normalizados (ej. `Tasks`) muestran fallback graceful
- [ ] E2E con agent-browser verde (defer si OTP rate-limited)

## Relevant Files

- `apps/api/src/infrastructure/kysely/migrations/007_types_multi_module.ts` — nueva
- `apps/api/src/infrastructure/kysely/database.ts` — `types` schema update
- `apps/api/src/infrastructure/kysely/type-repository.ts` — column rename + array-contains query
- `apps/api/src/domain/ports/type-repository.ts` — `TypeRow.modules: TypeModuleName[]`
- `apps/api/src/application/types/{list,create,update}-type.ts` + `errors.ts` — array validation
- `apps/api/src/application/types/*.test.ts` — multi-module tests
- `apps/api/src/application/tasks/list-types-for-form.ts` — consumer update
- `packages/types/src/contracts/types.ts` — `type_modules: z.array(typeModuleSchema)`
- `apps/web/src/hooks/use-persisted-query-state.ts` — nuevo hook
- `apps/web/src/hooks/use-persisted-query-state.test.ts` — bun:test
- `apps/web/src/components/pages/types-tab.tsrx` — URL state + delete modal + multi-module display
- `apps/web/src/components/organisms/type-form/type-form.tsrx` — multi-select
- `apps/web/src/components/organisms/type-form/type-form.logic.ts` — array state + validation
- `apps/web/src/lib/i18n/locales/es.json` — new keys
