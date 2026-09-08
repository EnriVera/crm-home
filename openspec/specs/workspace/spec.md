# Workspace Specification

## Purpose

Define el scaffold del monorepo CRM-HOME: workspace bun + turborepo, tooling base
(docker-compose, env, gitignore, Makefile), paquetes compartidos y la política de
pinning de versiones. Es la base sobre la que arrancan los changes de features
(PRD §6, §10). Todo el contenido es infraestructura sin lógica de negocio
(excepción TDD aprobada en `testing.tdd_exceptions`).

## Requirements

### Requirement: Workspace bun con workspaces `apps/*` y `packages/*`

El `package.json` raíz DEBE declarar workspaces `apps/*` y `packages/*`, un campo
`packageManager` con pin exacto de bun, y scripts `dev`, `build`, `test`, `lint`
y `typecheck` que deleguen en turborepo. `bun install` DEBE resolver en limpio
con el lockfile commitado (`bun.lock`). TypeScript DEBE declararse como
dependencia propia del workspace y NO DEBE dependerse del `tsc` transitivo de
commitlint.

#### Scenario: Instalación limpia resuelve

- GIVEN un clone fresco del repo en la rama `develop`
- WHEN se ejecuta `bun install`
- THEN la instalación termina sin errores usando las versiones pineadas del lockfile

#### Scenario: TypeScript propio del workspace

- GIVEN el workspace instalado
- WHEN se inspeccionan las dependencias declaradas
- THEN existe una dependencia `typescript` explícita con versión pineada, independiente de la transitiva de commitlint

### Requirement: Pipeline turborepo con fallback bun --filter

El repo DEBE incluir `turbo.json` con las tareas `build`, `dev`, `test`, `lint`
y `typecheck` configuradas (turbo ≥ 2.x compatible con bun). Si turbo falla con
el lockfile de bun, el fallback `bun --filter` DEBE estar documentado (README o
comentario en `package.json`/Makefile) y ser funcional para los mismos scripts.

#### Scenario: Build del workspace completo

- GIVEN el workspace instalado
- WHEN se ejecuta `turbo run build` (o el fallback `bun --filter` documentado)
- THEN compilan `apps/api`, `apps/web` y todos los `packages/*` sin errores

#### Scenario: Fallback documentado y operativo

- GIVEN que `turbo run test` falla por incompatibilidad con `bun.lock`
- WHEN se consulta la documentación del repo y se ejecuta el fallback `bun --filter`
- THEN los mismos scripts se ejecutan correctamente en todos los paquetes

### Requirement: Tooling de entorno (docker-compose, .env.example, .gitignore, Makefile)

El repo DEBE incluir: (a) `docker-compose.yml` con servicio `postgres:17-alpine`
y volumen persistente; (b) `.env.example` con `DATABASE_URL`,
`OTEL_EXPORTER_OTLP_ENDPOINT` (vacío → telemetría no-op) y puertos de dev;
(c) `.gitignore` ampliado con `.turbo/`, `dist/`, `.output/`, `.nitro/`, `.env`,
`.env.local` y `*.tsbuildinfo` además de los patrones existentes; (d) `Makefile`
en raíz con targets `dev`, `build`, `test`, `db-up` y `db-down` que orquesten
turbo y docker compose.

#### Scenario: PostgreSQL de desarrollo levanta vía compose

- GIVEN el repo con `docker-compose.yml` y `.env.example`
- WHEN se ejecuta `docker compose up -d` (o `make db-up`)
- THEN el contenedor `postgres:17-alpine` queda accesible con la `DATABASE_URL` de `.env.example` y sus datos persisten en el volumen declarado

#### Scenario: Artefactos de build no se commitean

- GIVEN el `.gitignore` ampliado
- WHEN se generan `.turbo/`, `dist/`, `.output/`, `.nitro/` o archivos `.env`
- THEN `git status` no los lista como archivos pendientes de commit

### Requirement: Paquetes compartidos @crm/tsconfig y @crm/types

El workspace DEBE incluir `packages/tsconfig` (paquete `@crm/tsconfig`) con bases
compartidas `base`, `server` y `web`, y `packages/types` (paquete `@crm/types`)
con los tipos/contratos compartidos api↔web (incluido el contrato orpc).
`apps/web` NO DEBE importar código fuente del servidor; los contratos compartidos
PUEDEN venir únicamente de `@crm/types`.

#### Scenario: Bases de TypeScript consumibles

- GIVEN los paquetes `packages/tsconfig` y `packages/types`
- WHEN `apps/api` y `apps/web` extienden las bases `server` y `web` respectivamente e importan `@crm/types`
- THEN `turbo run typecheck` (o fallback) pasa sin errores en ambos paquetes

#### Scenario: Web no importa código del server

- GIVEN el workspace compilado
- WHEN se inspeccionan los imports de `apps/web`
- THEN ningún import apunta a `apps/api/src`; los tipos compartidos provienen de `@crm/types`

### Requirement: Verificación y pinning de versiones (bloqueante)

Antes de commitear cualquier `package.json` del scaffold, TODAS las dependencias
clave DEBEN tener versión exacta pineada (sin rangos `^`/`~`) tras verificar su
existencia y peer deps en el registry npm. En particular, el scope/nombre y las
peer deps de React de `octanejs`/`tsrx` DEBEN verificarse antes del commit de
`apps/web`. Si `octanejs`/`tsrx` no existe en npm o no resuelve con las peer deps
requeridas, la implementación DEBE detenerse y escalar al usuario antes de
sustituir el stack (la elección de framework es decisión del PRD, no del change).
El scaffold NO DEBE introducir dependencias que requieran compilación nativa
(node-gyp).

#### Scenario: Versiones verificadas y pineadas

- GIVEN la lista de dependencias clave (octanejs/tsrx, nitro, turborepo, orpc, kysely, tailwindcss, vite, i18next)
- WHEN se prepara el commit del scaffold
- THEN cada dependencia existe en npm, sus peer deps son compatibles y su versión aparece exacta (sin rangos) en los `package.json`

#### Scenario: Escalación si octanejs no resuelve

- GIVEN que `octanejs`/`tsrx` no existe en npm bajo el nombre/scope esperado o sus peer deps son incompatibles
- WHEN ocurre esta situación durante la implementación
- THEN el trabajo sobre `apps/web` se detiene, se documenta el hallazgo y se escala al usuario sin sustituir el framework por decisión propia

### Requirement: Smoke tests verdes en workspace raíz

Cada app (`apps/api`, `apps/web`) DEBE incluir al menos un smoke test de arranque
ejecutable con el runner `bun test`, y `bun test` DEBE terminar verde ejecutado
desde la raíz del workspace.

#### Scenario: bun test verde en raíz

- GIVEN el workspace instalado con los smoke tests de cada app
- WHEN se ejecuta `bun test` desde la raíz del repo
- THEN todos los tests pasan (exit code 0) incluyendo al menos un smoke test por app

### Requirement: Commits Conventional Commits en develop

Los commits del scaffold DEBEN cumplir Conventional Commits (el hook
husky+commitlint existente NO DEBE ser modificado ni deshabilitado) y DEBEN
realizarse sobre la rama `develop`, preferentemente atómicos
(`chore: workspace tooling`, `feat(api): scaffold`, `feat(web): scaffold`).

#### Scenario: Hook de commitlint acepta los commits

- GIVEN el hook `commit-msg` con commitlint activo
- WHEN se crean los commits del scaffold en `develop`
- THEN ningún commit es rechazado por el hook y cada mensaje sigue la convención
