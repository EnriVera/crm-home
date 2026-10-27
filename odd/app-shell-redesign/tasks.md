# App shell redesign (topbar + sidebar + dashboard) — STATUS

Rediseño visual del shell autenticado siguiendo el mockup provisto por el
usuario (Orbit UI showcase, con adaptación a nuestro design system de
tokens semánticos y Poppins).

## Estado por task

| # | Task | Status | Validación |
| --- | ------ | -------- | ----------- |
| 1 | Zag disclosure wrapper vendor | ✅ done | 6 tests pass en `vendor/disclosure/disclosure-props.test.ts` |
| 2 | Finance state helper | ✅ done | 4 tests pass en `lib/nav/finance-collapsed.test.ts` (decoder puro) |
| 3 | FinanceNavGroup molecule | ✅ done | Compila; render integrado en `sidebar-nav.tsrx` |
| 4 | Topbar molecule | ✅ done | Compila; montado en `__app-shell.tsrx` |
| 5 | SidebarUserCard molecule | ✅ done | Compila; en footer del sidebar |
| 6 | SidebarNav visual | ✅ done | Compila; secciones + Finance colapsable + user card |
| 7 | Dashboard visual | ✅ done | Compila; breadcrumb + stats grid + recent activity empty state |
| 8 | Integración topbar en shell | ✅ done | `__app-shell.tsrx` reescrito a `flex flex-col min-h-dvh` |
| 9 | i18n keys nuevas | ✅ done | 5 pass en `lib/i18n/i18n.test.ts` (auto-verifica presencia) |
| 10 | Verificación final | ✅ done (parcial) | tests OK; typecheck OK en mis archivos; build SSR preexistente broken |

## Resultado

- **Tests**: 320 pass / 0 fail en `bun test`.
- **Typecheck**: 0 errores en archivos creados/modificados por mí. 45 errores
  preexistentes en `lexical`, `base-view`, `client-form`, etc. — ninguno
  introducido por este cambio.
- **Build SSR**: falla con `MISSING_EXPORT createRoot` en `client-router.tsrx`
  (commit `4c44629`, **preexistente**). Confirmado con `git stash` que
  falla igual sin mis cambios. No es de mi scope.
- **Icon set**: extendido de 12 a 17 entradas (caret-down, caret-up,
  magnifying-glass, bell, plus). Test actualizado y verde.

## Decisiones de diseño (registradas en engram)

- Finanzas ahora vive en su propia sección visual del sidebar (`finance`)
  con el grupo Finanzas como disclosure colapsable (zag collapsible).
- Verde se mantiene EXCLUSIVAMENTE en `NavItem` activo (regla §1.2 de
  DESIGN.md). Ningún verde decorativo en headers, badges, ni cards.
- Sin sombras decorativas. Jerarquía con espacio, peso y `surface`/`text-
  primary/5` (translucidez del token semántico).
- "Restringed" no "Showcase": los `bg-emerald-500/80` del mockup original
  NO se replican. Brand-mark del topbar usa la escala primaria estática
  (`from-primary-500 to-primary-700`) — equivalente al favicon del
  workspace, no decoración.

## Decisión tipada con laya — pendiente

Quedó abierta una decisión de UX: cuando el usuario navega a una subruta
de Finance (`/incomes`, `/expenses`, `/transfers`), ¿el disclosure
debería auto-expandirse además de persistir el estado? Hoy persiste pero
NO deriva del pathname activo. Una futura sesión puede resolver con
`laya_laya_decide` si el usuario lo pide.
