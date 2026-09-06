# CRM-HOME

App web multi-user para freelancers: tareas + time-tracking + finanzas sobre un
único modelo de datos. Fuente de verdad del producto: `docs/PRD-v2.md`.

## Requisitos

- bun (pin exacto en `packageManager` del `package.json` raíz)
- Docker + docker compose (para PostgreSQL de desarrollo)

## Arranque rápido

```bash
bun install          # resuelve el workspace completo con bun.lock commitado
cp .env.example .env # opcional: sin .env la telemetría es no-op
make db-up           # postgres:17-alpine healthy en localhost:5432
bun run dev          # turbo run dev → api (3000) + web (5173)
```

## Estructura del monorepo

- `apps/api` (`@crm/api`) — nitro + h3 + orpc + kysely, clean architecture
  (ports & adapters auditable por path).
- `apps/web` (`@crm/web`) — frontend vite + tailwind v4 + i18n `es`, atomic
  design con regla de wrappers (`src/components/vendor/`).
- `packages/tsconfig` (`@crm/tsconfig`) — bases `base`, `server` y `web`.
- `packages/types` (`@crm/types`) — contratos y tipos compartidos api↔web.

## Scripts raíz

| Script | Qué hace |
| --- | --- |
| `bun run dev` | `turbo run dev` |
| `bun run build` | `turbo run build` |
| `bun run test` | `turbo run test` |
| `bun run lint` | `turbo run lint` |
| `bun run typecheck` | `turbo run typecheck` |

## Fallback sin turbo (`bun --filter`)

Si turbo falla con `bun.lock` (formato texto v2), los mismos scripts se ejecutan
directamente con bun, filtrando por paquete:

```bash
# tests de un paquete concreto
bun --filter '@crm/api' run test

# build de todas las apps
bun --filter './apps/*' run build

# typecheck de todo el workspace
bun --filter '@crm/api' run typecheck && bun --filter '@crm/web' run typecheck

# o directamente en el directorio del paquete
cd apps/api && bun run test
```

Los smoke tests también pueden ejecutarse desde la raíz con `bun test` (bun
descubre los tests del workspace recursivamente).
