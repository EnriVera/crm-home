# Web Shell Specification

> Change: `frontend-foundation` · Dominio nuevo (spec completa).
> Deriva de las decisiones D3, D4, D5 y D8 del design. Árbol de navegación
> canónico: PRD §7. Brief visual: `.impeccable/surface-briefs/app-shell.md`.
> Addendum (stack-alignment): D4 queda **superseded por D-SA8** (icons →
> `@octanejs/phosphor-icons`, contrato `Icon`/`IconName` idéntico) y D8
> **evoluciona con D-SA6** (sidebar resizable con
> `@octanejs/resizable-panels`; storage `"crm-sidebar"` abandonado →
> `"crm-sidebar-layout"` gestionado por el binding, sin migración).

## Purpose

Define el layout de la app autenticada de CRM-HOME: sidebar izquierdo con el
árbol de navegación canónico del PRD §7, estado activo derivado de la URL,
colapso persistido, íconos vía wrapper propio, accesibilidad WCAG 2.2 AA del
nav, y las rutas destino registradas como placeholders sin lógica de módulos.

## Requirements

### Requirement: Layout app shell con sidebar y área de contenido

`apps/web` DEBE incluir un layout de shell (`routes/__app-shell.tsrx`) con
sidebar izquierdo y área de contenido principal (`<main id="content">`), con un
skip-link como primer elemento focalizable apuntando a `#content`. La
navegación DEBE realizarse con anchors normales (`<a href>`, modelo MPA de
Octane); NO DEBE asumirse router cliente.

#### Scenario: Estructura accesible del layout

- GIVEN cualquier ruta del shell renderizada
- WHEN se inspecciona el orden de elementos focalizables
- THEN el primero es el skip-link que apunta a `#content`, seguido por el nav del sidebar y luego el contenido

#### Scenario: Navegación MPA

- GIVEN el usuario en `/dashboard`
- WHEN activa el link a `/tasks`
- THEN el navegador realiza una navegación completa por anchor estándar a `/tasks`

### Requirement: Árbol de navegación canónico del PRD §7

El sidebar DEBE presentar el árbol canónico en este orden: Dashboard
(`/dashboard`), Tareas (`/tasks`), Schedule (`/schedules`), Clients
(`/clients`), Finance como grupo NO clicable con hijos Income (`/incomes`),
Expenses (`/expenses`) y Transfers (`/transfers`), y Config (`/config`). Los
labels DEBEN provenir del catálogo i18n (`nav.*`). El árbol DEBE derivarse de
una lista canónica compartida (`SHELL_ROUTES`) con la tabla de rutas, de modo
que nav y rutas registradas no puedan divergir (verificable por test).

#### Scenario: Árbol completo y en orden

- GIVEN el sidebar renderizado
- WHEN se leen los items de navegación en orden
- THEN coinciden exactamente con el árbol §7 y Finance es un encabezado de grupo no clicable con sus tres hijos

#### Scenario: Nav y rutas registradas no divergen

- GIVEN la lista canónica de rutas del shell
- WHEN se compara con los `href` del árbol de navegación
- THEN ambos conjuntos son idénticos (el test de consistencia pasa)

### Requirement: Estado activo derivado de la URL

El item de navegación activo DEBE derivarse de `props.url`
(`RenderRouteProps.url`, idéntico en SSR e hidratación) mediante lógica TS pura
(`pathnameOf`, `isItemActive`, `isGroupActive`), sin usar `window.location`. El
item activo DEBE emitir `aria-current="page"` y un grupo DEBE mostrarse activo
cuando alguno de sus hijos lo está. NO DEBE haber mismatch de hidratación en el
marcado activo.

#### Scenario: Item activo en SSR e hidratación

