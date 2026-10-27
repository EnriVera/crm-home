---
type: operations
title: Desarrollo local y observabilidad
description: Cómo levantar el stack local (postgres y Mailpit por compose), qué variables de entorno existen y cuáles faltan, cómo se aplican las migraciones, y por qué la telemetría OpenTelemetry degrada a no-op cuando no hay colector.
tags: [operations, docker, env, migrations, telemetry]
verified:
  - by: openwiki/0.7.2
    at: 2026-10-27T02:48:33.191Z
sources:
  - id: openwiki-source-5f5b95b3d6a215fa02ceb945
    resource: repo://.env.example
  - id: openwiki-source-cf2bedd52c170bfab2bbf723
    resource: repo://.husky/commit-msg
  - id: openwiki-source-80276df55c8da3940ca5955f
    resource: repo://apps/api/package.json
  - id: openwiki-source-22eec4303af9b360c1b1ef10
    resource: repo://apps/api/src/application/health/get-health.ts
  - id: openwiki-source-9dab833c457d9d1abab085c7
    resource: repo://apps/api/src/application/tasks/move-task.ts
  - id: openwiki-source-82aeb2559d3f0c23b1330e94
    resource: repo://apps/api/src/domain/ports/telemetry.ts
  - id: openwiki-source-e08b04ac1998a75cd0afb8ba
    resource: repo://apps/api/src/http/composition-root.ts
  - id: openwiki-source-8cab6de122980c25bbc48649
    resource: repo://apps/api/src/infrastructure/kysely/migrate.ts
  - id: openwiki-source-26741b4f029edbd3126dfec8
    resource: repo://apps/api/src/infrastructure/otel/create-telemetry.ts
  - id: openwiki-source-6d9bb00e32d63935a8de6059
    resource: repo://apps/api/src/infrastructure/otel/noop-telemetry.ts
  - id: openwiki-source-fe953ef000d14b3b2116df24
    resource: repo://apps/api/src/infrastructure/otel/otel-telemetry.ts
  - id: openwiki-source-04503e54e9522bf2155b8511
    resource: repo://commitlint.config.mjs
  - id: openwiki-source-b79fbbd921df689b4bbdc82f
    resource: repo://docker-compose.yml
generated: { by: "pi", at: "2026-10-27T02:48:33.191Z" }
---

# Desarrollo local y observabilidad

## Servicios locales

`docker-compose.yml` define dos servicios:

| Servicio | Imagen | Puertos | Notas |
| --- | --- | --- | --- |
| `postgres` | `postgres:17-alpine` | 5432 | usuario, password y base `crm` / `crm` / `crm_home`, volumen `crm_pgdata`, healthcheck con `pg_isready` |
| `mailpit` | `axllent/mailpit:v1.24` **pinned por digest** | 1025 (SMTP), 8025 (UI) | acepta cualquier credencial y SMTP inseguro, solo para dev local |

El pinning por digest de Mailpit es deliberado: el comentario del archivo
explica que es para que el contrato sea reproducible. Los overrides de puertos
locales van en `docker-compose.override.yml`, que no se versiona.

El `Makefile` ofrece `db-up` (solo postgres, esperando que esté healthy),
`mail-up` (solo Mailpit, útil para inspeccionar emails sin base de datos),
`up` (ambos) y sus correspondientes `down`.

## Variables de entorno

`.env.example` documenta seis:

| Variable | Valor de ejemplo | Para qué |
| --- | --- | --- |
| `DATABASE_URL` | `postgres://crm:crm@localhost:5432/crm_home` | conexión a PostgreSQL |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | vacío | telemetría; vacío = no-op |
| `API_PORT` | 3000 | puerto de la API |
| `WEB_PORT` | 5173 | puerto del frontend legacy |
| `SMTP_URL` | `smtp://localhost:1025` | Mailpit |
| `WEB_V2_PORT`, `WEB_V2_ENABLED` | 5174, 1 | coexistencia del frontend Vue |

Hay variables que el código usa y que **no** están en `.env.example`:
`TEST_DATABASE_URL`, `SESSION_COOKIE_SECURE`, `EMAIL_DRAIN_LOOP_ENABLED` y
`EMAIL_DRAIN_INTERVAL_MS`. Vale la pena documentarlas cuando se toque el
archivo.

## Migraciones

Las migraciones **no** se aplican automáticamente al arrancar el backend.
Se corren a mano:

```bash
bun run db:migrate   # en apps/api → bun src/infrastructure/kysely/migrate.ts
```

El runner usa el `Migrator` de Kysely con un `FileMigrationProvider` sobre el
directorio `migrations/`, aplica hasta la última versión, informa el resultado
de cada migración, destruye el pool y sale con código 1 si hubo error. Sin
`DATABASE_URL` falla de entrada con `DATABASE_URL is required`.

Detalle importante: ni el README ni el `Makefile` mencionan este paso, así
que es fácil arrancar la API con una base vacía.

## Telemetría: no-op por diseño

El puerto `Telemetry` del dominio expone solo lo justo: `startSpan`,
`shutdown`, y un handle de span con `setAttribute`, `recordException` y
`end`. No hay métricas ni contadores: el PRD los deja para una fase
posterior.

El factory decide el adapter a partir del entorno:

- `OTEL_EXPORTER_OTLP_ENDPOINT` vacío o ausente → `NoopTelemetry`, y **el SDK
  de OpenTelemetry ni siquiera se inicializa**;
- con endpoint → `OtelTelemetry`, el único archivo del repositorio que
  importa el SDK.

El adapter de OpenTelemetry levanta un `NodeSDK` con `service.name = "@crm/api"`
y un `OTLPTraceExporter` apuntando a `{endpoint}/v1/traces`. Solo se
exportan trazas.

La degradación a no-op es intencional, no un accidente: `.env.example` lo
comenta ("vacío → telemetría OpenTelemetry no-op") y el código lo documenta en
el factory y en el adapter. La consecuencia práctica es que en desarrollo no
se carga el SDK, no hay colector que configurar y ningún span sale del
proceso.

Los spans que hoy existen son pocos: `http.health` en el caso de uso de
salud y `task.move` en el movimiento kanban, este último con una lista
estricta de atributos permitidos (ids de tarea y de estado de origen y
destino, resultado y si hubo rebalanceo) para no filtrar PII.

## Commits

El hook `commit-msg` de husky ejecuta `bunx --no-install commitlint --edit` y
`commitlint.config.mjs` extiende `@commitlint/config-conventional`. Es el
único hook del repositorio.

## Checklist de arranque local

1. `bun install`
2. `cp .env.example .env` (opcional: sin `.env` la telemetría es no-op)
3. `make db-up` — PostgreSQL healthy en 5432
4. `bun run db:migrate` en `apps/api` — **no está en el README**
5. `bun run dev` — turbo levanta la API (3000) y el frontend legacy (5173)
6. opcionalmente `bun run dev:v2` — el frontend Vue en 5174
7. opcionalmente `make mail-up` — Mailpit en 8025 para inspeccionar emails
