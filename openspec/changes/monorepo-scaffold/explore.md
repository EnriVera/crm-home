# Explore — monorepo-scaffold

> Fase explore del change SDD `monorepo-scaffold` (CRM-HOME).
> Fuentes leídas: `docs/PRD-v2.md` (§6, §9, §10, §11), `PRODUCT.md`, `openspec/config.yaml`, estado real del repo.

## 1. Estado real del repo

Rama activa: `develop` (existe también `main`, ambas permanentes según PRD §6.10).

Archivos presentes (no hay código de producto):

| Archivo | Estado | Observación |
| --- | --- | --- |
| `package.json` (raíz) | ✅ | `private`, `type: module`, solo `prepare: husky`; devDeps: husky ^9.1.7, @commitlint/cli + config-conventional ^20.4.2 |
| `bun.lock` | ✅ | lockfileVersion 2 (formato texto de bun); incluye typescript@7.0.2 y @types/node@26.4.1 como transitivos de commitlint |
| `commitlint.config.mjs` | ✅ | `extends: @commitlint/config-conventional` |
| `.husky/commit-msg` | ✅ | corre `bunx --no-install commitlint --edit "$1"` (requiere `node_modules` instalado) |
| `.husky/_/` | ✅ | husky ya inicializado → `bun install` ya corrió al menos una vez |
| `.gitignore` | ✅ | cubre `node_modules/`, `.atl/`, `.impeccable/`; **no cubre** `.turbo/`, `dist/`, `.output/`, `.env*` → agregar en el scaffold |
| `docs/PRD-v2.md`, `docs/PRD.md`, `PRODUCT.md` | ✅ | docs de verdad; PRD.md histórico |
| `openspec/config.yaml` | ✅ | config SDD completa |

No hay: `node_modules/` confirmable (gitignored, pero deducible instalado por `.husky/_` y el hook `--no-install`), ni `apps/`, `packages/`, `turbo.json`, tsconfigs, ni linters de código (no hay eslint/biome/oxlint configurados — **decisión pendiente para el scaffold**: el PRD no exige linter, pero la regla de wrappers §9 prevé "cuando exista tooling, de lint"; conviene dejar la regla documentada y opcionalmente un lint de fronteras más adelante).

## 2. Restricciones del entorno

- **bun**: confirmado `/usr/bin/bun` y `/usr/bin/bunx`. Es runtime + package manager único (config.yaml `runtime: bun`). Node 26 secundario (según contexto de sesión; no verificable desde mi toolset).
- **Registry npm**: no verificable sin ejecución de shell, pero el `bun.lock` resuelto demuestra acceso previo exitoso. Riesgo bajo.
- **PostgreSQL**: ❌ **no hay servidor local instalado**. `/usr/bin` solo tiene clientes (`pg_isready`, `pg_dump`, `pg_restore`, `pg_config`, `pg_dumpall`); no existe `/etc/postgresql/`, ni binarios de servidor en `/usr/lib/postgresql`, ni unidad systemd de postgres. **Consecuencia:** el scaffold debe proveer la BD vía contenedor (docker-compose con `postgres:17-alpine`) o documentar conexión remota. El scaffold en sí NO necesita BD viva (kysely se cablea sin migraciones todavía), pero el primer change con dominio sí.
- **Sin verificación de ejecución posible desde la fase explore** (toolset sin shell): versiones exactas de bun/node y alcance de registry quedan como verificación para la fase plan/implement.

## 3. Riesgos del scaffold

| Riesgo | Nivel | Mitigación propuesta |
| --- | --- | --- |
| **Versiones de octanejs/tsrx** | 🔴 alto | Paquete poco mainstream; nombre/scope en npm por confirmar (`octanejs` vs scoped) y pinning estricto de versión en el scaffold. Verificar existencia y peer deps (React version) antes de commitear `package.json` de `apps/web`. |
| **nitro v3** | 🟡 medio | nitro v3 (nitropack) es línea nueva; preset `bun` existe pero validar compat con bun actual y con orpc handler (orpc soporta fetch/h3). Pin de versión exacta. |
| **turborepo + bun workspaces** | 🟡 medio | Soporte de bun en turbo es funcional pero el parser de `bun.lock` (v2 texto) puede requerir turbo ≥ 2.x reciente. Fallback documentado: correr tasks con `bun --filter` si turbo falla. |
| **Binarios nativos** | 🟡 medio | tailwindcss v4 (oxide/lightningcss) y turbo traen prebuilds por plataforma — en linux-x64 no debería haber builds desde source. `pg` es JS puro. shiki es wasm/js. Riesgo residual bajo; evitar deps con node-gyp en el scaffold. |
| **Sin PostgreSQL local** | 🟡 medio | Incluir `docker-compose.yml` (postgres + volumen) en el scaffold como tooling base, aunque no se use aún. |
| **.gitignore incompleto para monorepo** | 🟢 bajo | Agregar `.turbo/`, `dist/`, `.output/`, `.nitro/`, `.env`, `.env.local`, `*.tsbuildinfo`. |
| **tsc 7.0.2 transitivo** | 🟢 bajo | Viene de commitlint; el scaffold debe declarar su propio typescript estable en `packages/tsconfig` / raíz y no depender del transitivo. |

