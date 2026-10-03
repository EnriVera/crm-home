# Aesthetic 2026-Q4 pages — STATUS

Continuación del rediseño visual iniciado en `odd/app-shell-redesign`.
El shell (topbar + sidebar) y `/dashboard` ya adoptaron el lenguaje
minimalista + verde-acento del mockup Orbit UI (Linear-style). Esta
feature extiende ese lenguaje al resto de las páginas autenticadas.

## Tesis de diseño

- **Header consistente**: breadcrumb (mono 10px uppercase tracking-0.25em)
  - h1 (semibold 2xl tracking-tight) + acción primaria (verde) o slot
  `trailing` para multi-botón. Centralizado en `molecules/page-header/`.
- **Una sola acción primaria por pantalla** (regla §6 de DESIGN.md). El
  resto, ghost o secondary.
- **Verde reservado**: acción primaria + nav activo + foco + success +
  links inline (los 5 casos de §1).
- **Mono para meta**: breadcrumb, section labels (SidebarSection),
  activity headings, summary card titles. Cuerpo y títulos siguen en
  Poppins (DESIGN.md §3: familia única).
- **Sin sombras decorativas**: bordes 1px + `surface`/`text-primary/5`.

## Estado por task

| # | Task | Status | Validación |
| --- | --- | --- | --- |
| 1 | Feature doc + engram | ✅ done | odd/aesthetic-2026-q4-pages/tasks.md + engram #276 |
| 2 | PageHeader molecule | ✅ done | commit `123f18d` |
| 3 | Aplicar a 10 páginas | ✅ done | commit `062bf08` |
| 4 | Sidebar polish | ✅ done | commit `123f18d` (incluido en foundation) |
| 5 | Dashboard review | ✅ done | upgrade incluido en commit `062bf08` |
| 6 | i18n keys | ✅ done | commit `123f18d` (common.breadcrumbHome + pageHeader.breadcrumbAriaLabel) |
| 7 | Tests + commits | ✅ done | 320/320 tests pass; 2 work-unit commits |

## Commits entregados

1. `123f18d` — feat(web): add PageHeader molecule + share common.breadcrumbHome
2. `062bf08` — feat(web): apply PageHeader molecule to all 10 authenticated pages

## Decisiones de implementación

- **Slot `trailing` en PageHeader**: tasks page necesita 2 botones en el
  header (gear icon + "Nueva tarea"). El slot `trailing` recibe un
  OctaneNode libre para esos casos, mientras `action` se reserva para
  el botón primario único del resto de las páginas.
- **Dashboard count → subtitle**: el dashboard ya tenía el patrón
  inline; ahora comparte la molecule. El subtítulo muestra "N tareas"
  cuando hay registros (en línea con el patrón de incomes/expenses).
- **breadcrumbs de 3 niveles**: finance pages usan Home / Finance /
  Income (o Expenses / Transfers) para reflejar la sección. Tasks,
  Clients, Schedules, Config usan Home / Página (2 niveles). El
  breadcrumbs de detalle (ClientDetail, TaskDetail) usa Home / Sección
  / [Nombre].

## Deuda pendiente (no bloquea)

- El shell rediseño previo (odd/app-shell-redesign) tiene cambios sin
  commitear en el working tree: nav-item, sidebar-nav, dashboard
  antiguo, __app-shell, icons, tree. Pertenecen al feature anterior
  y quedan al usuario commitearlos aparte.
- Skill `design-taste-frontend` quedó instalada en `.pi/skills/` y
  `.agents/skills/` (no commiteada todavía).

## Referencias

- `odd/app-shell-redesign/tasks.md` — base del shell (topbar, sidebar, dashboard)
- `DESIGN.md` §1 (mundo visual: tesis + 5 casos de verde), §3 (Poppins), §8 (bans)
- Mockup Orbit UI provisto por el usuario (Acme Inc. inbox)
- Skill `design-taste-frontend` §4.7 (EYEBROW RESTRAINT cap)
