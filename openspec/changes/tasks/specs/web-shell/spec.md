# Web Shell Specification (delta — change `tasks`)

> Delta sobre el spec canónico en `openspec/specs/web-shell/spec.md`. La
> baseline del shell (sidebar resizable, árbol de nav, guard `requireSession`,
> helpers `shellRoute`) NO se relaja; este delta AÑADE un requisito nuevo
> que cubre el registro de `/tasks-config` como ruta del shell sin item de
> nav, accesible únicamente por la ruedita desde `/tasks`.

## ADDED Requirements

### Requirement: Ruta /tasks-config del shell sin item de nav (accedida por ruedita)

`apps/web/octane.config.ts` DEBE registrar `/tasks-config` como ruta del
shell usando el helper `shellRoute("/tasks-config", …)` para que herede el
layout del shell y el middleware `before: [requireSession]` (punto único
del guard), PERO NO DEBE agregar ningún item de navegación que apunte a
`/tasks-config` al árbol del sidebar (la lista canónica `SHELL_ROUTES` se
mantiene intacta — el árbol de navegación del PRD §7 no se modifica). El
acceso a `/tasks-config` desde la UI DEBE hacerse exclusivamente a través
de la ruedita (ícono gear) ubicada junto al botón "Nueva tarea" en
`/tasks`, con tooltip i18n `tasks.page.configTooltip` ("Configurar
estados") que explique su propósito. El test de consistencia nav↔rutas
(`tree.test.ts`) DEBE seguir verde porque `SHELL_ROUTES` no cambia. Esta
decisión está alineada con la confirmación del product owner (preproposal
2026-09-10): preserva la invariante del árbol §7 y mantiene el flujo de
descubrimiento acotado al contexto de `/tasks`.

#### Scenario: /tasks-config registrada con shellRoute pero sin item de nav

- GIVEN `apps/web/octane.config.ts` y `lib/nav/tree.ts` tras el change
- WHEN se inspecciona la tabla de rutas y el árbol del sidebar
- THEN `/tasks-config` figura en la tabla de rutas del shell (con `before: [requireSession]` heredado) y NO existe ningún item en `SHELL_ROUTES` ni en el árbol del sidebar que apunte a `/tasks-config`

#### Scenario: SHELL_ROUTES permanece intacto tras el change

- GIVEN la constante `SHELL_ROUTES` antes y después del change
- WHEN se comparan los dos valores
- THEN son idénticos: las ocho rutas canónicas del PRD §7 (Dashboard, Tareas, Schedule, Clients, Incomes, Expenses, Transfers, Config) no se modifican

#### Scenario: Acceso por ruedita con tooltip

- GIVEN el usuario navegando a `/tasks`
- WHEN se inspecciona el botón "Nueva tarea" y su vecindad
- THEN existe un botón con ícono `gear` (de `IconName` del wrapper `vendor/icons/`) cuya etiqueta accesible y tooltip son `tasks.page.configTooltip` ("Configurar estados"), y activarlo navega a `/tasks-config`

#### Scenario: Guard de sesión heredado del helper

- GIVEN un request a `/tasks-config` sin cookie de sesión válida
- WHEN el middleware `requireSession` consulta la sesión (401)
- THEN la respuesta es `302 Location: /login` y la página NO se renderiza

#### Scenario: tree.test.ts sigue verde

- GIVEN el test de consistencia nav↔rutas
- WHEN se ejecuta `bun test`
- THEN el test pasa sin modificaciones (la invariante "nav y rutas registradas no divergen" se preserva porque `SHELL_ROUTES` no cambia)
