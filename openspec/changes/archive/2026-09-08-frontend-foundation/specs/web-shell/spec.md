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

### Requirement: Sidebar colapsable con estado persistido

El sidebar DEBE tener dos estados de ancho fijo: expandido (260px, ícono +
label) y colapsado (64px, solo ícono con label accesible vía `title` +
`aria-label`), con un toggle operable por teclado en el pie del sidebar. El
estado DEBE persistirse en `localStorage` (`crm-sidebar`) y sobrevivir a la
navegación MPA. El sidebar NO DEBE implementar resize (fuera de scope de este
change).

#### Scenario: Colapso persistido entre páginas

- GIVEN el usuario colapsa el sidebar en `/dashboard`
- WHEN navega a `/clients` (full page load)
- THEN el sidebar se renderiza colapsado a 64px y los labels quedan accesibles vía `aria-label`

#### Scenario: Toggle operable por teclado

- GIVEN el foco en el botón de colapso
- WHEN el usuario presiona Enter o Espacio
- THEN el sidebar alterna entre expandido y colapsado sin handlers de teclado custom (botón nativo)

### Requirement: Íconos vía wrapper vendor/icons con set cerrado

Los íconos del shell DEBEN servirse desde un wrapper propio
`components/vendor/icons/` con paths SVG inline vendored (origen phosphor-icons,
licencia MIT, provenance y versión documentados en el README del wrapper). El
wrapper DEBE exponer un componente `Icon` cuyo `name` sea una union cerrada
(`IconName`) con el set inicial decidido en design (house, check-square,
calendar, users, wallet, arrow-down-circle, arrow-up-circle, arrows-left-right,
gear, sun, moon, sidebar). Ningún paquete de íconos PUEDE importarse fuera del
wrapper ni agregarse como dependencia de runtime para este set.

#### Scenario: Set de íconos cerrado

- GIVEN el wrapper `vendor/icons/`
- WHEN un componente intenta usar un ícono fuera de la union `IconName`
- THEN el tipado lo rechaza en compilación (ampliar el set exige editar el wrapper)

#### Scenario: Imports de íconos auditables

- GIVEN el código de `src/`
- WHEN se inspeccionan los imports relacionados con íconos
- THEN ningún módulo fuera de `components/vendor/icons/` contiene SVGs de íconos ni dependencias de íconos

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

### Requirement: Rutas destino del shell como placeholders

Las ocho rutas del árbol (`/dashboard`, `/tasks`, `/schedules`, `/clients`,
`/incomes`, `/expenses`, `/transfers`, `/config`) DEBEN registrarse como
`RenderRoute` con el layout del shell y páginas placeholder (título + texto
i18n), SIN lógica de módulos, SIN guards de auth (no hay sesión en este change).
La tabla DEBE generarse con un helper `shellRoute(path, entry)` que fije el
layout, de modo que el futuro auth-guard se enchufe como middleware `before` en
un único punto.

#### Scenario: Placeholder renderiza dentro del shell

- GIVEN la tabla de rutas registrada
- WHEN se navega a `/expenses`
- THEN la página placeholder renderiza dentro del layout del shell, sin lógica de negocio

#### Scenario: Punto único para el guard futuro

- GIVEN el helper `shellRoute`
- WHEN se agregue el auth-guard del change de auth
- THEN bastará modificar el helper (middleware `before`) sin tocar las ocho declaraciones de ruta
