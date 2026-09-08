# Vendor Bindings Specification

> Change: `stack-alignment` · Dominio nuevo (spec completa).
> Fuentes: PRD §9/§10, bindings-status.md (CI-checked), proposal §2.
> Esta spec es el registro canónico de los bindings first-party `@octanejs/*`
> adoptados por CRM-HOME: qué se instala, con qué versión pineada, qué wrapper lo
> encapsula, qué limitaciones tiene y qué queda diferido.

## Purpose

Define la adopción de los bindings `@octanejs/*` como capa oficial entre las
librerías upstream y el código de CRM-HOME, reforzando la regla de wrappers del
PRD §9: ningún import de librería de terceros (incluidos los paquetes upstream
detrás de un binding) PUEDE aparecer fuera de `components/vendor/` (web) o de
`src/infrastructure/` (api). Registra también las correcciones documentales al
PRD y a `openspec/config.yaml`, los diferidos con su change consumidor y los
criterios verificables globales del change.

## Requirements

### Requirement: Instalación pineada de bindings con consumidor inmediato

`apps/web` y `apps/api` DEBEN instalar con versión exacta pineada (sin `^`, con
lockfile commitado) los bindings con consumidor inmediato o valor fundacional:

| Paquete | Versión | App | Wrapper / consumidor |
| --- | --- | --- | --- |
| `@octanejs/zag` + `@zag-js/pin-input` **o** `@octanejs/input-otp` | `0.0.18` / `0.0.19` | web | `vendor/otp-input` (design decide cuál; ver spec `web-auth-ui`) |
| `@octanejs/xstate` + `xstate` | `0.0.10` | web y api | FSM de `lib/otp` (web); base fundacional (api) |
| `@octanejs/phosphor-icons` | `0.0.32` | web | `vendor/icons` |
| `@octanejs/resizable-panels` | `0.0.10` | web | shell sidebar (spec `web-shell`) |
| `effect` | exacta verificada | api y web | base fundacional §10 (adapters) |

La instalación DEBE ser manual con `bun add <pkg>@<versión-exacta>` (octane
`0.2.3` NO incluye CLI), con un binding por commit, verificando peer ranges
contra `octane@0.2.3` y `vite@8` en cada commit.

#### Scenario: Versiones exactas en package.json

- GIVEN los `package.json` de `apps/web` y `apps/api` tras el change
- WHEN se inspeccionan las dependencias nuevas
- THEN todas figuran con versión exacta (sin rango `^`/`~`) y el lockfile commitado las resuelve de forma reproducible

#### Scenario: Un binding por commit

- GIVEN el historial de commits del change
- WHEN se inspeccionan los commits de instalación
- THEN cada commit introduce exactamente un binding (o su par binding+upstream) con su lockfile actualizado

### Requirement: Stack base declarado instalado con limitaciones documentadas

`apps/web` DEBE instalar pineados `@octanejs/i18next@0.1.47`,
`@octanejs/sonner@0.1.47` y `@octanejs/usehooks-ts@0.0.34`. Además:

- `@octanejs/usehooks-ts` es **PARCIAL** (bindings-status): solo la cohorte
  host-safe (`useBoolean`, `useCounter`, `useToggle`, `useMap`, `useStep`,
  `useDebounceCallback/Value`, `useInterval`, `useTimeout`, `useIsMounted`,
  `useUnmount`) está disponible; los hooks de storage/media/DOM-observer están
  AUSENTES. Esta limitación DEBE quedar documentada en esta spec, en el README
  del wrapper si lo hubiere y en `openspec/config.yaml`; ningún módulo PUEDE
  importar hooks inexistentes del binding.
- `@octanejs/react-error-boundary@0.1.33` DEBE instalarse SOLO si plan verifica
  que Octane `0.2.3` no expone un ErrorBoundary nativo; si existe nativo, DEBE
  documentarse la decisión y NO instalarse el binding. En ambos casos la
  divergencia conocida del binding (component-stack vacío) DEBE quedar
  registrada.
