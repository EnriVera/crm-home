# Diseño — transactional-email

> Fundación de email transaccional. Resuelve los flags de diseño D1–D6, define el
> layout de `packages/email`, el delta MODIFIED sobre `api-auth` req 7, el
> contrato del renderer, el adapter SMTP y el selector por env, Mailpit en
> docker-compose y la estrategia de tests TDD.

## 1. Resumen ejecutivo

- Se crea `packages/email` (`@crm/email`) con la plantilla OTP como componente
  `.tsrx` y scripts de compilación/export.
- Se añade el puerto `EmailTemplateRenderer` en dominio; `RequestOtp` renderiza
  en enqueue-time y persiste el HTML en `email_sending.emse_body` (sin migración
  de schema).
- Se extiende `EmailMessage` con campos opcionales `html?` y `text?` (delta
  MODIFIED sobre `api-auth` req 7). El adapter consola sigue funcionando sin
  cambios.
- Se implementa `createSmtpEmailSender` (nodemailer, versión exacta por
  verificar) y `createEmailSender(env)` para conmutar consola/SMTP según
  `SMTP_URL`.
- El selector se consume desde la task de drenaje `apps/api/tasks/email-sending.ts`.
- Mailpit se añade a `docker-compose.yml` (SMTP `:1025`, UI `:8025`) y al
  `Makefile` como target independiente.
- Tests: unit-first sin postgres/SMTP vivo; snapshot de plantilla con render real;
  integración Mailpit opt-in.

## 2. Decisiones de diseño

### D1 — Consumo de `.tsrx` bajo nitro v3

**Estrategia primaria: precompilar `packages/email` a JS exportable.**

- `packages/email` expondrá su build entrypoint en `dist/index.js` (o equivalente
  del compiler Octane) y `package.json` apuntará a ese artifact.
- El script `build` del paquete invocará el compiler/tsrx bundler de Octane para
  transformar `.tsrx` → `.js`. Las flags exactas se validan en el spike de
  apply; el diseño asume que el compiler puede emitir módulos ESM compatibles
  con Bun.
- `turbo.json` ya hace que `test`/`typecheck` dependan de `^build`, por lo que
  `apps/api` consumirá el artifact precompilado antes de correr tests o arrancar.
- Ventaja: evita importar archivos `.tsrx` dentro del bundle de nitro (la task
  de drenaje se bundla con nitro build); se alinea con la arquitectura de
  packages existentes (`@crm/types` exporta fuente, `@crm/email` exportará
  artifact compilado por necesidad del formato).

**Fallback: `octane/compiler/register` en runtime.**

- Si el spike demuestra que el precompile no emite módulos usables o rompe el
  flujo de dev, se registrará `octane/compiler/register` en el entrypoint de
  la task de drenaje (o nitro config `externals`) para compilar `.tsrx`
  on-the-fly.
- Riesgo: dentro del bundle de nitro v3 el register puede no resolverse
  correctamente; por eso es fallback, no primaria.
- Si ambas estrategias fallan, se detiene y escala (spec `workspace`).

**Spike en apply (primera tarea):**

1. `npm view @octanejs/email@0.0.3 @octanejs/email-cli` (D2).
2. Crear `packages/email/src/templates/otp-email.tsrx` mínimo.
3. Probar `packages/email` build → importar desde un script Bun en `apps/api`.
4. Probar la task de drenaje de nitro consumiendo el template precompilado.
5. Solo si el spike pasa, continuar con el resto de la implementación.

### D2 — Verificación npm de `@octanejs/email` + `@octanejs/email-cli`

**Procedimiento bloqueante (antes de tocar `package.json` de producción):**

```bash
npm view @octanejs/email@0.0.3
npm view @octanejs/email-cli@<latest-or-exact>
npm view octane@0.2.3 peerDependencies
npm view nodemailer versions --json
```

- Confirmar que existen los paquetes, sus peer deps son compatibles con
  `octane@0.2.3` y las versiones de React que usa `apps/web`.
- Si hay conflicto de peer deps, detener y escalar (spec `workspace`). No se
  sustituye el stack por decisión propia.

**Plan de instalación:**

- `@octanejs/email@0.0.3` → `dependencies` de `packages/email` (versión exacta).
- `@octanejs/email-cli@<exact>` → `devDependencies` de `packages/email`.
- `nodemailer@<exact>` → `dependencies` de `apps/api` (versión exacta tras
  verificación).
