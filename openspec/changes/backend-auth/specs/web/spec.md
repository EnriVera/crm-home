# Delta for Web

> Change: `backend-auth`. Materializa el camino con sesión del redirect de `/`
> que la spec `web` ya preveía ("cuando exista sesión, el mismo middleware
> PUEDE cambiar el destino a `/dashboard`").

## MODIFIED Requirements

### Requirement: Redirect de la ruta raíz según sesión

La ruta `/` DEBE ser un `RenderRoute` con middleware `before` que consulte la
sesión activa (vía el endpoint RPC `session` con la cookie del request) y
responda `302 Location: /dashboard` cuando EXISTA sesión vigente, o
`302 Location: /login` cuando NO exista. El `entry` (requerido por el tipo)
DEBE ser una página mínima de fallback con un anchor a `/login` (defensa ante
un entorno que no ejecute middleware). La función del middleware DEBE ser TS
puro testeable sin DOM, con la consulta de sesión inyectable.
(Previously: el middleware respondía siempre `302 Location: /login`; el cambio
de destino a `/dashboard` con sesión era una posibilidad futura declarada.)

#### Scenario: Redirect 302 a /login sin sesión

- GIVEN la tabla de rutas con el redirect configurado y un request sin cookie de sesión válida
- WHEN llega un request a `/`
- THEN la respuesta es `302` con header `Location: /login`

#### Scenario: Redirect 302 a /dashboard con sesión activa

- GIVEN un request a `/` con cookie de sesión vigente
- WHEN el middleware consulta la sesión
- THEN la respuesta es `302` con header `Location: /dashboard`

#### Scenario: Middleware testeable sin DOM

- GIVEN la función del middleware con la consulta de sesión inyectada (stub con y sin sesión)
- WHEN se invoca con un Context de request a `/` en un test `bun test`
- THEN devuelve una `Response` con status 302 y el `Location` correspondiente a cada caso
