---
type: "Referencia"
title: "Suites de pruebas y guardas de arquitectura"
openwiki_generated: true
verified:
  - by: openwiki/0.7.2
    at: 2026-10-27T02:48:33.191Z
sources:
  - id: openwiki-source-80276df55c8da3940ca5955f
    resource: repo://apps/api/package.json
  - id: openwiki-source-236c788cf753793971e22a3e
    resource: repo://apps/api/src/application/tasks/create-task.test.ts
  - id: openwiki-source-d253bf9d1f8952f9962ff559
    resource: repo://apps/api/src/application/tasks/test-helpers.ts
  - id: openwiki-source-7ee8fa6abd554cf539e11edf
    resource: repo://apps/api/src/domain/ports/__attachment-not-in-composition.test.ts
  - id: openwiki-source-86bdfc120d58c573c461cbd9
    resource: repo://apps/api/src/domain/ports/__no-external-imports.test.ts
  - id: openwiki-source-ac43c8920ecd70c0d8785de3
    resource: repo://apps/api/src/http/auth.integration.test.ts
  - id: openwiki-source-56658e37c84166cf5146985a
    resource: repo://apps/api/src/http/tasks/tasks-routes.integration.test.ts
  - id: openwiki-source-f2254e106f6c3265b105b2d2
    resource: repo://apps/api/src/infrastructure/kysely/002_tasks.integration.test.ts
  - id: openwiki-source-3609df6a9246a9c802593f49
    resource: repo://apps/web-v2/eslint.config.ts
  - id: openwiki-source-7059276a8b51d666bd93e082
    resource: repo://apps/web-v2/package.json
  - id: openwiki-source-155202376612c06060710914
    resource: repo://apps/web-v2/tests/component/tasks.test.ts
  - id: openwiki-source-32aa9dedc9ca67b2b78eba56
    resource: repo://apps/web-v2/tests/unit/application/task/use-cases.test.ts
  - id: openwiki-source-a5477ce13797b196091d9ce3
    resource: repo://apps/web-v2/tests/unit/domain/result.test.ts
  - id: openwiki-source-324a392e96ed8972087f5551
    resource: repo://apps/web-v2/tests/unit/infrastructure/api/errors.test.ts
  - id: openwiki-source-3cf24cb0a74cbd7396dc3385
    resource: repo://apps/web-v2/vitest.config.ts
  - id: openwiki-source-99de51df25f29bfc72caf823
    resource: repo://apps/web/package.json
  - id: openwiki-source-38af7bdd34d817fbd3c29077
    resource: repo://openspec/config.yaml
  - id: openwiki-source-440ae1e215cb02721dda855c
    resource: repo://turbo.json
generated: { by: "pi", at: "2026-10-27T02:48:33.191Z" }
---


# Suites de pruebas y guardas de arquitectura

## Runners

| Aplicación | Runner | Script |
| --- | --- | --- |
| `apps/api` | `bun test` | `bun test` |
| `apps/web` | `bun test` | `bun test` |
| `apps/web-v2` | Vitest 5 | `vitest run` |

La configuración del proyecto declara `runner: bun test` y `strict_tdd: true`,
con una única excepción acotada al scaffold del monorepo (que no contiene
lógica de negocio). En turbo, `test` depende de `^build`, así que un build
roto de una dependencia bloquea los tests.

## Backend: dos niveles

**Tests unitarios de casos de uso** (~57 archivos de test en `apps/api/src`).
Se prueban contra dobles en memoria definidos en
`application/tasks/test-helpers.ts`: repositorios `InMemory*` para los seis
puertos del módulo, un `InMemoryTransactionManager` que ejecuta el callback
sin contexto transaccional, una `InMemoryTelemetry` que captura spans, un
`FixedClock` y un `FakeIdGenerator` de UUIDs deterministas, más factories de
filas de dominio.

El encabezado de ese archivo es explícito sobre la intención: las interfaces
de los fakes se mantienen idénticas a las del dominio para que los casos de
uso se prueben contra los mismos tipos que consumen los adapters de Kysely.

Un caso típico (`create-task.test.ts`) verifica que la tarea se cree al final
de la columna con el orden por defecto cuando la columna está vacía, que use
`max + 1024` cuando no lo está, y que un estado desconocido o ajeno al
usuario produzca `TaskStateNotFound`.

**Tests de integración** (archivos `*.integration.test.ts`). Hay nueve, y
todos se auto-excluyen cuando no hay base de datos:

```ts
describe.skipIf(!databaseUrl)("auth HTTP endpoints (integration)", ...)
```

Cubren la migración `002_tasks`, los repositorios de login, sesión, cliente y
tarea, el movimiento real contra base, el flujo HTTP de auth y el de tareas, y
el envío SMTP contra Mailpit. En `bun test` sin `TEST_DATABASE_URL` estos tests
se saltan en silencio: **pasan en verde sin ejecutar nada**, así que un CI sin
base de datos no valida el SQL.

## Guardas de arquitectura

Dos tests del backend no prueban comportamiento, sino estructura, y fallan el
build si se rompe una invariante:

- `domain/ports/__no-external-imports.test.ts` escanea los puertos prohibiendo
  imports de `kysely`, `h3`, `nitro`, `pg` o `nodemailer`. Limitación: la
  lista de archivos escaneados es explícita y cubre hoy seis puertos.
- `domain/ports/__attachment-not-in-composition.test.ts` falla si el
  composition root menciona `attachment-repository`, porque es un stub de la
  fase 2 que no debe cablearse.

En el frontend, el equivalente es ESLint: reglas de encapsulamiento de vendor
y de purity de `domain/` y `application/`.

## Frontends

`apps/web` tiene 33 archivos de test co-localizados con `bun test`. Como los
componentes `.tsrx` no se pueden importar desde `bun:test`, la lógica se
extrae a archivos `*.logic.ts` / `*.helpers.ts` que sí se prueban.

`apps/web-v2` usa Vitest con entorno `happy-dom` e incluye
`tests/**/*.test.ts` y `src/**/*.test.ts`. Hoy hay **seis** archivos de test:

| Archivo | Qué cubre |
| --- | --- |
| `tests/unit/application/task/use-cases.test.ts` | los casos de uso de tareas contra un fake en memoria que registra llamadas |
| `tests/unit/domain/task/validateCategoryRequiresType.test.ts` | la política de dominio |
| `tests/unit/domain/auth/parseOtp.test.ts` | el parseo del OTP con ceros a la izquierda |
| `tests/unit/domain/result.test.ts` | los helpers `ok`/`err` |
| `tests/unit/infrastructure/api/errors.test.ts` | el mapeo de errores oRPC a códigos de dominio |
| `tests/component/tasks.test.ts` | el contrato a nivel de esquema, sin DOM |

## Qué no está cubierto

- Las carpetas `apps/web-v2/tests/e2e`, `tests/integration` y
  `tests/unit/ui` están **vacías**, y no hay configuración de Playwright
  aunque el PRD lo contempla como mecanismo de verificación del cutover.
- El glob `src/**/*.test.ts` del Vitest no matchea ningún archivo: no hay tests
  dentro de `src`.
- No hay cobertura de las capas de dominio y aplicación de `client`,
  `config`, `finance` y `schedule` del frontend: esas capas aún no existen.
- La regla de purity de puertos solo cubre seis de los ~30 puertos del
  backend, y no hay guarda de dirección de imports para las capas `http` y
  `application`.
