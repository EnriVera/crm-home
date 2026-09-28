# config-tabs-nuqs

> Adopción de `@octanejs/nuqs` para estado en URL + implementación del tab `tipos` (CRUD completo) en `/config`.

## Goal

Reemplazar el `useState` local del tab activo en `/config` por URL search-params
vía `@octanejs/nuqs` (binding de Octane para nuqs 2.9.1). El tab pasa a ser:

- Deep-linkeable: `/config?tab=types` carga directamente el tab tipos.
- Compartible: copy/paste de la URL preserva la vista.
- Navegable: back/forward del browser respeta la posición.

Como consecuencia, normalizamos el patrón de URL state en todo el frontend
(migramos también `task-detail-page` que hoy usa `URLSearchParams` manual) y
avanzamos el tab `tipos` a un CRUD completo (Phase 2 del feature
`config-tabs-crud` previo, que dejó 4 placeholders "Próximamente").

## Stack alignment

| Antes | Después |
| --- | --- |
| `nuqs (estado en URL vía URLSearchParams del router propio)` en `no_aplican` | `@octanejs/nuqs@0.1.45` en `adoptados` |
| `apps/web` sin `nuqs` | `apps/web` con `@octanejs/nuqs@0.1.45` |
| Sin skill `nuqs` | Skill nueva en `.pi/skills/nuqs/SKILL.md` |
| `docs/PRD-v2.md` §7 "nuqs NO aplica" | Sección actualizada: aplica vía binding de Octane |

El cambio deshace la decisión `D-SA0` de `stack-alignment` (2026-09-08),
documentada en `openspec/changes/archive/2026-09-08-stack-alignment/`. En ese
momento el binding no existía (o no estaba publicado); el PR upstream #200 ya
publicó `@octanejs/nuqs@0.1.45` con full vendored port. La decisión queda
obsoleta; este change la reemplaza y actualiza los docs canónicos.

## Compatibility note

`@octanejs/nuqs@0.1.45` declara `peerDependencies: octane ^0.6.0`. El
proyecto usa `octane@0.5.0`. El delta es compatible porque el binding solo
consume el runtime ABI de hooks (`useState`, `useEffect`, `useSyncExternalStore`),
estable desde 0.5. Si bun rechaza la peer dep, usar `--ignore-peer`. Verificar
con `bunx tsc --noEmit` después de instalar.

## Phases

### Phase 1 — Skill

- Crear `.pi/skills/nuqs/SKILL.md` documentando el binding de Octane.
- Commit: `feat(pi): add nuqs skill documenting @octanejs/nuqs binding`.

### Phase 2 — Docs de stack

- `openspec/config.yaml`: mover `nuqs (…router propio)` de `no_aplican` a
  `adoptados` como `"@octanejs/nuqs@0.1.45 (URL state via search-params)"`.
- `docs/PRD-v2.md` §7 (línea ~115): actualizar la nota sobre nuqs.
- `docs/PRD-v2.md` §10: marcar el binding como adoptado.
- Commit: `docs(stack): adopt @octanejs/nuqs binding — move from no_aplican to adoptados`.

### Phase 3 — Install

- `bun add @octanejs/nuqs@0.1.45 --cwd apps/web`.
- Si bun rechaza la peer dep: `bun add @octanejs/nuqs@0.1.45 --cwd apps/web --ignore-peer`.
- Verificar `bun run typecheck` desde `apps/web`.
- Commit: `feat(web): install @octanejs/nuqs@0.1.45`.

### Phase 4 — Adapter

- Importar `NuqsAdapter` desde `@octanejs/nuqs/adapters/react`.
- Envolver el shell en `src/routes/__app-shell.tsrx`.
- Smoke: `bun run dev` + `/config` carga sin errores en consola.
- Commit: `feat(web): wrap app shell in NuqsAdapter`.

### Phase 5 — Migrar tabs de /config

- `src/components/pages/config-page.tsrx`:
  - Eliminar `useState<ConfigTabId>("user")`.
  - Reemplazar por
    `const [activeTab, setActiveTab] = useQueryState("tab", parseAsStringLiteral(TAB_IDS).withDefault("user"))`.
  - El callback `onChange` del Tabs molecule pasa a llamar `setActiveTab(id)`.
- `src/components/molecules/tabs.tsrx`: si la signature cambia, ajustar.
- E2E (agent-browser): cargar `/config?tab=types` y verificar que abre el tab
  correcto; click en cada tab y verificar que la URL refleja el cambio; back/forward.