- `@octanejs/sonner` DEBE quedar encapsulado tras un wrapper mínimo
  `components/vendor/toast/` aunque ningún flujo lo consuma aún en este change.

#### Scenario: Limitación de usehooks-ts visible

- GIVEN la documentación del change y `openspec/config.yaml`
- WHEN se busca la referencia a usehooks-ts
- THEN la cohorte disponible está enumerada explícitamente y los hooks ausentes figuran como no disponibles

#### Scenario: Decisión de error-boundary registrada

- GIVEN la verificación de plan sobre ErrorBoundary nativo de Octane
- WHEN se inspecciona el resultado del change
- THEN o bien existe el wrapper `vendor/error-boundary/` sobre el binding, o bien la decisión de usar el nativo está documentada, y en ambos casos la limitación del component-stack vacío figura registrada

### Requirement: Regla de wrapper reforzada y auditable

Ningún import de una librería de terceros —incluidos los paquetes upstream que
un binding encapsula (`@zag-js/*`, `phosphor-icons`, `react-resizable-panels`,
`i18next`, `sonner`, `xstate`, `effect`)— PUEDE aparecer fuera de
`src/components/vendor/` en `apps/web` ni fuera de `src/infrastructure/` y
`src/http/` en `apps/api`. Los bindings `@octanejs/*` siguen la misma regla:
solo los wrappers `vendor/*` (web) o los adapters (api) PUEDEN importarlos. La
regla DEBE ser verificable por grep sobre el árbol fuente.

#### Scenario: Imports confinados verificables por grep

- GIVEN el árbol `src/` de `apps/web` tras los swaps
- WHEN se buscan imports de `@octanejs/*`, `@zag-js/*`, `phosphor-icons`, `react-resizable-panels`, `sonner` o `xstate`
- THEN todas las coincidencias están bajo `src/components/vendor/`

#### Scenario: effect y xstate confinados en api

- GIVEN el árbol `src/` de `apps/api`
- WHEN se buscan imports de `effect` o `xstate`/`@octanejs/xstate`
- THEN aparecen únicamente bajo `src/infrastructure/` (o composition root en `src/http/`), nunca en `src/domain/` ni `src/application/`

### Requirement: Base fundacional de api cableada en un adapter inicial mínimo

`apps/api` DEBE dejar `effect` y `@octanejs/xstate`/`xstate` instalados pineados
y cableados en al menos un punto de composición real mínimo (p. ej. el adapter
de `Telemetry` o el wiring de salud existente), SIN inventar lógica de negocio:
el cableo DEBE demostrar que el paquete funciona dentro de la arquitectura
ports & adapters y servir de andamiaje para los adapters de
Telemetría/repositorios de changes posteriores. Si design documenta que el
cableado efectivo se difiere a un change consumidor, la instalación pineada y la
documentación del motivo DEBEN quedar igualmente (requisito condicional).

#### Scenario: Punto de cableado mínimo presente

- GIVEN `apps/api` tras el change
- WHEN se inspecciona `src/infrastructure/`
- THEN existe al menos un adapter que usa `effect` (o la decisión de diferir el cableado está documentada), y `bun test` sigue verde

### Requirement: Diferidos registrados con su change consumidor

El change DEBE dejar registrados (en `openspec/config.yaml` y referenciados
desde esta spec) los paquetes declarados en PRD §10 que NO se instalan, cada uno
con su change consumidor y limitaciones conocidas:

| Paquete | Change consumidor | Nota |
| --- | --- | --- |
| `@octanejs/lexical` | descripciones de tareas | — |
| `@octanejs/dnd-kit` | kanban de BaseView | — |
| `@octanejs/day-picker` | schedule | — |
| `@octanejs/recharts` | gráfico de torta de schedule | **SSR no testeado** (text measurement 0×0); Brush/Treemap no soportados — anotar en la spec de schedule |
| `@octanejs/colorful` | colores de categorías | — |
| `@octanejs/tanstack-{store,db,query,form,table,virtual}` | data layer de módulos | — |
| `@octanejs/spring` | primera animación real | — |
| `@octanejs/testing-library` | primer test con DOM | hoy todo TS puro |
| `shiki` (api) | sin consumidor claro en §10 backend | — |

