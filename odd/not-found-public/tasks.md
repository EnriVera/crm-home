# Feature: La 404 se ve con la sesión abierta

**Branch base**: develop
**Status**: Completado
**Owner**: el Gentleman
**Reportado por**: usuario (2026-10-30 23:55)

## Síntoma

Con la sesión abierta, cualquier URL desconocida (un link mal tipeado, un
bookmark viejo, una ruta que cambió) rebotaba a `/dashboard` en silencio.
La pantalla "Página no encontrada" solo era visible para visitantes sin
sesión, así que su link "Volver al dashboard" quedaba muerto para el
caso principal.

Detectado en la inspección visual con moli (Chrome CDP) del 2026-10-30:
`GET /ruta-inexistente-xyz` con cookie `crm_session` válida terminaba en
`/dashboard` en lugar de mostrar la 404.

## Diagnóstico

El guard (`app/middleware/auth.global.ts`) hace exactamente lo que el PRD
§12.4 le pedía:

```ts
if (to.meta.guest && auth.hasSession && !to.meta.public) {
  return navigateTo("/dashboard");
}
```

La ruta catch-all (`app/router/routes.ts`) declaraba
`meta: { layout: "auth", guest: true }` sin `public`, así que con sesión
abierta entraba en la redirección. El router en sí resolvía bien
(`router.resolve("/ruta-xyz")` → `not-found`): el problema era el guard,
no el matching.

El efecto era doble:

- El usuario con sesión nunca veía la 404.
- El rebote silencioso escondía el error de tipeo del link: la URL
  inválida se confundía con una URL válida.

## Decisión de diseño (confirmada por el usuario)

Un usuario **puede** ver la 404, con sesión abierta o cerrada. Se mantiene
el patrón que ya usan las tres páginas legales (`meta.public`): la fila
catch-all pasa a ser `guest: true, public: true`.

Consecuencia del guard: `meta.public` es la única válvula que evita el
rebote a `/dashboard`, así que el cambio es de una línea en la tabla de
rutas más la documentación del contrato.

## Contrato (PRD-v4)

Actualizado en el mismo commit, porque el test de deriva (§12.6) exige
que PRD y `routes.ts` cambien juntos:

- **§7.2** (tabla canónica): fila nueva "No encontrada |
  `/:pathMatch(.*)*`" + regla: la pantalla responde a cualquier ruta
  desconocida con la sesión abierta o cerrada.
- **§12.2** (tabla de `RouteRecordRaw`): la fila catch-all pasa a
  `meta: { layout: 'auth', guest: true, public: true }`.
- **§12.4** (guards): la excepción de `meta.public` ahora nombra también
  a la 404, con el porqué (no rebotar en silencio).
- **§12.6** (anti-regresión): el test verifica `meta.public` en las tres
  páginas legales **y** en la 404.

## Scope

**Archivos a tocar:**

- `docs/PRD-v4.md` — §7.2, §12.2, §12.4, §12.6.
- `apps/web-v3/app/router/routes.ts` — `meta.public` en la fila catch-all.
- `apps/web-v3/tests/unit/routes-table.test.ts` — la 404 entra en
  `PUBLIC_PATHS` (el test pineaba el comportamiento viejo).

Sin cambios en el guard: la semántica ya era la correcta, lo que faltaba
era la marca en la fila.

## Criterios de aceptación

1. Con la sesión abierta, una URL desconocida muestra la pantalla "Página
   no encontrada" y NO rebota a `/dashboard`.
2. Sin sesión, la misma URL muestra la misma pantalla (no rebota a
   `/login`, porque la 404 no exige `meta.auth`).
3. El link "Volver al dashboard" de la 404 lleva al dashboard.
4. Las tres páginas legales siguen leyéndose con la sesión abierta.
5. `/login` y `/login-verification` con sesión abierta siguen rebotando a
   `/dashboard` (eso sí es lo que `guest` sin `public` significa).
6. El test de deriva de rutas pasa y sigue cubriendo la 404.

## Verificación

- `bun run test` (web-v3): 186 pass / 0 fail.
- `bun run typecheck` (web-v3): exit 0.
- Runtime (moli CDP, Chrome 145, cookie `crm_session`):
  - con sesión → `url=/ruta-inexistente-abc`, `[data-testid="not-found"]`
    presente, h1 "Página no encontrada";
  - sin sesión → misma pantalla, misma URL.

## Out of scope

- Cambiar el layout de la 404 (`layout: "auth"`): se deja como está, es
  coherente con las páginas públicas y con lo que ya define §12.2.
- Rediseñar la pantalla de 404 (copy, ilustración): no se pidió.
- Revisar el resto de rutas `guest` por el mismo motivo: la única con
  `guest` sin `public` además de la 404 es `/login` y
  `/login-verification`, donde el rebote es el comportamiento correcto.
