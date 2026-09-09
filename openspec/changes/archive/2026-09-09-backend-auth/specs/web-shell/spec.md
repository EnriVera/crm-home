# Delta for Web Shell

> Change: `backend-auth`. Enchufa el auth-guard que la spec `web-shell` dejó
> previsto como middleware `before` en el punto único (`shellRoute`).

## ADDED Requirements

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

## MODIFIED Requirements

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
