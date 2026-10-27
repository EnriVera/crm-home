---
type: reference
title: Monorepo y cadena de herramientas
description: Estructura del workspace bun con tres aplicaciones y tres paquetes compartidos, pipeline de turbo, targets del Makefile, hooks de commit y por qué conviven dos frontends.
tags: [monorepo, tooling, turbo, bun, workspace]
verified:
  - by: openwiki/0.7.2
    at: 2026-10-27T02:48:33.191Z
sources:
  - id: openwiki-source-cf2bedd52c170bfab2bbf723
    resource: repo://.husky/commit-msg
  - id: openwiki-source-7059276a8b51d666bd93e082
    resource: repo://apps/web-v2/package.json
  - id: openwiki-source-a96950067d4edffc310720c3
    resource: repo://apps/web/src/lib/api/rpc.ts
  - id: openwiki-source-7dc952d611a75d93fb9b2fb5
    resource: repo://bunfig.toml
  - id: openwiki-source-04503e54e9522bf2155b8511
    resource: repo://commitlint.config.mjs
  - id: openwiki-source-a82862cc0ba3ba2016095365
    resource: repo://docs/PRD-v3.md
  - id: openwiki-source-71ab8de354d3dea20dc3ee42
    resource: repo://docs/PRD-v4.md
  - id: openwiki-source-012f2c78e3b1446dfc35803f
    resource: repo://Makefile
  - id: openwiki-source-38af7bdd34d817fbd3c29077
    resource: repo://openspec/config.yaml
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-84c0d1bb13d2eb23a283e86f
    resource: repo://packages/contract/package.json
  - id: openwiki-source-ea2c5c99113628a862cb585b
    resource: repo://packages/email/package.json
  - id: openwiki-source-440ae1e215cb02721dda855c
    resource: repo://turbo.json
generated: { by: "pi", at: "2026-10-27T02:48:33.191Z" }
---

# Monorepo y cadena de herramientas

CRM-Home es un monorepo privado gestionado con **bun** (versión fijada en
`packageManager: bun@1.4.0`) y **turbo** como orquestador de tareas. Todo el
tooling de alto nivel vive en la raíz, y cada aplicación o paquete declara
sus propios scripts.

## Estructura del workspace

```text
apps/
  api/      backend nitro + h3 + oRPC + kysely + postgres
  web/      frontend legacy (Octane, .tsrx) — congelado
  web-v2/   frontend activo (Vue 3 + TanStack Router/Query + Pinia)
packages/
  contract/ esquemas zod compartidos entre backend y frontends (@crm/contract)
  email/    plantillas de email transaccional (@crm/email)
  types/    paquete legacy de tipos (@crm/types), en retirada
  tsconfig/ configuraciones base de TypeScript
```

El workspace declara `apps/*`, `packages/*` y `apps/web-v2` explícitamente.
`bunfig.toml` fija `linker = "hoisted"`, es decir, `node_modules` plano en la
raíz en lugar de enlaces por paquete.

## Scripts de la raíz

| Script | Qué hace |
| --- | --- |
| `dev` | `turbo run dev` — levanta API y frontends en paralelo |
| `build` | `turbo run build` |
| `test` | `turbo run test` |
| `lint` / `typecheck` | `turbo run lint` / `turbo run typecheck` |
| `dev:v2` | `turbo run dev --filter=@crm/web-v2` — solo el frontend Vue |
| `prepare` | instala los hooks de husky |

## Pipeline de turbo

`turbo.json` define cinco tareas:

- `build` depende de `^build` y cachea `dist/**` y `.output/**`;
- `dev` no cachea y es persistente;
- `test` y `typecheck` dependen de `^build`, de modo que un build roto de una
  dependencia bloquea los tests;
- `lint` no tiene dependencias.

## Makefile

El `Makefile` es la interfaz de alto nivel para el día a día. Sus targets:

| Target | Efecto |
| --- | --- |
| `dev` / `build` / `test` | delegan en turbo |
| `db-up` | levanta solo postgres y espera a que `pg_isready` responda |
| `db-down` | `docker compose down` |
| `mail-up` / `mail-down` | levantan o detienen solo Mailpit, sin postgres |
| `up` / `down` | levantan o detienen postgres + Mailpit (target canónico) |
| `help` | lista los targets disponibles |

El `Makefile` documenta además un *fallback*: si turbo falla con el formato
de `bun.lock` v2, los mismos scripts se ejecutan con `bun --filter
'@crm/api' run test` o `bun run <task>` dentro del paquete.

No hay target de migraciones: las migraciones se corren con
`bun run db:migrate` dentro de `apps/api`.

## Commits

`commitlint.config.mjs` extiende `@commitlint/config-conventional` y el hook
`commit-msg` de husky ejecuta `bunx --no-install commitlint --edit "$1"`. Es
el único hook del repositorio: no hay `pre-commit`. La configuración del
proyecto reinforce la convención de Conventional Commits y la rama de
desarrollo activa es `develop`.

## Por qué conviven dos frontends

`apps/web` (Octane) y `apps/web-v2` (Vue 3) implementan la misma Fase 1 del
producto. El PRD-v3 marca `apps/web` como **congelado**: solo se aceptan PRs
de corrección de bugs, sin features nuevas, y se elimina cuando `web-v2`
supere un *cutover gate* de paridad de funcionalidad.

La distinción se ve en el código:

- `apps/web-v2` es la única aplicación que depende de `@crm/contract`;
- `apps/web` sigue importando el paquete legacy `@crm/types`;
- `apps/web-v2` aplica guardas de purity de capas por ESLint, mientras que
  `apps/web` no tiene esa disciplina.

En los puertos, `apps/web` corre en 5173 y `apps/web-v2` en 5174, y ambos
consumen la API en 3000.

Existe además un PRD-v4 que propone un tercer frontend (`apps/web-v3`, Nuxt 4)
y congela los dos anteriores, pero **ese frontend todavía no está
scaffoldeado**: `apps/` solo contiene `api`, `web` y `web-v2`. El PRD-v4
queda como plan, no como código.

## Paquetes compartidos

- `@crm/contract` expone subpath exports por dominio (`/task`, `/auth`,
  `/finance`, `/shared/result`, …) y depende solo de zod. Es la fuente única
  de los esquemas.
- `@crm/email` es una librería de plantillas compiladas con el plugin de
  Octane, con un segundo paso que escribe los tipos a mano.
- `@crm/types` es el paquete anterior de contratos, todavía consumido por
  `apps/web`.
