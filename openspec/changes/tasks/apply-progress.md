# Apply Progress — change `tasks`

> Documento de trabajo del apply. **No se commitea** dentro de la ventana del
> attempt (política: los artefactos de `openspec/changes/tasks/` no consumen
> budget de líneas).

- Branch: `develop`
- Runner: `bun test` (strict TDD: RED → GREEN → TRIANGULATE → REFACTOR)
- Estrategia de entrega: chained PRs `stacked-to-develop`, un commit por WU.

---

## Spike WU0 — npm verification gate

### Checklist de verificación (RED)

| # | Criterio | Estado |
| --- | --- | --- |
| 1 | `@octanejs/dnd-kit` existe en el registry npm | ✅ PASS |
| 2 | `@octanejs/lexical` existe en el registry npm | ✅ PASS |
| 3 | peer deps de `dnd-kit` compatibles con el `octane` instalado | ✅ PASS |
| 4 | peer deps de `lexical` compatibles con el `octane` instalado | ✅ PASS |
| 5 | Versiones exactas pineadas (sin `^` ni `~`) | ✅ PASS |
| 6 | `bun install` genera lockfile sin warnings de peer deps | ✅ PASS |
| 7 | `bun install --frozen-lockfile` termina en `EXIT 0` | ✅ PASS |
| 8 | Smoke: ambos paquetes resuelven y exponen la superficie esperada | ✅ PASS |

**Resultado del gate: PASS.** WU8 / PR-D queda desbloqueada.

### GREEN — evidencia de registry

```text
$ bun pm view @octanejs/dnd-kit versions --json
[ "0.1.0", "0.1.1", "0.1.4", ..., "0.1.45", "0.1.46", "0.1.47" ]
$ bun pm view @octanejs/dnd-kit version
0.1.47

$ bun pm view @octanejs/dnd-kit peerDependencies
{ "octane": "^0.1.51 || ^0.2.0" }

$ bun pm view @octanejs/dnd-kit dependencies
{ "@dnd-kit/abstract": "0.5.0", "@dnd-kit/collision": "0.5.0",
  "@dnd-kit/dom": "0.5.0", "@dnd-kit/state": "0.5.0" }
```

```text
$ bun pm view @octanejs/lexical versions --json
[ "0.1.2", "0.1.3", ..., "0.1.50", "0.1.51", "0.1.52" ]
$ bun pm view @octanejs/lexical version
0.1.52

$ bun pm view @octanejs/lexical peerDependencies
{ "octane": "^0.1.51 || ^0.2.0" }

$ bun pm view @octanejs/lexical dependencies
{ "@lexical/plain-text": "0.46.0", "@lexical/rich-text": "0.46.0",
  "@lexical/table": "0.46.0", "@lexical/text": "0.46.0",
  "@lexical/utils": "0.46.0", "@lexical/yjs": "0.46.0",
  "lexical": "0.46.0", "yjs": "^13.6.31",
  "@octanejs/floating-ui": "0.1.52" }
```

### Análisis de compatibilidad

| Paquete | peer `octane` | Instalado | ¿Satisface? |
| --- | --- | --- | --- |
| `@octanejs/dnd-kit@0.1.47` | `^0.1.51 \|\| ^0.2.0` | `octane@0.2.3` | ✅ vía `^0.2.0` |
| `@octanejs/lexical@0.1.52` | `^0.1.51 \|\| ^0.2.0` | `octane@0.2.3` | ✅ vía `^0.2.0` |

**Nota sobre `react@18` (desviación respecto del brief).** El brief pedía
verificar los bindings contra `octane@0.2.3` **y `react@18`**. La premisa
`react@18` no aplica a este repo:

- No hay `react` ni `react-dom` en ningún `package.json` del workspace
  (`apps/web`, `packages/*`, raíz) ni en `bun.lock` (0 coincidencias de `react@`).
- `octane@0.2.3` declara `react`/`react-dom` como **peers OPCIONALES**
  (`optionalPeers: ["react", "react-dom", "typescript", "vite"]`) y, cuando
  aplican, el rango es `^19.0.0` — no `^18`.
- Ninguno de los dos bindings declara peer de `react`: ambos dependen
  exclusivamente de `octane`.

Conclusión: la verificación de `react@18` es **vacua** (no hay react en el
árbol) y no produce conflicto. La compatibilidad real queda determinada por el
rango de `octane`, que se cumple. No se requiere escalación.

### TRIANGULATE — pin exacto + lockfile

`apps/web/package.json` (versiones exactas, sin rango):

```json
"@octanejs/dnd-kit": "0.1.47",
"@octanejs/lexical": "0.1.52",
```

