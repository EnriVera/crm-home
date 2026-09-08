# Api Specification

## Purpose

Define el scaffold de `apps/api` (`@crm/api`): nitro + h3 + orpc + kysely con
estructura clean architecture que materializa la regla vinculante de ports &
adapters (PRD §9, §10) de forma auditable por path desde el PR #1, telemetría
OpenTelemetry vendor-neutral degradable a no-op, y endpoint de salud. Sin
migraciones ni lógica de dominio (fuera de alcance).

## Requirements

### Requirement: Estructura clean architecture auditable por path

`apps/api` DEBE organizar su código en `src/domain/` (entidades y puertos en
TypeScript puro), `src/application/` (casos de uso), `src/infrastructure/`
(adapters) y `src/http/` (router orpc + wiring/DI como composition root). El
directorio `src/domain/ports/` DEBE existir desde el scaffold con al menos el
puerto `Telemetry` y un puerto de repositorio mínimo (p. ej. `HealthRepository`
o equivalente trivial). Ningún archivo bajo `src/domain/` ni `src/application/`
DEBE importar kysely, h3, nitro ni SDKs externos; esos imports PUEDEN aparecer
únicamente bajo `src/infrastructure/` y `src/http/`.

#### Scenario: Dominio libre de imports externos

- GIVEN el scaffold de `apps/api`
- WHEN se inspeccionan los imports de todos los archivos bajo `src/domain/` y `src/application/`
- THEN ninguno importa kysely, h3, nitro ni SDKs de terceros

#### Scenario: SDKs confinados a adapters

- GIVEN el scaffold de `apps/api`
- WHEN se buscan imports de kysely, h3, nitro u OpenTelemetry SDK en el árbol fuente
- THEN solo aparecen bajo `src/infrastructure/` y `src/http/`

### Requirement: Endpoint GET /health operativo

`apps/api` DEBE exponer un endpoint `GET /health` (vía orpc o ruta h3) que
responda HTTP 200 con un payload de estado mínimo, cableado a través del
composition root usando el puerto de repositorio mínimo definido en
`src/domain/ports/`.

#### Scenario: Health responde 200

- GIVEN `apps/api` levantado en modo dev
- WHEN se realiza `GET /health`
- THEN la respuesta es HTTP 200 con un cuerpo que indica estado saludable

#### Scenario: Health atraviesa el puerto del dominio

- GIVEN la implementación del endpoint de salud
- WHEN se inspecciona el wiring en `src/http/`
- THEN el handler depende de la interfaz del puerto (p. ej. `HealthRepository`), no directamente del adapter concreto

### Requirement: OpenTelemetry con degradación a no-op

`apps/api` DEBE integrar el SDK de OpenTelemetry con exportador OTLP configurado
exclusivamente por la variable de entorno `OTEL_EXPORTER_OTLP_ENDPOINT`. Si la
variable está vacía o ausente, la telemetría DEBE degradar a no-op SIN afectar
el arranque ni el comportamiento de la aplicación. Todo acceso a la API de OTel
DEBE realizarse a través del puerto `Telemetry` de `src/domain/ports/`; el SDK
de OTel PUEDE importarse únicamente en el adapter bajo `src/infrastructure/otel/`.

#### Scenario: Arranque sin endpoint OTLP

- GIVEN `OTEL_EXPORTER_OTLP_ENDPOINT` vacía o no definida
- WHEN se levanta `apps/api` y se llama `GET /health`
- THEN la aplicación arranca y responde 200 sin errores de telemetría (no-op)

#### Scenario: Export OTLP cuando hay endpoint

- GIVEN `OTEL_EXPORTER_OTLP_ENDPOINT` definida con un endpoint válido
- WHEN se levanta `apps/api`
- THEN el exportador OTLP queda configurado apuntando a ese endpoint

#### Scenario: OTel solo tras el puerto Telemetry

- GIVEN el scaffold de `apps/api`
- WHEN se inspeccionan los imports del SDK de OpenTelemetry
- THEN aparecen únicamente bajo `src/infrastructure/otel/`, y `src/domain/`, `src/application/` y `src/http/` consumen la interfaz `Telemetry`

### Requirement: Kysely cableado sin migraciones

`apps/api` DEBE incluir kysely con dialect postgres cableado en un adapter bajo
`src/infrastructure/kysely/`, leyendo la conexión de `DATABASE_URL`, SIN
migraciones ni schema de base de datos (diferidos al primer change de dominio).

#### Scenario: Adapter kysely presente y confinado

- GIVEN el scaffold de `apps/api`
- WHEN se inspecciona `src/infrastructure/kysely/`
- THEN existe el adapter de conexión configurado con dialect postgres y `DATABASE_URL`, y no existen archivos de migración

### Requirement: Smoke test de arranque

`apps/api` DEBE incluir un smoke test ejecutable con `bun test` que verifique el
arranque básico del servidor o del handler de salud sin requerir base de datos
viva ni endpoint OTLP.

#### Scenario: Smoke test verde sin dependencias externas

- GIVEN el workspace instalado, sin postgres levantado y sin endpoint OTLP
- WHEN se ejecuta `bun test` en `apps/api`
- THEN el smoke test pasa

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
