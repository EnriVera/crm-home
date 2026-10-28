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

### Backend + SPA de Nuxt

Para trabajar en `apps/web-v3` hacen falta los dos procesos a la vez: el API en
`:3000` y el SPA en `:5175`.

```bash
make up              # postgres + mailpit (infra que ambos necesitan)
make dev-v3          # api (3000) + web-v3 (5175), salida etiquetada por paquete
```

`make dev-v3` es `turbo run dev --filter=@crm/api --filter=@crm/web-v3`: ambos
servidores quedan en la misma terminal, con la salida de cada uno prefijada
(`@crm/api:dev:` / `@crm/web-v3:dev:`). Ctrl-C los baja juntos.

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

## Targets del Makefile

| Target | Qué hace |
| --- | --- |
| `make dev` | `turbo run dev` (todos los dev servers) |
| `make dev-v3` | api (`:3000`) + web-v3 (`:5175`) a la vez |
| `make build` / `make test` | igual que `bun run build` / `bun run test` |
| `make up` / `make down` | postgres + mailpit |
| `make db-up` / `make mail-up` | solo postgres / solo mailpit |

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
