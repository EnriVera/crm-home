---
type: "Referencia"
title: "Composition root y superficie HTTP"
openwiki_generated: true
verified:
  - by: openwiki/0.7.2
    at: 2026-10-27T02:48:33.191Z
sources:
  - id: openwiki-source-b7f0c55aabfe215527651230
    resource: repo://apps/api/nitro.config.ts
  - id: openwiki-source-22eec4303af9b360c1b1ef10
    resource: repo://apps/api/src/application/health/get-health.ts
  - id: openwiki-source-e08b04ac1998a75cd0afb8ba
    resource: repo://apps/api/src/http/composition-root.ts
  - id: openwiki-source-b58519e27c8cea1e57cc3760
    resource: repo://apps/api/src/http/routes.ts
  - id: openwiki-source-d61034333eb2a7f11cd58981
    resource: repo://apps/api/src/infrastructure/health/static-health-repository.ts
  - id: openwiki-source-a50ebcf8bccf63335286bdf6
    resource: repo://apps/api/tasks/email-sending.ts
generated: { by: "pi", at: "2026-10-27T02:48:33.191Z" }
---


# Composition root y superficie HTTP

`apps/api/src/http/composition-root.ts` es el único archivo del backend donde
se instancia algo concreto. Todo lo demás recibe sus dependencias por
inyección. Eso convierte a este archivo en el mapa real del sistema: leerlo
equivale a leer el diagrama de componentes.

## Arranque

El entry point de nitro es un único handler catch-all:

```ts
handlers: [{ route: "/**", handler: "./src/http/composition-root.ts" }]
```

`composition-root.ts` exporta un `fromWebHandler(createAppFetch())`, que a su
vez construye la app h3 con `createCompositionRoot(env)`. La misma función
sirve para el `nitro dev`, para el build y para el smoke test, porque
`createAppFetch` devuelve un `(request: Request) => Promise<Response>` puro.

## Variables de entorno

El tipo `AppEnv` declara lo que el backend lee:

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | conexión principal a PostgreSQL |
| `TEST_DATABASE_URL` | alternativa usada por tests de integración |
| `SESSION_COOKIE_SECURE` | `"false"` desactiva el flag `secure` de la cookie |
| `SMTP_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` | transporte de email |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | habilita la telemetría (viene de `TelemetryEnv`) |

Además, fuera de `AppEnv`, el proceso lee `EMAIL_DRAIN_LOOP_ENABLED` y
`EMAIL_DRAIN_INTERVAL_MS` para el bucle de drenaje.

## CORS de desarrollo

El primer middleware aplicado es un CORS con orígenes explícitos
(`http://localhost:5173` para `apps/web` y `http://localhost:5174` para
`apps/web-v2`), `credentials: true` y los métodos y headers que el cliente
oRPC necesita.

La lista de orígenes es explícita y no `"*"` a propósito: el cliente oRPC
manda `credentials: 'include'` para enviar la cookie de sesión, y con origen
 comodín el navegador rechaza la respuesta con credenciales. El propio código
deja anotado que en producción esta lista debe reemplazarse por una allowlist
verificada.

## Superficie HTTP

| Ruta | Comportamiento |
| --- | --- |
| `GET /health` | handler h3 nativo que delega en el caso de uso `GetHealth` |
| `ALL /rpc/**` | router oRPC con las ~50 procedures |
| `ALL /rpc/**` (sin base de datos) | responde 503 con `{ "error": "Database not configured" }` |

`GetHealth` depende de un `HealthRepository` cuyo adapter actual es trivial:
responde `ok` sin tocar PostgreSQL, para que el endpoint siga sirviendo
cuando la base no está levantada. El caso de uso abre un span
`http.health`, y devuelve `{ status, timestamp }` con la fecha en ISO 8601.

## Modo degradado sin base de datos

El composition root decide el modo de arranque a partir de
`DATABASE_URL ?? TEST_DATABASE_URL`:

- **Con base de datos**: crea el pool de Kysely, los repositorios, el
  `TransactionManager`, los generadores (IDs UUIDv7, OTP, hashing,
  comparación segura), el reloj del sistema, el renderer de plantillas de
  email y una instancia de cada caso de uso; luego arma el router y monta
  `/rpc/**`.
- **Sin base de datos**: no se crea ningún repositorio ni caso de uso. La app
  igual arranca, expone `GET /health` y responde 503 en todo `/rpc/**`.

Eso permite que el frontend y los tests de humo levanten la API sin
PostgreSQL, y que el diagnóstico de "no puedo llamar a la API" separe
claramente el problema de configuración del problema de lógica.

## Drenaje de emails en proceso

Al final del archivo, y solo si existe `DATABASE_URL` y
`EMAIL_DRAIN_LOOP_ENABLED !== "false"`, arranca un `setInterval` que drena la
cola de emails cada `EMAIL_DRAIN_INTERVAL_MS` (60 s por defecto), con un
primer tick inmediato para no esperar un minuto con la cola llena al arrancar.

El comentario del código explica el porqué: nitro no levanta su scheduler de
tareas en desarrollo, y depender solo de `scheduledTasks` en producción es
frágil. Cada tick recrea la conexión y el sender para que un cambio de
variables de entorno (por ejemplo el host SMTP) aplique sin reiniciar el
proceso.

Consecuencia a tener en cuenta: en producción conviven el task de nitro
(programado cada minuto) y este bucle en proceso, ambos sobre la misma cola
sin mecanismo de reclamo de filas.

## Tareas programadas de nitro

`nitro.config.ts` declara además la tarea `email-sending`, que apunta a
`apps/api/tasks/email-sending.ts` y se programa cada minuto con la expresión
cron `*/1 * * * *`.

## Tests relacionados

- `apps/api/src/http/router.test.ts`: `GET /health` responde 200 con `ok` y
  timestamp, y la telemetría degrada a no-op sin endpoint OTLP.
- `apps/api/src/http/orpc-bridge.test.ts`: el bridge conserva cookies y
  respuesta real.