#### Scenario: Diferidos rastreables

- GIVEN `openspec/config.yaml` tras el change
- WHEN se inspecciona la sección de diferidos
- THEN cada paquete diferido figura con su change consumidor y las limitaciones conocidas (recharts SSR, usehooks-ts parcial)

### Requirement: Correcciones documentales del stack

El change DEBE corregir la documentación que induce a error:

1. `docs/PRD-v2.md` §10 y `openspec/config.yaml`: "tanstack charts" (inexistente)
   DEBE reemplazarse por `@octanejs/recharts` (diferido a schedule).
2. `docs/PRD-v2.md` §10 y `openspec/config.yaml`: tanstack `router`,
   `router-ssr-query` y `nuqs` DEBEN marcarse como **no aplicables** (router MPA
   propio de Octane + `URLSearchParams` estándar); NO DEBE instalarse nada.
3. `docs/PRD-v2.md` §9 (tabla de wrappers) DEBE anotar que los wrappers
   encapsulan bindings `@octanejs/*`, que `OtpInput` encapsula zag pin-input
   (o input-otp según design) y que `Charts` corresponde a recharts.
4. `openspec/config.yaml` `stack.frontend` DEBE reescribirse con los nombres
   `@octanejs/*` y la sección de diferidos del requisito anterior.
5. Las specs activas de `frontend-foundation` que citen D1/D4/D8 DEBEN
   addendarse (no reescribirse); `frontend-foundation/design.md` queda como
   registro histórico intacto.

#### Scenario: Sin referencias a productos inexistentes

- GIVEN `docs/PRD-v2.md` y `openspec/config.yaml` tras el change
- WHEN se buscan las cadenas "tanstack charts", "nuqs" y "router-ssr-query"
- THEN "tanstack charts" ya no existe, y nuqs/router-ssr-query aparecen únicamente marcados como no aplicables

#### Scenario: Nombres de binding coherentes

- GIVEN `openspec/config.yaml` tras el change
- WHEN se inspecciona `stack.frontend`
- THEN los paquetes figuran con su nombre `@octanejs/*` y los diferidos con su change consumidor

### Requirement: Criterios verificables globales del change

El change DEBE cumplir, como condición de cierre:

1. `bun test` verde en workspace raíz con los 43 tests existentes adaptados
   (re-apuntados, nunca borrados sin reemplazo) más los tests nuevos que
   strict_tdd requiera.
2. Typecheck verde en ambos paquetes.
3. El servidor dev DEBE responder HTTP 200 en todas las rutas existentes.
4. SSR e hidratación SIN regresión ni mismatch en las pantallas tocadas:
   `/login`, `/login-verification` y el shell (`/dashboard` y resto de rutas del
   shell).
5. Ningún cambio de contrato público de los wrappers hacia sus consumidores
   (`OtpInputProps`, `Icon`/`IconName`, `I18nProvider`/`useT()`/`t()`,
   `SidebarNavProps`); cualquier excepción DEBE estar explícitamente
   justificada en el change.

#### Scenario: Suite verde tras los swaps

- GIVEN el workspace con todos los swaps aplicados
- WHEN se ejecuta `bun test` en la raíz
- THEN la suite completa pasa, con al menos tantos tests de comportamiento OTP/i18n como antes del change

#### Scenario: SSR sin regresión en pantallas tocadas

- GIVEN el dev server levantado tras el change
- WHEN se cargan `/login`, `/login-verification?email=a%40b.c` y `/dashboard`
- THEN las tres responden 200, el HTML SSR es idéntico al hidratado (sin mismatch) y no hay errores de hidratación en consola
