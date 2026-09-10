# Explore — transactional-email

> Fase exploratoria (read-only). Intención: fundación de email transaccional —
> plantillas como componentes Octane `.tsrx` vía `@octanejs/email` (v0.0.3, port
> de React Email 6.9.2, `render()` server-side XHTML Transitional) +
> `@octanejs/email-cli` (`octane-email dev` preview / `export`), envío por
> adapter SMTP tras el puerto `EmailSender` existente. SMTP de dev = Mailpit en
> docker-compose (catch-all, UI :8025, SMTP :1025). Primera plantilla: el email
> OTP de auth (hoy logueado a consola por el adapter dev de backend-auth).
>
> Decisiones de producto confirmadas (no re-preguntar):
>
> 1. Las plantillas viven en un NUEVO paquete compartido `packages/email`.
> 2. La cadena de adapters conmuta por env: SMTP si `SMTP_URL` (o equivalente)
>    está definida; adapter consola en caso contrario.

## 1. Pipeline de email existente (`apps/api`)

Todo el flujo actual vive en backend-auth y ya respeta ports & adapters:

- **Puerto** `apps/api/src/domain/ports/email-sender.ts`:
  `EmailMessage { from, to, subject, body }` + `send(message): Promise<void>`.
  `body` es un único `string` plano — NO hay campo `html` ni distinción
  text/html. La spec canónica `api-auth` (Requirement "Puerto EmailSender con
  adapter de desarrollo y task de drenaje") fija la firma
  `send({ from, to, subject, body })`: extenderla (p. ej. `html?`/`text?`)
  exige delta de spec en este change (MODIFIED requirement).
- **Adapter consola** `apps/api/src/infrastructure/email/console-email-sender.ts`:
  `createConsoleEmailSender()` emite `console.info("[Email]", {...})`. Es el
  único adapter; el patrón factory `createX()` es el que debe seguir el
  adapter SMTP y el selector por env.
- **Cola** `email_sending` (migración `001_initial.ts`, líneas 108–123):
  `emse_from/to/subject/body TEXT`, `emse_status pending|sent|failed`,
  `emse_login_id` FK a `login`, índice `(emse_status, emse_created_at)`.
  Repositorio de dominio `EmailSendingRepository`
  (`create/findPending/markSent/markFailed`) + adapter kysely. **El body se
  persiste ya compuesto** — no hay columnas de plantilla/payload.
- **Task de drenaje** `apps/api/tasks/email-sending.ts`: `defineTask` de nitro
  que construye SU PROPIO db + `createConsoleEmailSender()` (no pasa por el
  composition root), drena `findPending(100)`, envía y marca sent/failed.
  Registrada en `apps/api/nitro.config.ts` con cron `*/1 * * * *`. Aquí es
  donde el selector de adapter por env (`SMTP_URL` → SMTP, si no consola)
  debe enchufarse.
- **Composition root** (`apps/api/src/http/composition-root.ts`): NO cablea
  `EmailSender` en absoluto hoy — la task es autónoma. El env `AppEnv` ya
  centraliza `DATABASE_URL`/`OTEL_*`; `SMTP_URL` seguiría ese patrón.

## 2. Flujo OTP y dónde enchufa el render

Flujo actual: `RequestOtp` (`apps/api/src/application/auth/request-otp.ts`)
compone el body inline (`Tu código es ${code}`, subject fijo
`"Tu código de acceso"`) y lo encola vía `EmailSendingRepository.create()` →
task drena → adapter consola.

**El render se enchufa en enqueue-time, no en drain-time.** Razones:

- La aplicación/dominio NO puede importar `@octanejs/email` ni plantillas
  (binding rule: dominio/aplicación solo importa puertos). El render es
  infraestructura → se necesita un puerto nuevo (p. ej. `OtpEmailRenderer` o
  `EmailTemplateRenderer` con `renderOtp({ code }): { subject, html, text }`)
  inyectado en `RequestOtp`, con adapter en `src/infrastructure/email/` que
  renderiza componentes de `@crm/email`.
- Renderizar en drain-time exigiría migración de schema (columnas
  template/payload en `email_sending`); renderizar en enqueue-time funciona
  con el schema actual (HTML persistido en `emse_body`).
- El código OTP vive solo en `RequestOtp` (además del hash en `login`);
  la task no tiene acceso a los props — refuerza enqueue-time.

Consecuencia sobre el puerto: el HTML viaja en `EmailMessage.body` (opción de
mínima fricción) o se extiende el mensaje con `html?` + `text?` (fallback de
texto plano es buena práctica de email). Decisión de design con delta de spec
`api-auth`.

## 3. Convenciones de `packages/*` para `packages/email`

- Workspaces raíz: `"workspaces": ["apps/*", "packages/*"]` — `packages/email`
  queda incluido automáticamente; turbo lo recoge en `build/test/lint/
  typecheck` (turbo.json: `test`/`typecheck` dependen de `^build`).
- Modelo a espejar `packages/types` (`@crm/types`): `private: true`,
  `"type": "module"`, exports a fuente (`".": "./src/index.ts"` — sin dist),
  scripts `build/lint/typecheck: tsc -p tsconfig.json`, `test` con `bun test`
  o placeholder, deps del monorepo con `workspace:*`.
- Bases tsconfig (`@crm/tsconfig`): `base.json` = strict, ES2022, ESNext,
  `moduleResolution: bundler`, `verbatimModuleSyntax`, `noEmit`. `server.json`
  añade `types: ["bun"]`. `packages/email` probablemente extienda `server`
  (render server-side) o `base`.
- **Diferencia clave**: `.tsrx` no compila con `tsc` plano. `apps/web`
  typecheckea con `tsrx-tsc --noEmit` (devDep `@tsrx/typescript-plugin`) y
  bundla con `@octanejs/vite-plugin`. `packages/email` necesitará tooling tsrx
  propio (tsrx-tsc para lint/typecheck) y una estrategia de compilación para
  consumo server (ver §5).
- **Pinning bloqueante** (spec `workspace`, Requirement "Verificación y
  pinning de versiones"): TODA dependencia nueva debe tener versión exacta
  verificada en npm (existencia + peer deps) antes de commitear
  `package.json`. `@octanejs/email@0.0.3` y `@octanejs/email-cli` NO están en
  `node_modules` hoy (no instalados) y no se pudieron verificar offline →
  verificación obligatoria en implement; si no resuelven, escalar (la spec
  prohíbe sustituir stack por decisión propia). Prohibido node-gyp.

## 4. docker-compose / tooling dev

- `docker-compose.yml`: un solo servicio `postgres` (postgres:17-alpine,
  healthcheck, volumen `crm_pgdata`). Mailpit sería el segundo servicio
  (imagen `axllent/mailpit`, puertos `1025:1025` SMTP / `8025:8025` UI).
- `Makefile`: `db-up` solo levanta `postgres` (`docker compose up -d postgres`
  - wait healthy) — evaluar si Mailpit entra en `db-up` o en target propio
  (`mail-up` / incluirlo en el wait). `db-down` usa `compose down` (cubre
  ambos).
- `.env.example` (no leído por política de acceso; la spec `workspace` exige
  que declare `DATABASE_URL`, `OTEL_EXPORTER_OTLP_ENDPOINT` y puertos dev) →
  añadir `SMTP_URL` (vacío = adapter consola, apuntando a
  `smtp://localhost:1025` para Mailpit).

## 5. Restricciones de render `@octanejs/email` bajo bun/nitro

- **Octane 0.2.3 ya es el framework del repo** (apps/web). El paquete `octane`
  publica APIs de server-render: `renderToString` / `renderToStaticMarkup` /
  `renderToReadableStream` vía subpath `octane/server`, y `prerender`
  (await-everything) vía `octane/static` — base plausible sobre la que
  `@octanejs/email` implementa su `render()`. `engines: node >=22.22.2` en
  `octane` (el repo corre bun; los paquetes `@octanejs/*` ya adoptados
  funcionan, pero el render server-side directo bajo bun requiere smoke test).
- **Carga de `.tsrx` en servidor**: `octane/dist/compiler/register.js`
  documenta explícitamente soporte para entry points **Node o Bun**: compila
  `.tsrx`/`.tsx` on-the-fly y resuelve imports de `octane` a `octane/server`.
  Es el mecanismo candidato para que la API consuma plantillas de
  `packages/email` sin pipeline vite. **Riesgo**: la task de nitro se bundla
  con el build de nitro — un import de `.tsrx` dentro del bundle de nitro
  probablemente falle salvo que las plantillas vengan precompiladas o se
  externalicen. Alternativas para design: (a) `octane/compiler/register` en el
  entry de nitro, (b) precompilar `packages/email` a JS en su script `build`
  (tsrx-tsc emit / octane compiler bundler) y exportar JS compilado (encaja
  con turbo `^build`), (c) híbrido dev/register + build/precompilado.
- **email-cli**: `octane-email dev` (preview server) y `export` (HTML estático)
  son el workflow de autoría en `packages/email`. El export sirve para tests
  golden/snapshot de la plantilla OTP, pero los props dinámicos (código)
  exigen `render()` en runtime igualmente. Detalles de flags/config no
  verificables offline → validar tras `npm view`.
- Componentes Tailwind/Markdown del port React Email: sin evidencia local;
  asumir subconjunto y validar en implement (la plantilla OTP es simple:
  texto + código destacado — bajo riesgo de features exóticas).

## 6. Cliente SMTP bajo bun 1.4 + nitro v3

- **No hay ninguna librería SMTP en el repo** (grep `SMTP|nodemailer|Mailpit`
  → cero resultados fuera de archivados). Bun no expone API SMTP nativa.
- **nodemailer** es el default pragmático: JS puro (sin node-gyp ✓), usa
  `node:net`/`node:tls`/`node:crypto` — APIs soportadas por bun, pero la
  compatibilidad exacta bajo bun 1.4 + dentro del bundle de nitro v3 debe
  verificarse (engines, ESM/CJS interop — el repo es `"type": "module"` con
  `verbatimModuleSyntax`). Verificación npm + smoke test obligatorios.
- Alternativa: cliente SMTP mínimo sobre `Bun.connect`/TLS — código propio a
  mantener; solo si nodemailer falla la verificación.
- Selector por env (decisión 2): factory `createEmailSender(env)` en
  `src/infrastructure/email/` que devuelve adapter SMTP si `SMTP_URL` presente,
  consola si no; consumida por la task de drenaje (y exportada para futuro
  wiring en composition root). Mantener PII fuera de telemetría (regla PRD
  §9: nunca emails en spans/atributos).

## 7. Constraints canónicas (openspec)

- `openspec/config.yaml`: `strict_tdd: true` (única excepción:
  monorepo-scaffold). Este change tiene lógica (selector de adapter, puerto de
  render, adapter SMTP) → **ciclo red-green obligatorio**; `bun test` verde en
  raíz como gate de verify.
- Specs en español; `language_ui: es` — copy del email OTP en español (hoy:
  "Tu código de acceso" / "Tu código es …").
- Binding rules: dominio/aplicación sin imports de SDKs (`@octanejs/email`,
  nodemailer solo en `infrastructure/email/` y `packages/email`).
- Spec `api-auth` Requirement 7 fija firma del puerto + adapter dev + task:
  este change la MODIFICA (adapter SMTP + selector) y posiblemente la firma
  del mensaje → delta explícito con scenarios actualizados ("Proveedor real
  enchufable sin tocar dominio" se vuelve real, no hipotético).
- Spec `workspace`: pinning verificado, fallback `bun --filter` documentado,
  bun test verde en raíz.
- Estrategia de tests existente a preservar: unit-first sin postgres; los
  tests del selector/factory deben correr sin SMTP vivo (fakes/inyección);
  integración con Mailpit quedaría opt-in (patrón de los `*.integration.test`
  kysely).

## 8. Riesgos

- **Verificación npm bloqueante**: `@octanejs/email@0.0.3` y
  `@octanejs/email-cli` no instalados ni verificables offline; si no existen
  o sus peer deps chocan con `octane@0.2.3`, la spec `workspace` exige
  detenerse y escalar.
- **`.tsrx` dentro del bundle de nitro** (riesgo técnico principal): importar
  plantillas `.tsrx` desde la task/adapter bundlado por nitro no está probado;
  las opciones (register runtime vs precompilado en `packages/email`) cambian
  la topología del paquete → decidir en design con spike/smoke test temprano.
- **Firma del puerto**: extender `EmailMessage` toca spec canónica `api-auth`
  y el adapter consola existente; no hacerlo (HTML en `body`) deja al adapter
  SMTP adivinando content-type y pierde fallback texto plano.
- **Compatibilidad nodemailer×bun×nitro**: no verificada; incluir smoke test
  antes de comprometer el adapter.
- **Review budget (400 líneas)**: paquete nuevo + tooling tsrx + puerto y
  adapter de render + adapter SMTP + selector + compose + plantilla OTP +
  tests ≈ probablemente cerca/sobre el presupuesto → decisión de delivery en
  plan/apply vía `ask-on-risk` (NO asumir chain ni exception ahora).
- **Puertos locales**: 1025/8025 pueden colisionar en máquinas dev; documentar
  en `.env.example`/README.

## 9. Skill resolution

`none` — exploración read-only de repo; no se inyectaron paths de skills por
el padre y ninguna skill especializada era requerida para esta fase.