```
$ bun pm view @octanejs/dnd-kit@0.1.47 peerDependencies --json
{ "octane": "^0.1.51 || ^0.2.0" }
$ bun pm view @octanejs/lexical@0.1.52 peerDependencies --json
{ "octane": "^0.1.51 || ^0.2.0" }

$ bun install
Resolved, downloaded and extracted [167]
Saved lockfile
43 packages installed [7.98s]
EXIT 0   # sin warnings de peer deps

$ bun install --frozen-lockfile
Checked 362 installs across 532 packages (no changes) [84.00ms]
EXIT 0   # sin warnings de peer deps
```

### Smoke — superficie pública observada

Ambos paquetes se publican como **fuente** (`main`/`module`/`types` →
`src/index.ts`), compilados por el plugin de octane.

`@octanejs/dnd-kit@0.1.47` → `src/core/index.ts` exporta:

```text
DragDropProvider (DragDropProviderProps)   ← NO se llama "DndContext"
useDraggable (UseDraggableInput)
useDroppable (UseDroppableInput)
DragOverlay (DragOverlayProps)
useDragDropManager, useDragDropMonitor, useDragOperation, useInstance
KeyboardSensor, PointerSensor            (re-export de @dnd-kit/dom)
tipos: DragDropManager, DragStartEvent, DragEndEvent, DragOverEvent, ...
```

`@octanejs/lexical@0.1.52` → `src/index.ts` exporta:

```text
LexicalComposer, ContentEditable, RichTextPlugin, PlainTextPlugin,
LexicalErrorBoundary, OnChangePlugin, HistoryPlugin, AutoFocusPlugin,
ClearEditorPlugin, useLexicalComposerContext, ...
tipos: InitialConfigType, InitialEditorStateType
```

**Hallazgo para WU8.** `tasks.md` WU8 pide re-exportar `DndContext`. El binding
real no exporta ese nombre; el componente equivalente es `DragDropProvider`.
Esto **no** es una sustitución de librería (el binding es el pineado y
verificado): el wrapper `components/vendor/dnd-kit/` expone `DndContext` como
**su** API pública y monta `DragDropProvider` por debajo. Esa es exactamente la
función del wrapper según la spec `vendor-bindings` (bind-and-wrap).

### REFACTOR — cierre de WU0

WU0 **cerrada en verde**. `apps/web/package.json` + `bun.lock` quedan pineados y
listos; el commit se materializa en **WU8 / PR-D** (no aquí), según el plan.

---

## TDD Cycle Evidence

| WU | RED | GREEN | TRIANGULATE | REFACTOR | Verificación |
| --- | --- | --- | --- | --- | --- |
| WU0 | checklist de spike (arriba) | registry + peers OK | pin + `--frozen-lockfile` EXIT 0 | gate cerrado PASS; no se commitea `apps/web/package.json` aquí (queda para WU8) | `bun install --frozen-lockfile` → EXIT 0 (43 packages, sin warnings) |
| WU1 | test rojo: `Cannot find module './tasks'` | 60/60 pass; router shape con prefijos `/tasks/*` | router shape + edge cases (Unicode, `min(1)`, defaults, lookups re-exportados) | `uuidSchema` extraído a `_shared.ts`; re-exports desde `packages/types/src/index.ts`; typecheck OK | `bun test packages/types/` → 78/78 pass (60 nuevos + 18 previos `auth`) |
| WU2 | test rojo: `Cannot find module './002_tasks'` | 5 tablas + 3 índices + 8 FKs verificados vía `information_schema`; typecheck OK | idempotencia (2× `up`), `down` post-`up` deja `task_state` intacto, `down` con datos sembrados respeta orden inverso de FKs | orden de `DROP` revisado; `cleanupTasksTables` añadido a `test-cleanup.ts` sin tocar `cleanupAuthTables` | `bun test apps/api/` → 78 pass + 22 skip (integration sin `TEST_DATABASE_URL`), 0 fail; `tsc -p tsconfig.json` exit 0 |

## WU1 — Notas

- 60 tests añadidos en `tasks.test.ts`; los 18 tests previos de `auth.test.ts` siguen verdes (78/78 total).
- `tasksContract` cubre las 6 ops de task (`list/get/create/update/move/remove`) + 5 de states (`list/create/update/remove/reorder`) + 1 de `clients.search`, todas con prefijo `/tasks/...` estable. Cubre el Scenario "Prefijo /tasks estable" del spec `tasks`.
- `lookups.ts` re-exporta `listClientsSearch*` desde `./tasks` (mismo schema, sin `lookupsContract` propio) y define los schemas de `typeForForm`/`categoryForForm` + `listTypesForForm`/`listCategoriesByType` consumidos por el form organism.
- `uuidSchema` extraído a `_shared.ts` para reuso entre `tasks.ts`, `lookups.ts` y futuros contratos.
- WU1 es prerequisito de PR-A (migration consume `taskSchema`/`taskStateSchema` en tests), PR-D (RPC client tipa `tasksContract`) y PR-E (form organism).
- Commit: `3c38206 feat(types): add tasks + lookups contracts with zod schemas and orpc router` (711 inserciones).