- `@types/nodemailer@<exact>` → `devDependencies` de `apps/api`.
- `bunfig.toml` usa `linker = "hoisted"`, por tanto `bun install` desde raíz
  levantará las dependencias al root `node_modules` compartido.

### D3 — Delta MODIFIED sobre `api-auth` req 7 (firma de `EmailMessage`)

**Cambio canónico:**

```ts
export interface EmailMessage {
  from: string;
  to: string;
  subject: string;
  body: string;      // contenido principal persistido (HTML en este change)
  html?: string;     // cuando está presente, el adapter SMTP lo envía como text/html
  text?: string;     // alternativa en texto plano (opcional)
}
```

- `body` sigue siendo obligatorio y conserva el comportamiento actual del
  adapter consola (se loguea tal cual). Esto mantiene compatibilidad hacia
  atrás con cualquier caller existente.
- `html` es una señal explícita para el adapter SMTP: si está presente, se envía
  como cuerpo `text/html`; de lo contrario `body` se envía como `text/plain`.
- `text` habilita multipart alternative para futuros templates; en el MVP OTP
  puede quedar vacío porque el schema `email_sending` solo almacena una columna
  (`emse_body`).

**Adapter consola:** sin cambios. Loguea `body` (que en este change contendrá
HTML; es aceptable para dev).

**Adapter SMTP:** usa `message.html ?? message.body` para la parte HTML; si
`message.text` existe, la añade como alternativa `text/plain`.

**Escenarios actualizados en la spec:**

- "OTP encolado drenado por la task en dev" → el adapter consola sigue emitiendo
  destinatario, asunto y cuerpo.
- "Proveedor real enchufable sin tocar dominio" → se añade adapter SMTP y el
  selector; dominio/aplicación siguen sin importar adapters.
- Nuevo scenario: "Email OTP se envía como HTML cuando SMTP está configurado".

### D4 — Contrato del puerto de render

**Ubicación:** `apps/api/src/domain/ports/email-template-renderer.ts`

**Contrato:**

```ts
export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface EmailTemplateRenderer {
  renderOtp(input: { code: string }): Promise<RenderedEmail>;
}
```

- El nombre `EmailTemplateRenderer` deja lista la extensión futura
  (`renderWelcome`, `renderInvoice`, etc.) sin crear un puerto por template.
- `RequestOtp` recibe `emailTemplateRenderer` en sus dependencias.
- `RequestOtp` invoca `renderOtp({ code })` y persiste `html` en
  `EmailSending.body`; `subject` se usa para `emse_subject`.

**Adapter:** `apps/api/src/infrastructure/email/octane-email-template-renderer.ts`

- Importa el componente `OtpEmail` desde `@crm/email`.
- Llama a `render()` de `@octanejs/email` para obtener HTML.
- Genera `text` a partir del mismo copy (versión sin markup).

**Copy OTP en español:**

- `subject`: `"Tu código de acceso"`.
- `html`: título "Tu código de acceso", párrafo "Ingresá el siguiente código para
  continuar:", código destacado, disclaimer "Si no lo solicitaste, ignorá este
  mensaje.".
- `text`: `"Tu código de acceso es ${code}. Si no lo solicitaste, ignorá este mensaje."`.

### D5 — Cliente SMTP y contrato de env

**Cliente:** nodemailer (candidato principal). Versión exacta se pinnea tras
`npm view nodemailer versions --json` (ej. `6.10.1` si es la última estable al
momento de apply). Es JS puro, sin node-gyp.

**Contrato de env:**

```ts
export interface SmtpEnv {
  SMTP_URL?: string;
  // fallback discreto (usado solo si SMTP_URL no está presente o es inválida)
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_SECURE?: string; // "true" para TLS directo (puerto 465)
}
```

- Primaria: `SMTP_URL` (ej. `smtp://localhost:1025`).
- Si `SMTP_URL` no está definida, se intenta construir la configuración desde las
  variables discretas. Si tampoco hay configuración, el selector cae al adapter
  consola.

**Comportamiento del adapter:**

- `pool: true` para reutilizar conexiones dentro de la task de drenaje.
- Límites conservadores: `maxConnections: 2`, `maxMessages: 50` (ajustables).
- Timeouts: `connectionTimeout: 5000`, `greetingTimeout: 5000`,
  `socketTimeout: 10000`.
