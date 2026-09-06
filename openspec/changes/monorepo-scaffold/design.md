# Design — monorepo-scaffold

> Fase design del change SDD `monorepo-scaffold` (CRM-HOME).
> Inputs leídos: `proposal.md`, `explore.md`, `specs/{workspace,api,web}/spec.md`,
> `docs/PRD-v2.md` (§6, §9, §10), `openspec/config.yaml`.
> Delivery: `exception-ok` · review_budget 400 · rama `develop`.

## 1. Resumen ejecutivo

Scaffold aditivo del monorepo: workspace bun + turbo ≥ 2.x, `apps/api`
(nitro + h3 + orpc + kysely + OTel no-op) con clean architecture auditable por
path, `apps/web` (octanejs/tsrx + vite + tailwind v4 + i18next es) con atomic
design y regla de wrappers materializada en `components/vendor/`, y paquetes
compartidos `@crm/tsconfig` y `@crm/types`. Cero lógica de negocio: los únicos
"casos de uso" son el health check y la página de humo, que existen para dar
señal a `bun test` y para fijar las fronteras arquitectónicas desde el PR #1.

## 2. Árbol completo del monorepo

```
crm/
├─ package.json                    # workspaces, packageManager bun@<pin>, scripts → turbo
├─ bun.lock                        # commitado, versiones exactas
├─ turbo.json                      # pipeline: build, dev, test, lint, typecheck
├─ Makefile                        # dev, build, test, db-up, db-down
├─ docker-compose.yml              # postgres:17-alpine + volumen + healthcheck
├─ .env.example                    # DATABASE_URL, OTEL_EXPORTER_OTLP_ENDPOINT (vacío), puertos
├─ .gitignore                      # ampliado (retrocompatible)
├─ commitlint.config.mjs           # sin cambios
├─ .husky/                         # sin cambios
├─ apps/
│  ├─ api/                         # @crm/api
│  │  ├─ package.json
│  │  ├─ tsconfig.json             # extends @crm/tsconfig/server
│  │  ├─ nitro.config.ts
│  │  └─ src/
│  │     ├─ domain/
│  │     │  ├─ README.md           # regla: TS puro, sin imports externos (PRD §10)
│  │     │  └─ ports/
│  │     │     ├─ telemetry.ts     # puerto Telemetry
│  │     │     └─ health-repository.ts
│  │     ├─ application/
│  │     │  └─ health/
│  │     │     └─ get-health.ts    # caso de uso trivial
│  │     ├─ infrastructure/
│  │     │  ├─ otel/
│  │     │  │  ├─ otel-telemetry.ts    # adapter OTel (único import del SDK)
│  │     │  │  └─ noop-telemetry.ts    # degradación sin endpoint
│  │     │  ├─ kysely/
│  │     │  │  └─ database.ts          # createDatabase() lazy, dialect pg, DATABASE_URL
│  │     │  └─ health/
│  │     │     └─ static-health-repository.ts  # adapter trivial del puerto
│  │     └─ http/                  # composition root (único wiring)
│  │        ├─ composition-root.ts
│  │        ├─ router.ts           # orpc router (health) + handler fetch
│  │        ├─ routes.ts           # GET /health (h3) → mismo caso de uso
│  │        └─ router.test.ts      # smoke test
│  └─ web/                         # @crm/web
│     ├─ package.json
│     ├─ tsconfig.json             # extends @crm/tsconfig/web
│     ├─ vite.config.ts
│     ├─ index.html
│     └─ src/
│        ├─ main.tsx               # entry (octanejs/tsrx + router + i18n + tokens)
│        ├─ components/
│        │  ├─ vendor/
│        │  │  ├─ README.md        # regla §9: único import de libs de UI
│        │  │  └─ i18n/
│        │  │     ├─ provider.tsx  # I18nProvider (único import de i18next/react-i18next)
│        │  │     └─ index.ts      # re-export t()/useT
│        │  ├─ atoms/              # (p. ej. heading.tsx, consumen solo vendor/)
│        │  ├─ molecules/
│        │  ├─ organisms/
│        │  ├─ templates/
│        │  ├─ pages/
│        │  │  └─ smoke-page.tsx   # página de humo (textos vía i18n es)
│        │  └─ base-view/
│        │     └─ README.md        # placeholder; BaseView llega con su feature (§9)
│        ├─ routes/                # base tanstack router
│        │  ├─ __root.tsx
│        │  └─ index.tsx           # renderiza pages/smoke-page
│        ├─ lib/
│        │  └─ i18n/
│        │     ├─ config.ts        # init options (es default) — importa SOLO vendor/i18n
│        │     ├─ locales/es.json  # catálogo inicial
│        │     └─ i18n.test.ts     # smoke test (puro, sin DOM)
│        └─ styles/
│           └─ tokens.css          # tokens semánticos claro/oscuro (primary verde, surface, text)
└─ packages/
   ├─ tsconfig/                    # @crm/tsconfig
   │  ├─ package.json
   │  ├─ base.json
   │  ├─ server.json
   │  └─ web.json
   └─ types/                       # @crm/types
      ├─ package.json
      ├─ tsconfig.json
      └─ src/
         ├─ index.ts
         └─ contracts/
            └─ health.ts           # contrato orpc compartido + tipos inferidos
```