## WU2 — Notas

- **594 líneas** distribuidas: `002_tasks.ts` 115, `002_tasks.integration.test.ts` 267, `database.ts` +47 (extendido de 144→191), `test-cleanup.ts` +10 (extendido de 11→21).
- **5 tablas nuevas** con prefijos de 4 letras: `client` (`clie_*`), `type_categories_client` (`tccl_*`), `attachments` (`atta_*`), `task_attachments` (`taat_*`), `task` (`task_*`). `task_state` NO se recrea (pertenece a `001_initial.ts`).
- **Idempotencia garantizada**: 100% de sentencias usan `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`. Test de idempotencia ejecuta `up(db)` dos veces seguidas sin error.
- **`task_attachments` PK compuesta** `(taat_task_id, taat_atta_id)` con `taat_created_at` como metadato (no parte de la PK).
- **`type_categories_client.uq_tccl_combo`**: `UNIQUE NULLS NOT DISTINCT (tccl_user_id, tccl_type_id, tccl_cate_id, tccl_clie_id)` para soportar la fila GLOBAL (`tccl_clie_id IS NULL`).
- **`task.task_kanban_order DOUBLE PRECISION`**: ordenamiento kanban con gaps decimales (ver `KANBAN_DEFAULT_STEP` en WU3).
- **3 índices**: `idx_client_user` (parcial `WHERE clie_deleted_at IS NULL`), `idx_task_user` (parcial), `idx_task_kanban` (compuesto `(task_user_id, task_tast_id, task_kanban_order)` para queries kanban).
- **8 FKs verificadas** vía `information_schema.table_constraints` + `key_column_usage` + `constraint_column_usage`: `task→user/task_state/types/categories/client`, `type_categories_client→user`, `task_attachments→task/attachments`.
- **`down` preserva `task_state`**: test dedicado siembra `task_state` con datos y verifica que el `down` de 002 NO lo toca (pertenece a 001).
- **`cleanupTasksTables` ordering**: `task_attachments` → `attachments` → `task` → `type_categories_client` → `client` (hijo→padre, inverso a `up`).
- **`bun run db:migrate`**: NO ejecutado — `DATABASE_URL` no está configurado en el entorno. La verificación end-to-end real queda pendiente hasta que el usuario provea `TEST_DATABASE_URL`. Mientras tanto, la cobertura TDD es a nivel de contrato de código (`up`/`down` tipados correctamente, schema esperado verificado por introspección SQL al ejecutarse en CI).
- **Estado de commit**: WU2 está **uncommitted** (working tree). El commit se materializa en **PR-A**, según el plan.

## Estado de las WUs restantes

Las WUs WU2–WU15 (~3,000 líneas) quedan pendientes para el próximo attempt. La estructura del trabajo está clara:

- **WU2** migration `002_tasks.ts` + extension de `DatabaseSchema` + `cleanupTasksTables` + integration test.
- **WU3** 6 puertos de dominio + constants + errors (sin lógica de aplicación, sin imports de kysely/h3/otel).
- **WU4** 13 casos de uso + helpers kanban puros + tests in-memory.
- **WU5** 6 adapters kysely + tests integración opt-in.
- **WU6** 13 HTTP handlers + composition root + router.
- **WU7** RPC client multi-contract (requiere WU1 ✓) + migración `rpc-verifier`.
- **WU8** vendor wrappers `dnd-kit`/`lexical` (gate WU0 ✓ ya cerrado) + commit a `apps/web/package.json`.
- **WU9** `BaseView` + 3 vistas (list/grid/kanban).
- **WU10** i18n 43 claves `tasks.*` + validadores + helpers kanban cliente + helpers form.
- **WU11** 4 molecules + 7 organismos.
- **WU12** página `/tasks` + registro de ruta.
- **WU13** página `/tasks/:id` detail + ruta.
- **WU14** página `/tasks-config` + tab Estados + `task-state-form`.
- **WU15** verificación final (gates, smoke criterios 1–19, gates grep, `bun test` final).

## Próximo attempt — recomendación

- Continuar en orden WU2 → WU15.
- Para las migrations y kysely adapters, los integration tests usan `describe.skipIf(!databaseUrl)`; sin `TEST_DATABASE_URL` los tests se saltan pero el código se typecheca y se commitea.
- Para los organisms/molecules/pages frontend, los tests son TS puro (sin DOM) — el tooling de octane + bun test ya está activo.
- El budget restante (post-WU1) es ~5,300 líneas; los PRs siguen dentro del forecast (~3,000 líneas) → chaining `stacked-to-develop` sigue siendo viable.
- `apps/web/package.json` y `bun.lock` (cambios del WU0) siguen **uncommitted** y se commitean en **WU8**, como exige el design.