- GIVEN la ruta `/incomes`
- WHEN se renderiza el shell en SSR y luego se hidrata
- THEN el item Income tiene `aria-current="page"` y el grupo Finance se muestra activo, con marcado idéntico en ambas fases

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
`localStorage` (clave `crm-sidebar` o evolución documentada del formato booleano
previo a porcentaje + flag) y sobrevivir a la navegación MPA. El SSR DEBE
renderizar un snapshot estable (expandido por defecto o el mecanismo que design
elija) SIN mismatch de hidratación. El drag-handle DEBE ser operable por
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

- GIVEN el wrapper `vendor/icons/`
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

### Requirement: Accesibilidad del nav (WCAG 2.2 AA)

El nav del sidebar DEBE usar `<nav aria-label>` con una lista (`<ul>`), foco
visible con el token `--color-focus`, contraste AA en ambos temas según la regla
del design system (labels inactivos en `text-text-secondary`, activo en
`primary-700` en claro), y DEBE ser completamente operable por teclado usando
únicamente elementos nativos (`<a>`, `<button>`).

#### Scenario: Nav con landmark y lista

- GIVEN el sidebar renderizado
- WHEN se inspecciona la estructura del nav
- THEN existe un `<nav>` con `aria-label` i18n que contiene una lista de items

#### Scenario: Contraste del item activo en tema claro

- GIVEN el item activo del nav en tema claro
- WHEN se mide el contraste de su label
- THEN usa `primary-700` o más oscuro (≥4.5:1 sobre el fondo del sidebar)

### Requirement: Guard de sesión en las rutas del shell

Toda ruta del shell DEBE ejecutar un middleware `before` de sesión
(`requireSession`) que consulte la sesión activa vía el endpoint RPC `session`
con la cookie del request (`credentials: 'include'`). Sin sesión vigente, el
middleware DEBE responder `302 Location: /login`; con sesión vigente, DEBE
continuar al render de la ruta. La función del middleware DEBE ser TS puro
testeable sin DOM, con la consulta de sesión inyectable.

#### Scenario: Sin sesión redirige a /login

- GIVEN un request a `/dashboard` sin cookie de sesión válida
- WHEN el middleware `requireSession` consulta la sesión (401)
- THEN la respuesta es `302` con header `Location: /login` y la página del shell NO se renderiza

#### Scenario: Con sesión continúa al shell

- GIVEN un request a `/tasks` con cookie de sesión vigente
- WHEN el middleware `requireSession` resuelve la sesión
- THEN el request continúa y la ruta renderiza dentro del layout del shell

#### Scenario: Guard testeable sin DOM

- GIVEN la función `requireSession` con la consulta de sesión inyectada (stub)
- WHEN se invoca en un test `bun test` con y sin sesión
- THEN devuelve el redirect 302 o la continuación según corresponda, sin DOM

### Requirement: Rutas destino del shell como placeholders protegidos

Las ocho rutas del árbol (`/dashboard`, `/tasks`, `/schedules`, `/clients`,
`/incomes`, `/expenses`, `/transfers`, `/config`) DEBEN registrarse como
`RenderRoute` con el layout del shell y páginas placeholder (título + texto
i18n), SIN lógica de módulos, protegidas por el guard de sesión
(`requireSession`). La tabla DEBE generarse con el helper
`shellRoute(path, entry)` que fije el layout, y el auth-guard DEBE enchufarse
como middleware `before` en ese único punto, sin tocar las ocho declaraciones
de ruta.
(Previously: las rutas se registraban SIN guards de auth — no existía sesión en
aquel change — y el guard futuro quedaba previsto como middleware `before` en
el punto único; este change lo enchufa.)

#### Scenario: Placeholder renderiza dentro del shell con sesión

- GIVEN la tabla de rutas registrada y una sesión vigente
- WHEN se navega a `/expenses`
- THEN la página placeholder renderiza dentro del layout del shell, sin lógica de negocio

#### Scenario: Punto único para el guard

- GIVEN el helper `shellRoute`
- WHEN se inspecciona la tabla de rutas
- THEN el middleware `requireSession` se aplica desde el helper y ninguna de las ocho declaraciones de ruta lo repite