- `from` por defecto: `"auth@crmhome.app"` (mismo valor usado por `RequestOtp`;
  configurable vía `DEFAULT_FROM_EMAIL` si se decide en apply).

**Mapeo de errores y semántica de reintento:**

```ts
export class EmailSendError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean,
    public readonly cause?: unknown,
  ) {
    super(message);
  }
}
```

- Retryable (`retryable: true`): errores de red/conn (`ECONNREFUSED`,
  `ETIMEDOUT`, `ENOTFOUND`), respuestas SMTP 4xx, errores de autenticación
  transitorios.
- No retryable (`retryable: false`): respuestas SMTP 5xx permanentes, destino
  inválido, errores de configuración irrecuperables.

**Task de drenaje:**

- Si `send` lanza `EmailSendError` con `retryable === true`, el mensaje se deja
  en estado `pending` (no se marca `sent` ni `failed`). Será reintentado en la
  próxima ejecución del cron.
- Si `retryable === false`, se marca `failed`.
- Para cualquier otro error, se marca `failed`.
- *Limitación conocida:* no hay contador de reintentos ni backoff porque el
  schema `email_sending` no tiene columna de retries; esto es aceptado para el
  MVP y documentado como mejora futura.

**Smoke test:** antes de comprometer el adapter, ejecutar un script que envíe
un email vía `smtp://localhost:1025` con Mailpit levantado y verificar que la
UI de Mailpit (:8025) lo muestra.

### D6 — Selector de adapter y punto de inyección

**Ubicación:** `apps/api/src/infrastructure/email/create-email-sender.ts`

**Firma:**

```ts
export interface EmailSenderEnv {
  SMTP_URL?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_SECURE?: string;
}

export function createEmailSender(env: EmailSenderEnv): EmailSender {
  if (env.SMTP_URL?.trim()) {
    return createSmtpEmailSender({ config: parseSmtpUrl(env.SMTP_URL) });
  }
  // Podría añadirse fallback a variables discretas aquí; para el MVP, ausencia
  // de SMTP_URL → consola.
  return createConsoleEmailSender();
}
```

**Punto de consumo:** `apps/api/tasks/email-sending.ts` reemplaza la línea
`createConsoleEmailSender()` por `createEmailSender(process.env)`.

**Composition root:** `AppEnv` en `apps/api/src/http/composition-root.ts` se
extiende con `SMTP_URL?: string` (y variables discretas si se usan). Aunque el
envío síncrono no se cablea hoy, el tipo queda listo para un futuro wiring.

**Regla PII:** ni `to`, ni `subject`, ni `body` se incluyen en spans ni
atributos de telemetría (PRD §9). El adapter SMTP solo loguea IDs internos y
errores agregados.

## 3. Layout de archivos

```
packages/email/
  package.json                 # @crm/email, private, type: module
  tsconfig.json                # extiende @crm/tsconfig/base.json (+ compiler tsrx)
  src/
    index.ts                   # re-exporta OtpEmail
    templates/
      otp-email.tsrx           # componente OTP
      otp-email.test.ts        # snapshot del render
    static/                    # logos/assets futuros (vacío en MVP)
  scripts/
    export-templates.ts        # opcional: wrapper sobre octane-email export

apps/api/src/domain/ports/
  email-template-renderer.ts   # nuevo puerto D4
  email-sender.ts              # MODIFIED: html?/text?

apps/api/src/infrastructure/email/
  console-email-sender.ts      # sin cambios
  create-email-sender.ts       # selector D6
  smtp-email-sender.ts         # adapter SMTP D5
  octane-email-template-renderer.ts  # adapter renderer D4
  email-send-error.ts          # error con retryable
  parse-smtp-url.ts            # parser de SMTP_URL
  create-email-sender.test.ts
  smtp-email-sender.test.ts
  octane-email-template-renderer.test.ts

apps/api/src/application/auth/
  request-otp.ts               # inyecta EmailTemplateRenderer
  request-otp.test.ts          # actualizado con fake renderer

apps/api/src/http/
  composition-root.ts          # AppEnv + SMTP_URL; wiring renderer

apps/api/tasks/
  email-sending.ts             # usa createEmailSender(env)

docker-compose.yml             # + servicio mailpit
Makefile                       # + mail-up / up
docs/... o .env.example        # SMTP_URL (documentar)
```

