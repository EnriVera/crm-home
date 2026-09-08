# Delta for Web Shell

> Change: `stack-alignment` · Delta sobre la spec `web-shell`.
> NOTA DE BASELINE: `openspec/specs/web-shell/spec.md` aún no existe porque ni
> `monorepo-scaffold` ni `frontend-foundation` fueron archivados; este delta se
> escribe contra `openspec/changes/frontend-foundation/specs/web-shell/spec.md`
> como baseline de facto (verificado). Orden de archivo obligatorio:
> `monorepo-scaffold` → `frontend-foundation` → `stack-alignment`.

## MODIFIED Requirements

### Requirement: Sidebar redimensionable con colapso y estado persistido

`routes/__app-shell.tsrx` DEBE envolver el sidebar y el `<main>` en los
componentes `Group`/`Panel`/`Separator` del binding
`@octanejs/resizable-panels` (bindings-status: Completo; colapso programático,
persistencia y ARIA incluidos), importado ÚNICAMENTE desde el shell o un wrapper
bajo `components/vendor/` (regla §9). El sidebar DEBE ser redimensionable por
arrastre del handle (cumpliendo el "resizable" de PRD §9) y DEBE conservar el
colapso programático entre un estado expandido (ícono + label) y uno colapsado
(solo ícono con label accesible vía `title` + `aria-label`), con toggle operable
por teclado. El estado (ancho y/o flag de colapso) DEBE persistirse en
`localStorage` (clave `crm-sidebar` o evolución documentada del formato
booleano previo a porcentaje + flag) y sobrevivir a la navegación MPA. El SSR
DEBE renderizar un snapshot estable (expandido por defecto o el mecanismo que
design elija) SIN mismatch de hidratación. El drag-handle DEBE ser operable por
teclado (WCAG 2.1.1) con el ARIA que provea el binding.
(Previously: sidebar de ancho fijo 260↔64 px con toggle persistido en
`localStorage["crm-sidebar"]`, SSR expandido, sin resize — D8 declaraba el
resize fuera de scope.)

#### Scenario: Resize por arrastre dentro de límites

- GIVEN el shell renderizado con el sidebar expandido
- WHEN el usuario arrastra el separador
- THEN el ancho del sidebar se actualiza dentro de los límites configurados y el área de contenido se ajusta

#### Scenario: Colapso persistido entre páginas

- GIVEN el usuario colapsa el sidebar en `/dashboard`
- WHEN navega a `/clients` (full page load)
- THEN el sidebar se renderiza colapsado y los labels quedan accesibles vía `aria-label`

#### Scenario: Toggle y drag-handle operables por teclado

- GIVEN el foco en el botón de colapso o en el separador
- WHEN el usuario presiona Enter/Espacio (toggle) o las flechas (separador)
- THEN el sidebar alterna su estado o ajusta su ancho sin depender exclusivamente del ratón, con los roles/ARIA del binding presentes

#### Scenario: Snapshot SSR estable

- GIVEN cualquier ruta del shell
- WHEN se compara el HTML SSR con el resultado hidratado
- THEN no hay mismatch de hidratación atribuible al ancho/estado del sidebar

### Requirement: Íconos vía wrapper vendor/icons con set cerrado

Los íconos del shell DEBEN servirse desde el wrapper propio
`components/vendor/icons/`, que DEBE delegar el render en el binding
`@octanejs/phosphor-icons` (bindings-status: Completo; 1.512 íconos, 6 pesos,
`IconContext`) en lugar de paths SVG vendored. El wrapper DEBE mantener la
interfaz pública del componente `Icon` (`name`, `size`, `aria-label`, `class`)
intacta hacia sus consumidores, y `name` DEBE seguir siendo una union cerrada
(`IconName`) con el set vigente (house, check-square, calendar, users, wallet,
arrow-down-circle, arrow-up-circle, arrows-left-right, gear, sun, moon,
sidebar), mapeada internamente a los exports del binding. Ningún paquete de
íconos (ni el binding ni el upstream) PUEDE importarse fuera del wrapper. La
implementación DEBE verificar que el tree-shaking mantiene el set completo de
íconos fuera del bundle salvo los usados y que el render SSR (SVG) funciona sin
regresión.
(Previously: paths SVG inline vendored desde `@phosphor-icons/core@2.1.1` con
provenance documentado en el README del wrapper — D4.)

#### Scenario: Set de íconos cerrado

- GIVEN el wrapper `vendor/icons/` sobre el binding
- WHEN un componente intenta usar un ícono fuera de la union `IconName`
- THEN el tipado lo rechaza en compilación (ampliar el set exige editar el wrapper)

#### Scenario: Imports de íconos auditables

- GIVEN el código de `src/`
- WHEN se inspeccionan los imports relacionados con íconos
- THEN ningún módulo fuera de `components/vendor/icons/` importa `@octanejs/phosphor-icons`, el upstream ni contiene SVGs de íconos

#### Scenario: Contrato de Icon intacto

- GIVEN el wrapper migrado al binding
- WHEN se inspeccionan los consumidores (shell, atoms, páginas)
- THEN las props públicas de `Icon` son idénticas y ningún consumidor requirió cambios