## 4. Hipótesis de estructura de monorepo

Alineada a PRD §10 (ports & adapters backend, wrappers frontend) — las carpetas deben **hacer visible la regla**:

```
crm/
├─ apps/
│  ├─ api/                      # nitro + h3 + orpc (server)
│  │  ├─ src/
│  │  │  ├─ domain/            # entidades + puertos (interfaces TS puras; SIN imports externos)
│  │  │  │  └─ ports/          # EmailSender, OtpGenerator, TokenHasher, IdGenerator,
│  │  │  │                     # Clock, FileStorage, Telemetry, repositorios por entidad
│  │  │  ├─ application/       # casos de uso (dependen solo de domain/ports)
│  │  │  ├─ infrastructure/    # adapters: kysely/, otel/, email-queue/, crypto-bun/,
│  │  │  │                     # nitro-assets/ — ÚNICO lugar que importa kysely/h3/OTel SDK
│  │  │  └─ http/              # routers orpc + wiring/DI (composition root)
│  │  ├─ nitro.config.ts
│  │  └─ package.json          # name: @crm/api
│  └─ web/                      # octanejs/tsrx + vite + tailwindcss
│     ├─ src/
│     │  ├─ components/
│     │  │  ├─ vendor/         # wrappers: RichTextEditor, OtpInput, DragDrop, DatePicker,
│     │  │  │                  # Charts, DataTable, VirtualList, Icons, Toast, ColorPicker,
│     │  │  │                  # Motion, I18nProvider — ÚNICO lugar que importa libs de UI
│     │  │  ├─ atoms/  molecules/  organisms/   # atomic design, solo consumen vendor/
│     │  │  └─ base-view/
│     │  ├─ routes/            # tabla canónica de rutas PRD §7
│     │  ├─ styles/tokens.css  # tokens semánticos (primary verde, surface, text) claro/oscuro
│     │  └─ i18n/              # i18next, es default desde el día uno
│     └─ package.json          # name: @crm/web
├─ packages/
│  ├─ tsconfig/                # bases TS compartidas (@crm/tsconfig: base, server, web)
│  ├─ shared-types/            # tipos/contratos compartidos api↔web (contract de orpc) — @crm/types
│  └─ design-tokens/ (opcional)# si tokens se comparten fuera de web; si no, quedan en web/styles
├─ docker-compose.yml          # postgres 17 para desarrollo local
├─ turbo.json                  # pipeline: dev, build, test, lint, typecheck
├─ Makefile                    # PRD §10 lo lista en backend: targets dev/build/test/db-up
├─ package.json (raíz)         # workspaces: ["apps/*", "packages/*"], packageManager: bun@<pin>
├─ .gitignore (ampliado)
└─ .env.example                # DATABASE_URL, OTEL_EXPORTER_OTLP_ENDPOINT (telemetría no-op sin endpoint)
```

Decisiones de estructura clave:

1. **Ports visibles**: `apps/api/src/domain/ports/` existe desde el scaffold (vacía o con un puerto trivial + test de humo), para que la regla "el dominio no importa kysely/h3/nitro" sea auditable por path desde el PR #1.
2. **Wrappers visibles**: `apps/web/src/components/vendor/` creado aunque aún sin wrappers reales, con README que fija la regla del PRD §9.
3. **`@crm/types`** para el contrato orpc compartido — evita que web importe código del server.
4. **Telemetría no-op por defecto**: `.env.example` sin endpoint OTLP → la app arranca sin backend de observabilidad (PRD §10: degradación a no-op).
5. **Makefile en raíz** (el PRD lo lista como tooling de backend; ponerlo en raíz orquestando turbo es más útil en monorepo — decisión a confirmar en plan).
6. **Excepción TDD aplicable**: `testing.tdd_exceptions` ya lista `monorepo-scaffold` (config sin lógica de negocio). Tests de humo de arranque (`bun test` verde con un smoke test por app) son recomendables igual para que `verify` tenga señal.

## 5. Preguntas abiertas para specify/plan

1. ¿Versión exacta y scope npm de octanejs/tsrx? (bloqueante para `apps/web/package.json`)
2. ¿nitro v3 pinned o v2 estable si v3 rompe con bun? (decidir con spike rápido en implement)
3. ¿Makefile en raíz o en `apps/api`?
4. ¿docker-compose de postgres parte del scaffold o del primer change de persistencia? (recomiendo scaffold: es tooling base §10).
5. ¿Se incluye el smoke de OTel no-op en el scaffold o se difiere al change de telemetría?

## 6. Recomendación de siguiente fase

`specify` — con foco en: definir los criterios de aceptación del scaffold (apps levantan en dev, `bun test` verde en raíz, turbo pipeline funcional, estructura de carpetas que materializa ports/wrappers, `.env.example` + docker-compose). La excepción TDD ya está aprobada; el review_budget de 400 líneas sugiere evaluar split del PR (scaffold tooling+api / web) en plan.