## 4. Contratos y flujo de datos

### Flujo OTP (enqueue-time)

```
Usuario → requestOtp RPC
  → RequestOtp.execute({ email })
    → rate-limit, create login
    → emailTemplateRenderer.renderOtp({ code })
      → Octane adapter → @octanejs/email render(OtpEmail)
      → { subject, html, text }
    → emailSendingRepository.create({
        from: "auth@crmhome.app",
        to: email,
        subject: rendered.subject,
        body: rendered.html,   // HTML persistido en emse_body
        loginId,
        status: "pending",
        createdAt,
      })
```

### Flujo de drenaje

```
Task nitro email-sending
  → createEmailSender(process.env)
    → SMTP si SMTP_URL; sino consola
  → repository.findPending(100)
  → sender.send({ from, to, subject, body, html: body })
    → Consola: loguea body
    → SMTP: envía html como text/html
  → markSent(id) o markFailed(id) / dejar pending según retryable
```

## 5. Delta sobre specs

### `openspec/specs/api-auth/spec.md` — Requirement 7 MODIFIED

Reemplazar el requirement actual por:

```markdown
### Requirement: Puerto EmailSender con adapters consola/SMTP y task de drenaje

El envío de emails DEBE realizarse tras el puerto de dominio `EmailSender`
(`send({ from, to, subject, body, html?, text? })`). DEBE existir un adapter de
consola para desarrollo y un adapter SMTP para entornos con `SMTP_URL`
configurada, seleccionados automáticamente por una factory sin tocar el dominio.
La task de nitro DEBE drenar periódicamente los registros pendientes de
`email_sending`, invocar el puerto y marcar cada mensaje como enviado o fallido.
Los errores transitorios del adapter SMTP DEBEN dejar el mensaje pendiente para
reintento; los errores permanentes DEBEN marcarlo como fallido.

#### Scenario: OTP encolado drenado por la task en dev

- GIVEN un registro pendiente en `email_sending` generado por `requestOtp`
- WHEN corre la task de drenaje sin `SMTP_URL`
- THEN el adapter consola emite el email (destinatario, asunto y cuerpo) y el
  registro queda marcado como enviado

#### Scenario: OTP enviado por SMTP con Mailpit

- GIVEN un registro pendiente en `email_sending` y `SMTP_URL=smtp://localhost:1025`
- WHEN corre la task de drenaje y Mailpit está levantado
- THEN el adapter SMTP entrega el mensaje y el registro queda marcado como
  enviado

#### Scenario: Proveedor real enchufable sin tocar dominio

- GIVEN el puerto `EmailSender`
- WHEN se inspeccionan los casos de uso y la task
- THEN dependen de la interfaz del puerto y ningún archivo de dominio/aplicación
  importa el adapter concreto

#### Scenario: Fallback a consola sin SMTP_URL

- GIVEN un entorno sin `SMTP_URL`
- WHEN se invoca `createEmailSender(env)`
- THEN devuelve el adapter consola y el flujo OTP sigue funcionando
```

## 6. Docker-compose y Makefile

### `docker-compose.yml`

Añadir servicio `mailpit`:

```yaml
  mailpit:
    image: axllent/mailpit:latest
    container_name: crm-home-mailpit
    ports:
      - "1025:1025"
      - "8025:8025"
    environment:
      MP_SMTP_AUTH_ACCEPT_ANY: 1
      MP_SMTP_AUTH_ALLOW_INSECURE: 1
```

Nota: `axllent/mailpit:latest` se pinnea a digest exacto en apply tras pull.

### `Makefile`

Añadir targets:

```makefile
mail-up: ## Levanta Mailpit (SMTP :1025, UI :8025)
 docker compose up -d mailpit
 @echo "Mailpit listo en http://localhost:8025 (SMTP localhost:1025)"

up: ## Levanta postgres + mailpit
 docker compose up -d
 @until docker compose exec -T postgres pg_isready -U crm -d crm_home > /dev/null 2>&1; do echo "Esperando a postgres..."; sleep 2; done
 @echo "postgres listo en localhost:5432"
 @echo "Mailpit listo en http://localhost:8025"
