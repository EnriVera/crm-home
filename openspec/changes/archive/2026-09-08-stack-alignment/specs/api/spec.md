# Delta for Api

> Change: `stack-alignment` · Delta sobre la spec `api`.
> NOTA DE BASELINE: `openspec/specs/api/spec.md` aún no existe porque
> `monorepo-scaffold` no fue archivado; este delta se escribe contra
> `openspec/changes/monorepo-scaffold/specs/api/spec.md` como baseline de facto
> (verificado). Orden de archivo obligatorio:
> `monorepo-scaffold` → `frontend-foundation` → `stack-alignment`.

## ADDED Requirements

### Requirement: Base fundacional effect y xstate instalada y confinada

`apps/api/package.json` DEBE incorporar `effect` y `@octanejs/xstate` + `xstate`
con versión exacta pineada (lockfile commitado), como base fundacional del stack
§10. Ambos paquetes DEBEN quedar confinados por la regla ports & adapters: sus
imports PUEDEN aparecer únicamente bajo `src/infrastructure/` (adapters) o en el
composition root de `src/http/`; ningún archivo bajo `src/domain/` ni
`src/application/` PUEDE importarlos. El change DEBE dejar al menos un punto de
cableado real mínimo que demuestre la integración dentro de la arquitectura
(p. ej. el adapter de `Telemetry` o el wiring de salud existente reexpresado con
effect), SIN añadir lógica de negocio inventada; si design documenta diferir el
cableado efectivo al primer change consumidor de adapters, la instalación
pineada y el motivo del diferimiento DEBEN quedar registrados igualmente
(requisito condicional).

#### Scenario: Deps fundacionales pineadas

- GIVEN `apps/api/package.json` tras el change
- WHEN se inspeccionan las dependencias
- THEN `effect`, `@octanejs/xstate` y `xstate` figuran con versión exacta y el lockfile las resuelve de forma reproducible

#### Scenario: Confinamiento verificable por grep

- GIVEN el árbol `src/` de `apps/api` tras el change
- WHEN se buscan imports de `effect`, `@octanejs/xstate` o `xstate`
- THEN aparecen únicamente bajo `src/infrastructure/` o `src/http/`, nunca en `src/domain/` ni `src/application/`

#### Scenario: Suite verde sin lógica nueva

- GIVEN el cableado mínimo aplicado (o el diferimiento documentado)
- WHEN se ejecuta `bun test` en `apps/api`
- THEN los 2 tests existentes pasan sin cambios de comportamiento y no se ha añadido lógica de negocio fuera de alcance
