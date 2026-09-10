# Workspace Specification (delta — change `tasks`)

> Delta sobre el spec canónico en `openspec/specs/workspace/spec.md`. La
> baseline (workspace bun + turborepo, registry npm, pinning, verificación
> bloqueante) NO se relaja; este delta AÑADE un escenario concreto al
> requisito existente "Verificación y pinning de versiones (bloqueante)"
> para los bindings nuevos introducidos por el change `tasks`:
> `@octanejs/dnd-kit` y `@octanejs/lexical`.

## ADDED Requirements

### Requirement: Verificación y pinning de @octanejs/dnd-kit y @octanejs/lexical (bloqueante para change tasks)

Aplican todas las reglas del requisito canónico "Verificación y pinning
de versiones (bloqueante)" del spec `workspace` al change `tasks`, con
las siguientes extensiones específicas para los dos bindings que este
change introduce como consumidor: `@octanejs/dnd-kit` (wrapper para el
kanban de `BaseView`) y `@octanejs/lexical` (wrapper para el editor rich
text de descripciones de tarea). Ambos paquetes son actualmente
**diferidos con consumidor en este change** según el spec
`vendor-bindings`, y la verificación npm bloqueante DEBE ejecutarse
antes de pinear cualquiera de los dos en `apps/web/package.json` y
`bun.lock`. La verificación DEBE confirmar, en este orden estricto:
(1) existencia del paquete en el registry npm bajo el scope/nombre
`@octanejs/dnd-kit` y `@octanejs/lexical`; (2) peer deps compatibles con
`octane@0.2.3` y `react@18` del workspace (sin conflictos de rango);
(3) versión exacta pineada (sin `^` ni `~`) en `apps/web/package.json`;
(4) lockfile (`bun.lock`) actualizado y commiteado; (5) `bun install
--frozen-lockfile` pasa. Si CUALQUIERA de estos pasos falla —paquete
inexistente, peer incompatibles, o lockfile roto— la implementación
DEBE detenerse ANTES de commitear `apps/web/package.json`, documentar
el hallazgo y escalar al product owner; la sustitución del binding
(p. ej. fallback a una librería de terceros alternativa) NUNCA DEBE
decidirse por cuenta propia (la elección de stack es decisión del PRD,
no del change agent).

#### Scenario: Verificación npm de @octanejs/dnd-kit previa al commit

- GIVEN el primer commit del change `tasks` que introduce `@octanejs/dnd-kit` en `apps/web/package.json`
- WHEN se inspecciona el commit y su historial de apply
- THEN el commit incluye, en el log de apply: `bun pm view @octanejs/dnd-kit versions --json` y `bun pm view @octanejs/dnd-kit peerDependencies` con peer deps compatibles con `octane@0.2.3`/`react@18`; la versión figura exacta (sin `^`/`~`) en `package.json`; `bun.lock` está actualizado; `bun install --frozen-lockfile` pasa

#### Scenario: Verificación npm de @octanejs/lexical previa al commit

- GIVEN el primer commit del change `tasks` que introduce `@octanejs/lexical` en `apps/web/package.json`
- WHEN se inspecciona el commit y su historial de apply
- THEN el commit incluye, en el log de apply: `bun pm view @octanejs/lexical versions --json` y `bun pm view @octanejs/lexical peerDependencies` con peer deps compatibles; la versión figura exacta (sin `^`/`~`) en `package.json`; `bun.lock` está actualizado; `bun install --frozen-lockfile` pasa

#### Scenario: Escalación si @octanejs/dnd-kit no resuelve

- GIVEN que `@octanejs/dnd-kit` no existe en npm bajo el scope/nombre esperado o sus peer deps son incompatibles con `octane@0.2.3`/`react@18`
- WHEN ocurre esta situación durante la implementación del change `tasks`
- THEN el trabajo sobre `apps/web` se detiene antes de commitear `apps/web/package.json`, se documenta el hallazgo en `apply-progress.md` y se escala al product owner sin sustituir el binding por decisión propia (prohibido fallback a `react-dnd`, `@dnd-kit/core` directo, etc.)

#### Scenario: Escalación si @octanejs/lexical no resuelve

- GIVEN que `@octanejs/lexical` no existe en npm bajo el scope/nombre esperado o sus peer deps son incompatibles con `octane@0.2.3`/`react@18`
- WHEN ocurre esta situación durante la implementación del change `tasks`
- THEN el trabajo sobre `apps/web` se detiene antes de commitear `apps/web/package.json`, se documenta el hallazgo en `apply-progress.md` y se escala al product owner sin sustituir el binding por decisión propia (prohibido fallback a `lexical` upstream directo, `tiptap`, `slate`, etc.)

#### Scenario: Lockfile congelado tras pinear ambos bindings

- GIVEN `apps/web/package.json` con `@octanejs/dnd-kit` y `@octanejs/lexical` pineados a versiones exactas tras la verificación npm
- WHEN se ejecuta `bun install --frozen-lockfile`
- THEN la instalación termina sin warnings ni conflictos de peer deps y `bun.lock` queda commiteado
