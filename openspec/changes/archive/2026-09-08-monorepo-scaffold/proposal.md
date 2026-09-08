# Proposal — monorepo-scaffold

> Change SDD: `monorepo-scaffold` (CRM-HOME)
> Estado: proposal · Artifact store: openspec · Execution: auto
> Delivery: `exception-ok` (size:exception aceptado explícitamente por el usuario)
> Fuentes vinculantes: `docs/PRD-v2.md` (§6, §9, §10), `PRODUCT.md`, `openspec/config.yaml`, `explore.md`

## 1. Intent (intención)

Crear el scaffold inicial del monorepo CRM-HOME, listo para que los changes de
features (auth, tareas, finanzas) arranquen sobre una base que **materialice las
reglas arquitectónicas vinculantes desde el PR #1**:

- Ports & adapters en backend (el dominio no importa kysely/h3/nitro/SDK externos).
- Wrappers de librerías en frontend (`components/vendor/` como único punto de
  import de libs de UI).
- i18next con español por defecto desde el día uno.
- Telemetría OTel vendor-neutral, degradable a no-op sin endpoint OTLP.

Este change es **infraestructura**: no abre decisiones de producto (confirmado en
el handoff pre-proposal). La excepción TDD ya está aprobada en
`testing.tdd_exceptions` (config sin lógica de negocio); igualmente se incluyen
smoke tests de arranque para que `verify` tenga señal (`bun test` verde en raíz).

## 2. Alcance

### 2.1 Workspace raíz

- `package.json` raíz: workspaces `apps/*` + `packages/*`, `packageManager: bun@<pin>`,
  scripts que delegan en turbo (`dev`, `build`, `test`, `lint`, `typecheck`).
- `turbo.json` con pipeline: `build`, `dev`, `test`, `lint`, `typecheck`
  (turbo ≥ 2.x compatible con bun; fallback documentado: `bun --filter`).
- `.gitignore` ampliado: `.turbo/`, `dist/`, `.output/`, `.nitro/`, `.env`,
  `.env.local`, `*.tsbuildinfo` (además de lo existente).
- `.env.example`: `DATABASE_URL`, `OTEL_EXPORTER_OTLP_ENDPOINT` (vacío → no-op),
  puertos de dev.
- `docker-compose.yml`: `postgres:17-alpine` con volumen persistente (🔴 no hay
  servidor PostgreSQL local — hallazgo explore; es tooling base PRD §10, no se
  difiere).
- `Makefile` en raíz: targets `dev`, `build`, `test`, `db-up`, `db-down`
  (orquesta turbo + docker compose).
- TypeScript declarado como dependencia propia (no depender del `tsc@7.0.2`
  transitivo de commitlint).

### 2.2 `apps/api` — `@crm/api` (nitro + h3 + orpc + kysely)

Estructura clean architecture que hace la regla auditable por path:

```
src/
├─ domain/          # entidades + puertos (TS puro, SIN imports externos)
│  └─ ports/        # Telemetry + puerto(s) trivial(es) de ejemplo
├─ application/     # casos de uso (dependen solo de domain/ports)
├─ infrastructure/  # adapters: kysely/, otel/ — único lugar que importa SDKs
└─ http/            # router orpc + wiring/DI (composition root) + health endpoint
```

Incluye:

- nitro (pin de versión exacta; v3 si es compatible con bun, v2 estable como
  fallback — decisión con spike rápido en implement).
- orpc handler sobre h3/fetch; health endpoint (`GET /health`) vía orpc o ruta h3.
- OpenTelemetry SDK con export OTLP por env (`OTEL_EXPORTER_OTLP_ENDPOINT`);
  **sin endpoint → no-op sin afectar la app** (PRD §10). Acceso a la API de OTel
  solo a través del puerto `Telemetry`.
- kysely cableado (dialect postgres) sin migraciones todavía; `DATABASE_URL`
  apunta al postgres del compose.
- Smoke test de arranque (`bun test`).

### 2.3 `apps/web` — `@crm/web` (octanejs/tsrx + vite)

```
src/
├─ components/
│  ├─ vendor/       # único lugar que importa libs de UI (README con la regla §9)
│  ├─ atoms/ molecules/ organisms/   # atomic design; solo consumen vendor/
│  └─ base-view/    # BaseView (PRD §9)
├─ routes/          # base de tanstack router (tabla canónica §7 en changes futuros)
├─ styles/tokens.css  # tokens semánticos claro/oscuro (primary verde, surface, text)
└─ i18n/            # i18next, español default desde el día uno
```

Incluye:

- octanejs (tsrx) con **pin estricto de versión** tras verificar scope/nombre en
  npm (🔴 riesgo explore: paquete poco mainstream; verificar peer deps de React
  antes de commitear `package.json`).