- Commit: `refactor(web): migrate /config tabs to useQueryState`.

### Phase 6 — Migrar task-detail (consistencia)

- `src/components/pages/task-detail-page/task-detail-page.logic.ts`:
  - Reemplazar `isEditModeFromSearchParams(searchParams)` por
    `useQueryState("edit", parseAsBoolean.withDefault(false))`.
  - `editUrl(taskId)` se mantiene como helper puro.
- E2E (agent-browser): `/tasks/<id>?edit=true` abre el form; cerrar con back navega.
- Commit: `refactor(web): migrate task-detail edit drawer to useQueryState`.

### Phase 7 — Tipos CRUD (Phase 2 del feature anterior)

> Alcance a confirmar con el user antes de empezar. Ver pregunta abajo.

Mínimo esperado (alineado con `clients-page` / `incomes-page`):

- Backend: ya existe tabla `types` (migration 001) y `TypeCategoriesClient` para
  join client+global. Crear `TypeRepository` port + impl Kysely + use cases
  (`ListTypes`, `CreateType`, `UpdateType`, `DeleteType`) + handlers + router
  - composition.
- `typesContract` en `packages/types/src/contracts/types.ts` con Zod schemas
  para create/update/list outputs.
- Frontend: `typesRpcClient` en `lib/api/rpc.ts`, types-tab.tsrx con
  `BaseView` (vista grilla por defecto, lista opcional), `TypeDrawer` con
  formulario, integración con Tabs molecule (ya cubierto por Phase 5).
- i18n: agregar `types.*` keys (es.json).
- Tests: use cases con happy path + invalid input + not found.
- E2E: crear/editar/borrar/filtrar un type; verificar deep-link `/config?tab=types`
  abre directo al tab y al estado vacío si no hay types.

Commits estimados: 8-12 (siguiendo work-unit-commits: 1 commit por unidad
revisable: port, impl, contract, use-case, handler, composition, tab UI,
drawer form, i18n, tests).

## Open question (a resolver antes de Phase 7)

¿El tab `tipos` debe soportar CRUD completo en este change, o sólo el
esqueleto (read-only como apps/monedas) para destrabar el flujo de tabs y
dejar el CRUD para un change aparte?

- **Opción A — CRUD completo**: como describe Phase 7 arriba. ~10-12 commits,
  alinea con PRD-v2.md §8.7.
- **Opción B — sólo read-only**: replicar el patrón apps/currencies del
  feature anterior. 1-2 commits. Defer el CRUD a un change
  `config-types-crud` futuro.

## Acceptance

- [ ] Skill `nuqs` existe en `.pi/skills/nuqs/SKILL.md` con frontmatter válido.
- [ ] `openspec/config.yaml` y `docs/PRD-v2.md` reflejan la nueva decisión.
- [ ] `@octanejs/nuqs` instalado en `apps/web`, typecheck verde.
- [ ] `NuqsAdapter` envuelve el shell.
- [ ] `/config?tab=<id>` carga el tab correcto en hard reload.
- [ ] Click en tab cambia la URL via pushState.
- [ ] Back/forward del browser navega entre tabs.
- [ ] `task-detail?edit=true` y `/config?tab=types` siguen funcionando tras la
      migración (sin regresiones E2E).
- [ ] Si Phase 7 corre: tipos CRUD completo con tests + E2E verde.
- [ ] Memorias engram actualizadas con la nueva decisión y aprendizajes.

## Relevant Files (post-Phase 5)

- `odd/config-tabs-nuqs/tasks.md` — este doc
- `.pi/skills/nuqs/SKILL.md` — skill nueva
- `openspec/config.yaml` — stack alignment
- `docs/PRD-v2.md` §7 / §10 — PRD alignment
- `apps/web/package.json` — `@octanejs/nuqs@0.1.45`
- `apps/web/src/routes/__app-shell.tsrx` — NuqsAdapter wrapper
- `apps/web/src/components/pages/config-page.tsrx` — useQueryState
- `apps/web/src/components/pages/task-detail-page/task-detail-page.logic.ts` — useQueryState
- (Phase 7) `apps/api/src/domain/ports/type-repository.ts` + impl + use cases + handlers
- (Phase 7) `packages/types/src/contracts/types.ts`
- (Phase 7) `apps/web/src/components/pages/types-tab.tsrx`
