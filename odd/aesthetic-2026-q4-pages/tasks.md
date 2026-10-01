# Aesthetic 2026-Q4 pages — STATUS

Continuación del rediseño visual iniciado en `odd/app-shell-redesign`.
El shell (topbar + sidebar) y `/dashboard` ya adoptaron el lenguaje
minimalista + verde-acento del mockup Orbit UI (Linear-style). Falta
aplicar el mismo lenguaje al resto de las páginas autenticadas.

## Tesis de diseño

- **Header consistente**: `breadcrumb` (mono pequeño uppercase) + `h1`
  (semibold 2xl tracking-tight) + botón de acción primaria (relleno
  verde, único por pantalla) cuando aplica.
- **Sin eyebrow overkill**: solo el breadcrumb de la página actual. Las
  secciones internas no llevan eyebrow (regla EYEBROW RESTRAINT del
  design-taste-frontend skill — cap 1 cada 3 secciones).
- **Verde reservado**: la acción primaria de cada pantalla y los
  estados activos. El resto, texto secundario + jerarquía por
  espacio/peso.
- **Mono para meta**: breadcrumb, timestamps, IDs de registro, contadores
  (`font-mono text-[10px] uppercase tracking-[0.25em]`). Cuerpo y títulos
  siguen en Poppins.
- **Sin sombras decorativas**: bordes 1px con `border-border`, jerarquía
  con `surface`/`text-primary/5`.

## Estado por task

| # | Task | Status | Validación |
| --- | --- | --- | --- |
| 1 | Feature doc + engram | 🔄 in progress | odd/aesthetic-2026-q4-pages/tasks.md creado |
| 2 | PageHeader molecule | ⏳ pending | render en tests; snapshot en dashboard |
| 3 | Aplicar a 10 páginas | ⏳ pending | typecheck + tests + visual review |
| 4 | Sidebar + SidebarUserCard polish | ⏳ pending | visual review |
| 5 | Dashboard + Topbar final review | ⏳ pending | visual review |
| 6 | i18n keys | ⏳ pending | i18n.test.ts scan verde |
| 7 | Tests + typecheck + commits | ⏳ pending | 320 tests pass; typecheck clean |

## Decisiones a confirmar con laya (futuro)

- ¿Mostrar `breadcrumbHome` solo en `/dashboard`, o en todas las
  páginas autenticadas? El mockup Orbit lo muestra en `Home / Inbox`.
  Hoy solo está en `/dashboard`. Aplicar a todas es coherente.

## Referencias

- `odd/app-shell-redesign/tasks.md` — base del shell (topbar, sidebar, dashboard)
- `DESIGN.md` §1 (mundo visual: tesis + 5 casos de verde), §3 (Poppins), §8 (bans)
- Mockup Orbit UI provisto por el usuario (Acme Inc. inbox)