- vite + tailwindcss + `@fontsource/poppins`.
- Base de tanstack router.
- i18next configurado con `es` default y catálogo inicial.
- Página mínima de humo que renderice vía la estructura (sin lógica de negocio).
- Smoke test (`bun test`).

### 2.4 `packages/`

- `packages/tsconfig` (`@crm/tsconfig`): bases compartidas `base`, `server`, `web`.
- `packages/types` (`@crm/types`): tipos/contratos compartidos api↔web (contrato
  orpc) — evita que web importe código del server.

### 2.5 Verificación de versiones (actividad explícita)

Tarea bloqueante dentro del change: verificar en registry npm y **pinear versiones
exactas** de octanejs/tsrx, nitro, turborepo y demás deps clave antes de
commitear. Evitar deps con node-gyp; tailwind v4/turbo usan prebuilds linux-x64.

### 2.6 Cierre

- `bun install` + `bun test` verde en raíz + `turbo run build` verde.
- Commit(s) **Conventional Commits** en `develop` (hook husky+commitlint activo).
  Propuesta de split dentro del mismo change (size:exception permite un PR grande,
  pero commits atómicos): `chore: workspace tooling`, `feat(api): scaffold`,
  `feat(web): scaffold`.

## 3. Áreas afectadas

| Área | Cambio |
| --- | --- |
| Raíz del repo | `package.json` (workspaces), `turbo.json`, `Makefile`, `docker-compose.yml`, `.env.example`, `.gitignore` |
| `apps/api/` (nuevo) | Scaffold nitro/h3/orpc/kysely/OTel con clean architecture |
| `apps/web/` (nuevo) | Scaffold octanejs/vite/tailwind/i18next con atomic design + vendor/ |
| `packages/tsconfig`, `packages/types` (nuevos) | Bases TS y contratos compartidos |
| Tooling existente | husky/commitlint sin cambios; se respeta el hook |

No se toca: `docs/`, `openspec/`, `commitlint.config.mjs`, `.husky/`.

## 4. Riesgos y mitigaciones

| Riesgo | Nivel | Mitigación |
| --- | --- | --- |
| Scope/versión npm de octanejs/tsrx sin verificar | 🔴 | Verificación + pinning como actividad bloqueante antes del commit de `apps/web`; si el paquete no existe o no resuelve, escalar al usuario antes de sustituir stack (decisión de PRD). |
| nitro v3 incompatible con bun | 🟡 | Pin exacto; fallback a nitro v2 estable tras spike rápido; orpc soporta fetch/h3 en ambas líneas. |
| turborepo + `bun.lock` (v2 texto) | 🟡 | turbo ≥ 2.x reciente; fallback documentado `bun --filter` para los scripts. |
| Sin PostgreSQL local | 🟡 | `docker-compose.yml` incluido en el scaffold (no se difiere al change de persistencia). |
| Binarios nativos (tailwind oxide, turbo) | 🟢 | linux-x64 con prebuilds; prohibir deps node-gyp en el scaffold. |
| Review budget 400 líneas excedido | 🟢 | `size:exception` aceptado explícitamente (delivery_strategy `exception-ok`); commits atómicos facilitan review. |

## 5. Rollback

- Todo el change es aditivo sobre un repo sin código: rollback = `git revert` del
 /los commits del scaffold en `develop` (o reset antes de push).
- No hay migraciones, datos ni despliegues involucrados; no requiere plan de datos.
- `.gitignore` ampliado es retrocompatible (solo agrega patrones).

## 6. Criterios de éxito

1. `bun install` resuelve en limpio con versiones pineadas (lockfile commitado).
2. `turbo run build` (o fallback `bun --filter`) compila `apps/api`, `apps/web`
   y `packages/*`.
3. `bun test` verde en workspace raíz (smoke test por app).
4. `apps/api` levanta en dev y responde `GET /health` sin endpoint OTLP
   configurado (telemetría no-op).
5. `apps/web` levanta en dev, renderiza la página de humo en español (i18next
   default `es`).
6. Estructura auditable por path: `apps/api/src/domain/` sin imports de
   kysely/h3/nitro/SDKs; libs de UI solo bajo `apps/web/src/components/vendor/`.
7. `docker compose up -d` levanta `postgres:17-alpine` accesible con la
   `DATABASE_URL` de `.env.example`.
8. Commits en `develop` cumplen Conventional Commits (hook no rechaza).

## 7. Fuera de alcance (non-goals)

- Migraciones kysely, schema de BD (§11) y seeds (§12) → primer change de dominio.
- Auth/OTP, módulos §8, websocket, cola de emails → changes de features.
- Wrappers reales de UI (RichTextEditor, OtpInput, etc.) → se crea la carpeta y
  la regla; los wrappers llegan con su feature.
- Lint de fronteras (ports/wrappers) automatizado → se documenta la regla;
  tooling opcional en change posterior.
- Telemetría frontend, logs correlacionados → Fase 3 (PRD §10).
- Deploy/CI → fuera del scaffold.
