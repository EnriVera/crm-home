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

## Tests de integración y base de datos de test

Los tests de integración de la API (`*.integration.test.ts`) corren contra una
base de datos REAL y **borran tablas** al terminar. Por eso nunca pueden
apuntar a la base de desarrollo (`crm_home`): si lo hicieran, vaciarían los
datos del dueño.

Setup en una máquina nueva (desde `apps/api`):

```bash
cp .env.test.example .env.test   # URL de la base de test (sin secretos reales)
make up                          # postgres + mailpit
bun run test:db:setup            # crea crm_home_test y aplica las migraciones
bun run test:db                  # corre la suite con .env.test
```

`test:db:setup` es idempotente. También podés crearla a mano:

```bash
docker compose exec -T postgres psql -U crm -d postgres \
  -c 'CREATE DATABASE crm_home_test;'
DATABASE_URL=postgres://crm:crm@localhost:5432/crm_home_test bun run db:migrate
```

### Guardarraíl

`apps/api/src/infrastructure/kysely/test-db.ts` es la única puerta de entrada a
la base de test:

- exige que `TEST_DATABASE_URL` esté seteada — si falta, los tests de
  integración **fallan** en vez de saltearse en silencio (un skip esconde bugs:
  el de `auth.logout` estuvo dormido hasta que se arregló);
- exige que el nombre de la base termine en `_test` y que no sea `crm_home`;
- verifica con `current_database()` que la conexión real es la de test;
- aplica las migraciones pendientes antes de cada suite y repara el esquema si
  un test dropea tablas y deja el ledger inconsistente;
- `test-cleanup.ts` vuelve a verificar la base antes de borrar: si la URL
  apunta a la de desarrollo, aborta sin borrar nada.

### Variables de entorno

| Variable | Para qué | Valor de ejemplo |
| --- | --- | --- |
| `TEST_DATABASE_URL` | Base que usan los tests de integración | `postgres://crm:crm@localhost:5432/crm_home_test` |
| `DATABASE_URL` (en `.env.test`) | Se deja **vacía**: durante los tests se apunta a la base de test en runtime | (vacío) |

`apps/api/.env.test` está gitignored (`.gitignore:26`); la plantilla versionada
es `apps/api/.env.test.example`.

## Fallback sin turbo (`bun --filter`)

Si turbo falla con `bun.lock` (formato texto v2), los mismos scripts se ejecutan
directamente con bun, filtrando por paquete.

**Ojo con el orden de los flags:** en bun 1.4.0 el filtro va con `run` adelante
(`bun run --filter '<pkg>' <script>`) o con `=` (`bun --filter='<pkg>' run
<script>`). La forma `bun --filter '<pkg>' run <script>` **no** matchea ningún
paquete y falla con `No workspace packages matched the filter`.

```bash
# tests de un paquete concreto
bun run --filter '@crm/api' test

# build de todas las apps
bun run --filter './apps/*' build

# typecheck de todo el workspace
bun run --filter '@crm/api' typecheck && bun run --filter '@crm/web' typecheck

# o directamente en el directorio del paquete
cd apps/api && bun run test
```

Los smoke tests también pueden ejecutarse desde la raíz con `bun test` (bun
descubre los tests del workspace recursivamente). Ojo: desde la raíz, bun lee
el `.env` de la raíz (no el `.env.test` de `apps/api`), así que para los tests
de integración usá `bun run --filter '@crm/api' test` desde `apps/api` o
`bun run test:db`.