```

Mantener `db-up` levantando solo `postgres` para no forzar Mailpit en entornos
que solo necesitan base de datos.

## 7. Estrategia de tests (strict TDD)

### Unitarios (obligatorios, sin postgres ni SMTP vivo)

1. **`create-email-sender.test.ts`**
   - Sin `SMTP_URL` → consola.
   - Con `SMTP_URL` → SMTP.
   - Con `SMTP_URL=""` (vacío) → consola.

2. **`smtp-email-sender.test.ts`**
   - Inyectar un transporte nodemailer fake (objeto con `sendMail`).
   - Enviar mensaje con `html` y verificar que `sendMail` recibe `html` y
     `text` cuando aplica.
   - Error retryable → lanza `EmailSendError({ retryable: true })`.
   - Error no retryable → lanza `EmailSendError({ retryable: false })`.

3. **`octane-email-template-renderer.test.ts`**
   - Usar un fake de `render()` para probar que el adapter pasa el `code` al
     template y devuelve `{ subject, html, text }`.
   - Test separado con render real de `@octanejs/email` (ver §7.2).

4. **`request-otp.test.ts`** (actualizado)
   - Inyectar `FakeEmailTemplateRenderer`.
   - Verificar que el email encolado tiene `body === rendered.html` y
     `subject === rendered.subject`.

5. **`packages/email/src/templates/otp-email.test.ts`**
   - Renderizar con `render(OtpEmail({ code: "041283" }))`.
   - Snapshot del HTML (golden) para detectar regresiones visuales/copy.

### Integración opt-in (`*.integration.test.ts`)

- **`smtp-email-sender.integration.test.ts`**: requiere Mailpit levantado y
  `SMTP_URL` apuntando a `localhost:1025` (o variable `TEST_SMTP_URL`). Se salta
  automáticamente si no hay config.
- **`auth-email.integration.test.ts`** (opcional): llama al endpoint `requestOtp`,
  fuerza la task de drenaje y verifica que el email llega a Mailpit. Skip si no
  hay base de datos ni SMTP.

### Orden TDD

1. Escribir test del selector → implementar selector.
2. Escribir test del renderer port con fake → implementar port + fake.
3. Escribir test de `RequestOtp` usando renderer → actualizar `RequestOtp`.
4. Escribir test del SMTP adapter con transporte inyectado → implementar adapter.
5. Escribir snapshot de plantilla → implementar `.tsrx`.
6. Spike de consumo bajo nitro → ajustar build de `packages/email`.
7. Integración Mailpit al final.

## 8. Plan de aplicación resumido (para fase tasks)

1. Spike D1/D2: verificar npm y consumo de `.tsrx` bajo Bun/nitro.
2. Crear `packages/email` con plantilla OTP y scripts build/test/typecheck.
3. Extender `EmailMessage` + actualizar spec `api-auth` req 7 (MODIFIED).
4. Crear puerto `EmailTemplateRenderer`, adapter Octane y wiring en
   `composition-root.ts`.
5. Actualizar `RequestOtp` para usar renderer.
6. Implementar adapter SMTP, error mapping, parser de URL.
7. Implementar selector `createEmailSender` y actualizar task de drenaje.
8. Añadir Mailpit a `docker-compose.yml` y targets al `Makefile`.
9. Tests unitarios y snapshot.
10. Smoke test e integración Mailpit.
11. Verificar `bun test` verde en raíz y revisar presupuesto de líneas.

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Verificación npm falla (D2) | Detener y escalar antes de commitear `package.json`. |
| `.tsrx` no precompila o no carga en nitro (D1) | Spike primero; fallback runtime register; escalar si ambos fallan. |
| nodemailer incompatible con Bun/nitro | Smoke test antes de comprometer; alternativa de último recurso: cliente SMTP mínimo sobre `Bun.connect`/TLS. |
| Delta de spec `api-auth` req 7 | Escribir escenarios actualizados; mantener `body` obligatorio para compatibilidad. |
| Review budget > 400 líneas | En plan/apply evaluar split (renderer+packages/email vs adapters+compose) vía `ask-on-risk`. |
| Retry sin contador | Documentar limitación; no bloquea MVP. |
| Puertos 1025/8025 ocupados | Documentar en Makefile/.env.example que son configurables vía compose override. |

## 10. Skill resolution

`none` — fase de diseño sobre artefactos ya explorados; no se inyectaron paths
de skills por el padre y ninguna skill especializada era requerida.
