---
type: "Referencia"
title: "Quickstart: qué es CRM-Home y por dónde empezar"
openwiki_generated: true
verified:
  - by: openwiki/0.7.2
    at: 2026-10-27T02:48:33.191Z
sources:
  - id: openwiki-source-cf2bedd52c170bfab2bbf723
    resource: repo://.husky/commit-msg
  - id: openwiki-source-80276df55c8da3940ca5955f
    resource: repo://apps/api/package.json
  - id: openwiki-source-e08b04ac1998a75cd0afb8ba
    resource: repo://apps/api/src/http/composition-root.ts
  - id: openwiki-source-982b5981cdee0a76dd2374fa
    resource: repo://apps/api/src/infrastructure/email/console-email-sender.ts
  - id: openwiki-source-406998d15c878947a56ac178
    resource: repo://apps/api/src/infrastructure/email/create-email-sender.ts
  - id: openwiki-source-8cab6de122980c25bbc48649
    resource: repo://apps/api/src/infrastructure/kysely/migrate.ts
  - id: openwiki-source-012f2c78e3b1446dfc35803f
    resource: repo://Makefile
  - id: openwiki-source-38af7bdd34d817fbd3c29077
    resource: repo://openspec/config.yaml
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-0612ff143250c43ebbfbb3ba
    resource: repo://PRODUCT.md
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
generated: { by: "pi", at: "2026-10-27T02:48:33.191Z" }
---


# Quickstart: qué es CRM-Home y por dónde empezar

## Qué es

CRM-Home es una app web multi-usuario para freelancers: **tareas, time
tracking y finanzas sobre un único modelo de datos**. La promesa de producto es
que "qué hago", "cuánto tiempo me lleva" y "cuánta plata genera" compartan
tipos, categorías y clientes, de modo que la rentabilidad por cliente sea una
consulta y no una exportación.

El usuario objetivo es el freelancer o consultor independiente que hoy
mezcla Trello, Toggl y Excel. El registro es implícito y passwordless: el
primer OTP validado crea la cuenta y siembra datos por defecto.

Fases del producto, según `PRODUCT.md`:

| Fase | Alcance |
| --- | --- |
| 1 (MVP) | login OTP, config, clientes, tareas (grilla/kanban/lista con drag & drop), schedule, dashboard mínimo, modo oscuro, páginas legales, telemetría backend |
| 2 | finanzas completas (ingresos, gastos, transferencias), dashboard financiero, adjuntos |
| 3 | reportes avanzados, más módulos vía tabla `apps`, telemetría frontend |

No-goals explícitos: app móvil nativa, conversión de monedas, facturación
electrónica, colaboración entre usuarios y notificaciones push.

## Fuentes de verdad

- `docs/PRD-v2.md` — PRD canónico del producto (lo declara el README).
- `docs/PRD-v3.md` — introduce el frontend Vue y congela `apps/web`.
- `docs/PRD-v4.md` — propone un tercer frontend que todavía no existe.
- `PRODUCT.md` — propósito, usuarios, fases y no-goals.
- `DESIGN.md` — sistema visual: tokens, tipografía, contraste, movimiento.
- `openspec/specs/` — capacidades especificadas (api, api-auth, email, web…).

## Levantar el stack local

Requisitos: **bun** (versión fijada en el `packageManager` de la raíz) y
**Docker** para PostgreSQL.

```bash
bun install            # resuelve el workspace con bun.lock commitado
cp .env.example .env   # opcional: sin .env la telemetría queda no-op
make db-up             # postgres:17-alpine healthy en localhost:5432
bun run db:migrate     # en apps/api — paso que el README NO menciona
bun run dev            # turbo run dev → api (3000) + web (5173)
```

Extras: `bun run dev:v2` levanta el frontend Vue en 5174, y `make mail-up`
levanta Mailpit (SMTP 1025, UI 8025) para inspeccionar los emails.

Si turbo falla con el formato de `bun.lock` v2, el fallback documentado es
`bun --filter '@crm/api' run test` o `bun run <task>` dentro del paquete.

### Los tres pasos que más confunden

1. **Las migraciones son manuales.** No se aplican al arrancar la API. Sin
   `bun run db:migrate` la app levanta igual y responde 503 en `/rpc/**` o
   falla en la primera consulta.
2. **Sin `DATABASE_URL` la API arranca degradada**: solo `GET /health`
   funciona y todo `/rpc/**` responde 503. Es intencional, y sirve para
   distinguir "falta configuración" de "falló la lógica".
3. **Sin `SMTP_URL` los emails se imprimen por consola**, aunque tengas
   `SMTP_HOST` seteado. Ese sender imprime el código OTP completo.

## Por dónde leer según la tarea

| Si querés… | Leé |
| --- | --- |
| entender el workspace, el tooling y por qué hay dos frontends | [Monorepo y cadena de herramientas](architecture/monorepo-and-toolchain.md) |
| entender las capas del backend y las reglas de import | [Capas del backend y puertos de dominio](architecture/api-layering-and-ports.md) |
| ver el wiring completo y qué pasa sin base de datos | [Composition root y superficie HTTP](architecture/composition-root-and-http-surface.md) |
| entender cómo se expone la API y cómo se traducen los errores | [Dispatch oRPC y mapeo de errores](api/orpc-dispatch-and-error-mapping.md) |
| entender el login, la sesión y la cookie | [Autenticación OTP y ciclo de vida de la sesión](api/otp-auth-and-session-lifecycle.md) |
| entender el esquema y las migraciones | [Esquema PostgreSQL, migraciones y mapeo de filas](persistence/postgres-schema-and-migrations.md) |
| entender el tablero y el algoritmo de orden | [Ciclo de vida de tareas y kanban](workflows/task-kanban-lifecycle.md) |
| entender cómo sale un email | [Outbox de emails y entrega](workflows/email-outbox-and-delivery.md) |
| tocar el frontend | [Arquitectura del frontend web-v2 (Vue 3)](frontend/web-v2-architecture.md) |
| tocar los esquemas compartidos | [Contrato compartido y esquemas zod](contract/shared-schemas.md) |
| correr el stack o entender la telemetría | [Desarrollo local y observabilidad](operations/local-development-and-observability.md) |
| saber qué está realmente probado | [Suites de pruebas y guardas de arquitectura](testing/test-suites-and-architecture-gates.md) |

## Convenciones que no conviene rediscover

- Los commits son Conventional Commits, validados por el hook `commit-msg`.
- La rama de desarrollo es `develop`.
- Los casos de uso son clases con puertos inyectados; el dominio nunca importa
  kysely, h3, nitro ni SDKs externos, y eso lo verifica un test.
- El frontend activo es `apps/web-v2`; `apps/web` está congelado a bugs.
- Los esquemas compartidos están en `@crm/contract`; `@crm/types` es el
  paquete legacy que solo usa el frontend congelado.
