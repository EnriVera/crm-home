# Archive Report — frontend-foundation

> Change: `frontend-foundation` · Proyecto CRM-HOME · Rama `develop` · Fecha de archive: 2026-09-08
> Artifact store: openspec · Modo: repo-local

## Estado del archive

- **Archive status:** PASS ✅
- **Verificación previa:** PASS — verify-report.md indica `verdict: pass`, 26/26 requisitos, 46/46 escenarios, 0 blockers, 0 critical_findings.
- **Tareas de implementación:** 47/47 completadas (`grep '^\s*- \[ \]' tasks.md` → 0 coincidencias).
- **Sync de specs:** Completado en archive-time con aprobación implícita del orquestador (sync-report.md no existía; el prompt de contexto ordenó "merge into the existing canonical spec per your archive contract (delta merge)").

## Artifacts leídos

| Artifact | Path | Estado |
| --- | --- | --- |
| proposal | `openspec/changes/frontend-foundation/proposal.md` | ✅ leído |
| design | `openspec/changes/frontend-foundation/design.md` | ✅ leído |
| tasks | `openspec/changes/frontend-foundation/tasks.md` | ✅ leído; 0 checkboxes sin marcar |
| apply-progress | `openspec/changes/frontend-foundation/apply-progress.md` | ✅ leído |
| verify-report | `openspec/changes/frontend-foundation/verify-report.md` | ✅ leído; PASS |
| sync-report | `openspec/changes/frontend-foundation/sync-report.md` | ❌ no existía; se ejecutó archive-time sync fallback |
| config | `openspec/config.yaml` | ✅ leído |

## Dominios sincronizados

### Dominios nuevos (copia completa a canonical)

| Dominio | Origen | Destino | Operación |
| --- | --- | --- | --- |
| `design-system` | `openspec/changes/frontend-foundation/specs/design-system/spec.md` | `openspec/specs/design-system/spec.md` | ADDED (spec completa) |
| `web-shell` | `openspec/changes/frontend-foundation/specs/web-shell/spec.md` | `openspec/specs/web-shell/spec.md` | ADDED (spec completa) |
| `web-auth-ui` | `openspec/changes/frontend-foundation/specs/web-auth-ui/spec.md` | `openspec/specs/web-auth-ui/spec.md` | ADDED (spec completa) |

### Dominio existente `web` (delta merge)

Baseline canonical: `openspec/specs/web/spec.md` (creado por archive previo de `monorepo-scaffold`).
Delta aplicado desde: `openspec/changes/frontend-foundation/specs/web/spec.md`.

#### MODIFIED Requirements

1. **Ruta inicial mínima y base de router** — reemplazado el bloque canonical completo. Se retira la página de humo y se documenta el redirect a `/login` + placeholders del shell.
2. **Tokens de estilo semánticos** — reemplazado el bloque canonical completo. Se delega autoridad a la spec `design-system` (tres capas, estado/foco, `@custom-variant dark`).

#### ADDED Requirements

1. **Redirect de la ruta raíz a /login**
2. **Tabla de rutas ampliada con helpers de layout**
3. **Script anti-FOUC en index.html**
4. **Catálogo i18n extendido con escaneo por glob**

#### REMOVED Requirements

- Ninguno.

## Warnings registrados

- **Active same-domain change:** `stack-alignment` también tiene specs en `design-system`, `web`, `web-auth-ui`, `web-shell` y `vendor-bindings`. Al archivar `frontend-foundation` primero, `stack-alignment` deberá aplicar sus propios deltas sobre la nueva baseline canonical. No se detectaron conflictos de nombres de requisito en este merge, pero la intersección de dominios queda documentada para la fase de sync de `stack-alignment`.
- **Archive-time sync fallback:** `sync-report.md` no existía; el merge a canonical se ejecutó durante archive con base en la instrucción del orquestador ("merge into the existing canonical spec per your archive contract").
- **WARNING-3 del verify-report:** `openspec/config.yaml` declara `stack.frontend.components: zagjs`, pero el estado final usa fallback hand-rolled sin runtime zagjs. El cambio `stack-alignment` es el propietario de reconciliar esa declaración.
- **WARNING-4 del verify-report:** `DESIGN.md` (raíz) y `.impeccable/surface-briefs/` estaban untracked en `develop` al momento del verify. No se commitean en esta fase; el orquestador externo maneja los commits.

## Destructive merge guard

- No se aplicaron requisitos REMOVED.
- Los dos MODIFIED reemplazaron bloques completos (no parciales) y conservaron el nombre del requisito.
- No se eliminaron escenarios de los requisitos MODIFIED; los bloques delta incluyen los scenarios actualizados.

## Ruta de archive

- **Origen:** `openspec/changes/frontend-foundation/`
- **Destino:** `openspec/changes/archive/2026-09-08-frontend-foundation/`

## Observaciones de memoria

- No aplica (artifact store es `openspec`; no se usó Engram como backend persistente).

## Recomendación

El change `frontend-foundation` queda archivado. El siguiente paso es que el orquestador ejecute `sdd-archive` para `stack-alignment` o, si aplica, realice los commits de los artefactos documentales pendientes (`DESIGN.md`, `.impeccable/`) en `develop`.