## 3. Decisiones

### D1 — Workspace raíz y pipeline turbo

**Decisión:** `package.json` raíz con `workspaces: ["apps/*", "packages/*"]`,
`packageManager: "bun@<versión exacta verificada con`bun --version`>"`, y
scripts `dev|build|test|lint|typecheck` que delegan en `turbo run <task>`.
`typescript` se declara como devDependency propia pineada (exacta, sin `^`),
independiente del `tsc@7.0.2` transitivo de commitlint.

`turbo.json` (sintaxis turbo ≥ 2.x, clave `tasks`):

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build":     { "dependsOn": ["^build"], "outputs": ["dist/**", ".output/**"] },
    "dev":       { "cache": false, "persistent": true },
    "test":      { "dependsOn": ["^build"] },
    "lint":      {},
    "typecheck": { "dependsOn": ["^build"] }
  }
}
```

**Fallback documentado** (en README raíz y comentario en Makefile): si turbo
falla con `bun.lock` (formato texto v2), los mismos scripts se ejecutan con
`bun --filter '@crm/api' run test` / `bun --filter './apps/*' run build`, etc.

**Justificación:** cumple spec workspace; el pin exacto de turbo (≥ 2.x) se
verifica contra npm en implement antes de commitear (actividad bloqueante de
la spec de pinning).

### D2 — Pinning de versiones (política)

**Decisión:** todas las dependencias del scaffold se pinean con versión exacta
(sin `^`/`~`) tras verificación en registry npm durante implement. Lista
objetivo (todas a verificar; ninguna con node-gyp):

| Paquete | Uso | Nota |
| --- | --- | --- |
| `typescript` | workspace | propio, no transitivo |
| `turbo` | pipeline | ≥ 2.x, prebuild linux-x64 |
| `nitro` | api server | ver D3 |
| `h3` | api http | viene con nitro; pin si se importa directo |
| `@orpc/server`, `@orpc/contract` | rpc + contrato | `@orpc/contract` vive en `@crm/types` |
| `kysely`, `pg`, `@types/pg` | db adapter | `pg` es JS puro (sin nativos) |
| `@opentelemetry/api`, `@opentelemetry/sdk-node`, `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/resources`, `@opentelemetry/semantic-conventions` | telemetría | solo importados bajo `infrastructure/otel/` |
| `vite`, `tailwindcss`, `@tailwindcss/vite` | web build | tailwind v4 usa oxide con prebuilds linux-x64 |
| `@fontsource/poppins` | tipografía | pesos 400/500/600/700 |
| `i18next` (+ `react-i18next` si aplica, ver D6) | i18n | es default |
| `@tanstack/react-router` (o variante del meta-framework) | router | ver D6 |
| `octanejs` / `tsrx` | framework web | 🔴 ver D6 |

**Criterio de escalación:** si cualquier dep clave no existe, no resuelve o
exige compilación nativa, se detiene y se escala al usuario (no se sustituyen
piezas del PRD por decisión propia).

### D3 — nitro v3 vs v2 con bun (spike acotado)

**Decisión:** target **nitro v3** (pin exacto de la última release publicada),
con preset/runtime bun. Spike acotado (≤ 30 min) al inicio del commit
`feat(api)`: instalar pin exacto, levantar dev server con una ruta h3
`GET /health`, montar el handler fetch de orpc, y correr `nitro build`.

- **Criterios de aceptación del spike:** dev server arranca bajo bun;
  `GET /health` responde 200; el handler orpc (fetch/h3) se monta; `build`
  produce `.output/` ejecutable con bun.
- **Fallback:** si cualquiera falla, pin exacto de **nitro v2** (línea 2.x
  estable) con la misma estructura de `src/`; orpc soporta fetch/h3 en ambas
  líneas, por lo que el fallback no cambia contratos ni puertos. El resultado
  del spike se documenta en el mensaje del commit `feat(api)`.

**Justificación:** riesgo 🟡 conocido del explore; acotar el spike evita que
la decisión bloquee el change y el fallback preserva toda la arquitectura.

### D4 — Estructura de `apps/api` y composition root

**Decisión:** clean architecture en 4 capas con la frontera auditable por path:

- `src/domain/ports/` define **dos puertos iniciales** (ver §5): `Telemetry` y
  `HealthRepository`. TS puro, sin imports externos. Un `README.md` fija la
  regla §10.
- `src/application/health/get-health.ts`: función/clase `GetHealth` que
  recibe `HealthRepository` + `Telemetry` por inyección y devuelve el payload
  de salud. Depende solo de `domain/`.
- `src/infrastructure/`: único lugar con imports de SDKs.
  - `otel/otel-telemetry.ts`: si `OTEL_EXPORTER_OTLP_ENDPOINT` está definida,
    inicializa `NodeSDK` con exportador OTLP HTTP; si no, **no inicializa el
    SDK** y devuelve `NoopTelemetry`. La selección adapter/noop ocurre en una
    factory `createTelemetry(env)` dentro de `infrastructure/otel/`.
  - `kysely/database.ts`: exporta `createDatabase(url)` (Kysely + PostgresDialect
    de `pg`). **No se instancia en el arranque** (lazy): el scaffold no abre
    conexiones a BD; sin migraciones ni schema (diferido).
  - `health/static-health-repository.ts`: adapter trivial que responde
    `{ status: "ok" }` sin tocar BD (permite health 200 sin postgres vivo).
- `src/http/composition-root.ts`: único wiring — construye telemetry (factory),
  health repository y el caso de uso; expone `createAppFetch()` que monta
  la ruta h3 `GET /health` y el router orpc en `/rpc/*`. nitro.config + entry
  delegan en ese handler.

**Justificación:** el health atraviesa puerto + composition root (scenario de
la spec api) sin requerir BD viva; OTel degradable a no-op sin endpoint
(scenario de spec y PRD §10).

### D5 — Health: doble superficie (h3 + orpc) sobre un único caso de uso

**Decisión:** `GET /health` se implementa como ruta h3 (URL simple para
liveness y para el criterio `curl /health → 200`) **y** como procedimiento
orpc `health` montado en `/rpc/*`, ambos delegando en el mismo `GetHealth` del
composition root. El procedimiento orpc usa el contrato compartido de
`@crm/types`, probando el flujo de tipos api↔web desde el scaffold.

**Justificación:** satisface "vía orpc o ruta h3" con ambas señales a costo
mínimo, sin duplicar lógica (comparten caso de uso).

### D6 — octanejs/tsrx: verificación, pin y escalación (🔴 bloqueante)

**Decisión:** antes de commitear `apps/web/package.json` se ejecuta la
verificación bloqueante:

1. Resolver nombre/scope real en npm (`octanejs`, `tsrx`, posibles scoped).
2. Verificar que el paquete existe, su última versión, y sus peer deps
   (en particular versión de React y de vite).
3. Pinear versión exacta.

**Criterio de escalación (vinculante, de la spec workspace):** si el paquete
no existe bajo ningún nombre/scope razonable, o sus peer deps son
incompatibles con el resto del stack pineado, **se detiene el trabajo sobre
`apps/web`, se documenta el hallazgo en el change y se escala al usuario** sin
sustituir el framework (la elección es decisión del PRD §10).

**Decisiones contingentes a la verificación** (documentadas, no bloquean el
design):

- Si tsrx es React-compatible: router = `@tanstack/react-router`, i18n vía
  `react-i18next` (wrapper en `vendor/i18n/`). Si no lo es, se usa la variante
  equivalente del ecosistema y se ajusta solo `vendor/i18n/` (la regla de
  wrappers absorbe el cambio — de eso se trata §9).
- Estructura de entry (`main.tsx`, `vite.config.ts`) sigue la convención del
  meta-framework verificado.

### D7 — Estructura de `apps/web` y frontera de wrappers

**Decisión:** atomic design completo (`atoms/`, `molecules/`, `organisms/`,
`templates/`, `pages/`) + `base-view/` (placeholder con README; el componente
BaseView real llega con su feature, §9) + `vendor/` con README de la regla y
**un wrapper real desde el scaffold: `vendor/i18n/`** (I18nProvider + `t()`),
porque i18next aparece en la tabla de wrappers del PRD §9 y es necesario para
la página de humo.

**Colocación de i18n:** `src/lib/i18n/` contiene la configuración (idioma
default `es`, catálogo `locales/es.json`) e **importa únicamente
`../components/vendor/i18n`**, nunca `i18next` directamente. Así la regla
"libs de UI solo bajo `vendor/`" se cumple también para i18n y queda
demostrada con un caso real.

**Página de humo:** `pages/smoke-page.tsx` compone al menos un atom y un
molecule (creados en el scaffold, consumiendo solo `vendor/`) y renderiza
textos exclusivamente del catálogo i18n en español. La ruta `routes/index.tsx`
de tanstack router la monta. La tabla canónica de rutas (PRD §7) queda
diferida.

**Tokens:** `styles/tokens.css` define variables CSS semánticas para ambos
temas: `--color-primary-50…900` (verde: claro `#16a34a`, oscuro `#22c55e` como
referencia inicial), `--color-background`, `--color-surface`, `--color-border`,
`--color-text-primary`, `--color-text-secondary`; tema oscuro por clase
`.dark` en `<html>` (estrategia §9). tailwind v4 consume los tokens vía
`@theme`.

### D8 — `@crm/types` y `@crm/tsconfig`

**Decisión:**

- `@crm/types` (`packages/types`): exporta el **contrato orpc mínimo**:
  `healthContract` (procedimiento `health`, input void, output
  `{ status: string; timestamp: string }`, validado con zod vía
  `@orpc/contract`) y los tipos inferidos (`HealthOutput`). Es la única
  dependencia de tipos que web puede compartir con api; `apps/web` nunca
  importa `apps/api/src`.
- `@crm/tsconfig` (`packages/tsconfig`): tres bases —
  - `base.json`: `strict`, `target: ES2022`, `module: ESNext`,
    `moduleResolution: bundler`, `verbatimModuleSyntax`,
    `skipLibCheck: true`, `noUncheckedIndexedAccess: true`.
  - `server.json`: extiende base, `types: ["bun"]` (o `bun-types`), sin DOM.
  - `web.json`: extiende base, `lib: ["ES2022", "DOM", "DOM.Iterable"]`,
    `jsx: react-jsx` (ajustable según D6).

### D9 — Tooling de entorno

**`docker-compose.yml`:**

```yaml
services:
  postgres:
    image: postgres:17-alpine
    container_name: crm-home-postgres
    environment:
      POSTGRES_USER: crm
      POSTGRES_PASSWORD: crm
      POSTGRES_DB: crm_home
    ports:
      - "5432:5432"
    volumes:
      - crm_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U crm -d crm_home"]
      interval: 5s
      timeout: 5s
      retries: 5
volumes:
  crm_pgdata:
```

**`.env.example`:**

```
DATABASE_URL=postgres://crm:crm@localhost:5432/crm_home
OTEL_EXPORTER_OTLP_ENDPOINT=    # vacío → telemetría no-op
API_PORT=3000
WEB_PORT=5173
```

**`.gitignore` (se agregan, sin quitar patrones existentes):** `.turbo/`,
`dist/`, `.output/`, `.nitro/`, `.env`, `.env.local`, `*.tsbuildinfo`.

**`Makefile` (raíz, decisión confirmada según spec):**

```make
dev:      ## turbo run dev
build:    ## turbo run build
test:     ## turbo run test (fallback: bun --filter)
db-up:    ## docker compose up -d postgres (espera healthcheck)
db-down:  ## docker compose down
```

`db-up` corre `docker compose up -d postgres` y un `until docker compose exec
-T postgres pg_isready …` para garantizar disponibilidad antes de devolver.

### D10 — Smoke tests (qué testea cada app)

**Decisión clave:** ambos smoke tests son **puros (sin DOM, sin red, sin BD)**
para que `bun test` ejecutado desde la **raíz** (escenario de la spec
workspace) pase con cero configuración adicional (bun test descubre tests
recursivamente; un test con happy-dom requeriría `bunfig.toml` con preload en
raíz, acoplamiento innecesario en el scaffold).

- **`apps/api`** — `src/http/router.test.ts`: construye el composition root
  con `NoopTelemetry` y `StaticHealthRepository`, obtiene el fetch handler y
  ejecuta `await handler(new Request("http://localhost/health"))`. Asserts:
  status 200, body `{ status: "ok", … }`. También un caso con
  `OTEL_EXPORTER_OTLP_ENDPOINT` ausente verificando que `createTelemetry`
  devuelve el adapter no-op. No requiere postgres ni endpoint OTLP (scenario
  de spec api).
- **`apps/web`** — `src/lib/i18n/i18n.test.ts`: inicializa la config i18n y
  asserta: idioma default `es`, `t("app.title")` (y claves del smoke page)
  devuelven las cadenas del catálogo, y no hay cadenas de UI hardcodeadas en
  inglés en la página de humo (chequeo estático simple de las claves usadas).
  El test de render del componente queda diferido al primer change con
  lógica de UI (donde se configurará entorno DOM por paquete).

### D11 — Orden de commits atómicos (Conventional Commits, en `develop`)

1. **`chore: configura workspace del monorepo (bun workspaces, turbo, compose, env)`**
   — `package.json` raíz, `turbo.json`, `.gitignore`, `.env.example`,
   `docker-compose.yml`, `Makefile`, `packages/tsconfig`. Verde: `bun install`.
2. **`feat(api): scaffold de @crm/api con clean architecture, health y OTel no-op`**
   — `packages/types` + `apps/api`. Verde: `turbo run build test` (o fallback),
   `GET /health` en dev sin OTLP. El mensaje documenta el resultado del spike
   nitro v3/v2 (D3).
3. **`feat(web): scaffold de @crm/web con atomic design, vendor/ e i18n es`**
   — `apps/web`. Verde: `bun test` raíz, dev renderiza la página de humo en
   español. **No se commitea antes de la verificación D6.**

`bun.lock` se actualiza en cada commit (lockfile siempre consistente con el
árbol que commitea). El hook husky+commitlint no se toca.

## 4. Contratos

### 4.1 Puertos del dominio (`apps/api/src/domain/ports/`)

```ts
// telemetry.ts — superficie mínima; métricas/contadores se amplían
// en el change de telemetría (PRD §10).
export type Attributes = Record<string, string | number | boolean>;

export interface SpanHandle {
  setAttribute(key: string, value: string | number | boolean): void;
  recordException(error: unknown): void;
  end(): void;
}

export interface Telemetry {
  startSpan(name: string, attributes?: Attributes): SpanHandle;
  shutdown(): Promise<void>;
}
```

```ts
// health-repository.ts
export interface HealthStatus { status: "ok"; }

export interface HealthRepository {
  check(): Promise<HealthStatus>;
}
```

### 4.2 Contrato orpc compartido (`@crm/types`)

```ts
// packages/types/src/contracts/health.ts
import { oc } from "@orpc/contract";
import { z } from "zod";

export const healthOutputSchema = z.object({
  status: z.literal("ok"),
  timestamp: z.string(), // ISO 8601
});

export const healthContract = oc.output(healthOutputSchema);

export type HealthOutput = z.infer<typeof healthOutputSchema>;
```

### 4.3 Variables de entorno

| Variable | Default (.env.example) | Efecto |
| --- | --- | --- |
| `DATABASE_URL` | `postgres://crm:crm@localhost:5432/crm_home` | leída solo por `createDatabase()` (lazy) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | *(vacío)* | vacío/ausente → `NoopTelemetry` |
| `API_PORT` / `WEB_PORT` | `3000` / `5173` | dev servers |

## 5. Flujo de datos (health)

```
HTTP GET /health
  → nitro (entry) 
  → h3 route (http/routes.ts)
  → compositionRoot.getHealth         (http/composition-root.ts)
      ├─ Telemetry.startSpan("http.health")   (puerto → NoopTelemetry u OtelTelemetry)
      └─ HealthRepository.check()             (puerto → StaticHealthRepository)
  → 200 { status: "ok", timestamp }
```

El procedimiento orpc `health` (`/rpc/*`) sigue el mismo camino usando
`healthContract` de `@crm/types`. El dominio/aplicación nunca ve kysely, h3,
nitro ni el SDK de OTel.

## 6. Cambios de archivos

**Creados:** todo el árbol de §2 (raíz: `turbo.json`, `Makefile`,
`docker-compose.yml`, `.env.example`; `apps/api/**`; `apps/web/**`;
`packages/tsconfig/**`; `packages/types/**`).

**Modificados:** `package.json` raíz (workspaces, packageManager, scripts,
devDeps turbo+typescript), `.gitignore` (patrones añadidos), `bun.lock`
(regenerado).

**Intocados:** `docs/`, `openspec/`, `commitlint.config.mjs`, `.husky/`.

## 7. Verificación y rollout

1. `bun install` limpio con lockfile commitado.
2. `turbo run build` y `turbo run typecheck` verdes (fallback `bun --filter`
   documentado si turbo falla).
3. `bun test` verde desde la raíz (smoke tests D10).
4. `docker compose up -d` → postgres healthy con la `DATABASE_URL` de
   `.env.example`.
5. `apps/api` en dev: `GET /health` → 200 sin `OTEL_EXPORTER_OTLP_ENDPOINT`.
6. `apps/web` en dev: página de humo renderiza textos del catálogo `es`.
7. Auditoría por path: `grep -r "from ['\"](kysely|h3|nitro|@opentelemetry)"`
   bajo `apps/api/src/domain` y `src/application` → cero resultados; imports
   de libs de UI fuera de `apps/web/src/components/vendor/` → cero resultados.
8. Commits D11 en `develop` aceptados por commitlint.

**Rollback:** `git revert` de los 3 commits (todo es aditivo; sin datos ni
migraciones).

## 8. Riesgos

| Riesgo | Nivel | Mitigación en este design |
| --- | --- | --- |
| octanejs/tsrx no existe o peer deps incompatibles | 🔴 | D6: verificación bloqueante + escalación sin sustituir stack |
| nitro v3 incompatible con bun | 🟡 | D3: spike acotado + fallback v2 sin cambiar contratos |
| turbo no parsea `bun.lock` v2 | 🟡 | D1: pin turbo ≥ 2.x + fallback `bun --filter` documentado |
| `bun test` en raíz rompe por tests con DOM | 🟡 | D10: smoke tests puros sin DOM en ambas apps |
| Health dependa de BD viva | 🟢 | D4: `StaticHealthRepository` + kysely lazy (sin conexión al boot) |
| review_budget 400 | 🟢 | exception-ok aceptado; commits atómicos D11 facilitan review |

## 9. Fuera de alcance (reafirmado)

Sin migraciones/schema/seeds, sin auth ni módulos del PRD §8, sin wrappers de
UI reales más allá de `vendor/i18n/`, sin lint de fronteras automatizado (la
regla queda documentada y es auditable por path/grep), sin telemetría frontend
ni deploy/CI.
