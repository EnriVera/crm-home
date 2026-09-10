# Delta for workspace

> Change: `transactional-email` · Spec canónica: `openspec/specs/workspace/spec.md`.
> Fuente: design D2 (verificación npm bloqueante de `@octanejs/email`,
> `@octanejs/email-cli`, nodemailer) y §6 (Mailpit en docker-compose + Makefile).

## MODIFIED Requirements

### Requirement: Tooling de entorno (docker-compose, .env.example, .gitignore, Makefile)

El repo DEBE incluir: (a) `docker-compose.yml` con servicio `postgres:17-alpine`
y volumen persistente, más un servicio `mailpit` (imagen `axllent/mailpit`
pineada) como servidor SMTP de desarrollo catch-all, con SMTP expuesto en
`:1025` y UI web en `:8025`, configurado para aceptar cualquier credencial en
desarrollo; (b) `.env.example` con `DATABASE_URL`,
`OTEL_EXPORTER_OTLP_ENDPOINT` (vacío → telemetría no-op), puertos de dev y
`SMTP_URL` (documentada como opcional: sin ella el envío de email cae al adapter
consola); (c) `.gitignore` ampliado con `.turbo/`, `dist/`, `.output/`,
`.nitro/`, `.env`, `.env.local` y `*.tsbuildinfo` además de los patrones
existentes; (d) `Makefile` en raíz con targets `dev`, `build`, `test`, `db-up` y
`db-down` que orquesten turbo y docker compose, más un target para levantar
Mailpit de forma independiente (`mail-up`) y un target que levante postgres y
Mailpit juntos. El target `db-up` DEBE seguir levantando únicamente postgres
para no forzar Mailpit en entornos que solo necesitan base de datos.
(Previously: el tooling no incluía servicio SMTP de desarrollo, `SMTP_URL` ni
targets de Mailpit.)

#### Scenario: PostgreSQL de desarrollo levanta vía compose

- GIVEN el repo con `docker-compose.yml` y `.env.example`
- WHEN se ejecuta `docker compose up -d` (o `make db-up`)
- THEN el contenedor `postgres:17-alpine` queda accesible con la `DATABASE_URL` de `.env.example` y sus datos persisten en el volumen declarado

#### Scenario: Mailpit de desarrollo levanta de forma independiente

- GIVEN el repo con el servicio `mailpit` en `docker-compose.yml`
- WHEN se ejecuta `make mail-up`
- THEN Mailpit queda accesible con SMTP en `localhost:1025` y su UI web en
  `http://localhost:8025`, sin requerir que postgres esté levantado

#### Scenario: Artefactos de build no se commitean

- GIVEN el `.gitignore` ampliado
- WHEN se generan `.turbo/`, `dist/`, `.output/`, `.nitro/` o archivos `.env`
- THEN `git status` no los lista como archivos pendientes de commit

### Requirement: Verificación y pinning de versiones (bloqueante)

Antes de commitear cualquier `package.json`, TODAS las dependencias clave DEBEN
tener versión exacta pineada (sin rangos `^`/`~`) tras verificar su existencia y
peer deps en el registry npm. En particular, el scope/nombre y las peer deps de
React de `octanejs`/`tsrx` DEBEN verificarse antes del commit de `apps/web`. Si
`octanejs`/`tsrx` no existe en npm o no resuelve con las peer deps requeridas,
la implementación DEBE detenerse y escalar al usuario antes de sustituir el
stack (la elección de framework es decisión del PRD, no del change). El scaffold
NO DEBE introducir dependencias que requieran compilación nativa (node-gyp). Las
dependencias nuevas de este change (`@octanejs/email`, `@octanejs/email-cli` y
el cliente SMTP elegido) DEBEN pasar la misma verificación bloqueante antes de
commitear los `package.json` que las declaran: existencia en npm, versiones
exactas pineadas, compatibilidad de peer deps con `octane@0.2.3` y con las
versiones de React del workspace, y ausencia de compilación nativa. Si la
verificación falla, la implementación DEBE detenerse y escalar al usuario; la
sustitución del stack (p. ej. fallback a ReactCompat) NUNCA DEBE decidirse por
cuenta propia.
(Previously: la lista de dependencias clave no incluía `@octanejs/email`,
`@octanejs/email-cli` ni un cliente SMTP, y la regla de escalación no nombraba
el fallback ReactCompat.)

#### Scenario: Versiones verificadas y pineadas

- GIVEN la lista de dependencias clave (octanejs/tsrx, nitro, turborepo, orpc, kysely, tailwindcss, vite, i18next)
- WHEN se prepara el commit del scaffold
- THEN cada dependencia existe en npm, sus peer deps son compatibles y su versión aparece exacta (sin rangos) en los `package.json`

#### Scenario: Dependencias de email verificadas antes del commit

- GIVEN el change `transactional-email` en implementación
- WHEN se prepara el commit de los `package.json` de `packages/email` y `apps/api`
- THEN `npm view` confirmó la existencia de `@octanejs/email@0.0.3`,
  `@octanejs/email-cli` y el cliente SMTP elegido, sus peer deps son compatibles
  con `octane@0.2.3` y cada versión aparece exacta (sin rangos) en los
  `package.json`

#### Scenario: Escalación si octanejs no resuelve

- GIVEN que `octanejs`/`tsrx` no existe en npm bajo el nombre/scope esperado o sus peer deps son incompatibles
- WHEN ocurre esta situación durante la implementación
- THEN el trabajo sobre `apps/web` se detiene, se documenta el hallazgo y se escala al usuario sin sustituir el framework por decisión propia

#### Scenario: Escalación si las dependencias de email no resuelven

- GIVEN que `@octanejs/email@0.0.3`, `@octanejs/email-cli` o el cliente SMTP no
  existen en npm o sus peer deps chocan con `octane@0.2.3`
- WHEN ocurre esta situación durante la implementación
- THEN el trabajo se detiene antes de commitear los `package.json` afectados, se
  documenta el hallazgo y se escala al usuario sin sustituir el stack por
  decisión propia
