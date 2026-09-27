# Feature: Empty / loading state consistente en todas las secciones

**Branch base**: develop
**Status**: En progreso
**Owner**: el Gentleman
**Reportado por**: usuario (2026-09-27 02:00)

## Síntoma

Cuando el usuario navega a una sección como `/tasks` vía SPA navigation
(click en el sidebar), ve el skeleton de loading PARA SIEMPRE. El
backend responde `[]` (no hay datos) pero el frontend nunca muestra el
empty state.

Después de hard reload SÍ funciona correctamente.

## Diagnóstico (paso 2 ODD) — actualizado tras reproducir el bug

**Reproducido en vivo con `agent-browser` + usuario `empty-user@crm.local`:**

- `/tasks`, `/clients`, `/incomes`, `/expenses`, `/transfers`, `/schedules`
  vía SPA navigation → todas muestran skeleton stuck.
- Hard reload a cualquiera de esas URLs → empty state correcto.
- Network calls: 0 RPC requests disparados al navegar por SPA. Solo se
  ve el SSR HTML inicial (que tiene `loading=true`).

**Causa raíz:** `apps/web/src/lib/nav/client-router.tsrx` implementa
SPA navigation haciendo `fetch(path)` + `currentMain.innerHTML =
newMain.innerHTML`. NO usa el reconciler de Octane. El HTML del SSR
incluye el skeleton (`loading=true` initial state), pero el componente
nunca monta/rehidrata en cliente → `useEffect` nunca corre → el RPC
nunca se dispara → loading queda en true para siempre.

El `re-import` del módulo del route después del swap no es suficiente:
octane no detecta el nuevo DOM como algo que deba hidratar (no hay
marcador de hidratación que sobreviva al `innerHTML =`).

## Decisión de diseño (a confirmar con usuario)

El hook `useFetch` + componente `DataList` por sí solos NO arreglan
este bug — son refactors de estilo que ayudan a consistencia futura.

La fix correcta es a nivel de `ClientRouter`. Opciones:

### Opción A (recomendada): dispatch evento custom después del swap

Después de `currentMain.innerHTML = newMain.innerHTML`, dispatch:

```ts
globalThis.dispatchEvent(new CustomEvent("app:route-changed", {
  detail: { path, prevPath: initialPath.current },
}));
```

Las páginas escuchan el evento en un `useEffect` y refetchan:

```ts
useEffect(() => {
  const handler = () => refetch();
  globalThis.addEventListener("app:route-changed", handler);
  return () => globalThis.removeEventListener("app:route-changed", handler);
}, [refetch]);
```

Pros: cambio mínimo y localizado, no toca la lógica de hidratación.
Contras: cada página tiene que escuchar el evento (refactor mecánico).

### Opción B: usar `location.assign(path)` (full reload)

Sacrificar el SPA feel a cambio de correctness. Pros: cero bugs.
Contras: pierde la navegación rápida y el foco/scroll restoration que
ya funciona.

### Opción C: hacer hidratación real con el reconciler de Octane

Cambiar el `ClientRouter` para que el shell use `<Outlet>`-style
rendering (componente que monta/descuelga según el path actual). Es
más invasivo — toca el shell completo.

## Recomendación

**Opción A** (evento custom) — pragmática, contenida, y compatible con
el resto del código. Complementada con:

- Hook `useFetch` para centralizar el patrón de fetch + cancelled +
  finally.
- Componente `DataList` / `EmptyState` reutilizable.
- Migración de las 10 páginas para consistencia.

## Scope

**Archivos a tocar:**

- `apps/web/src/lib/nav/client-router.tsrx` (dispatch evento)
- (opcional) `apps/web/src/hooks/use-fetch.ts` — nuevo
- (opcional) `apps/web/src/components/molecules/empty-state.tsrx` —
  nuevo
- `apps/web/src/components/pages/*.tsx` (10 páginas) — escuchan el
  evento y refetchan

## Criterios de aceptación

1. Navegar a `/tasks`, `/clients`, `/incomes`, `/expenses`, `/transfers`,
   `/schedules`, `/tasks-config` vía SPA → ver empty state correcto en
   cada una (no skeleton stuck).
2. Hard reload a cualquier URL sigue funcionando como antes.
3. Network: SPA navigation dispara exactamente 1 set de RPCs (no se
   duplican).
4. No hay regresión: navegación desde `/dashboard` a `/tasks` y back
   sigue siendo fluida.

## Out of scope

- Refactor de `BaseView` (lo usan tasks/kanban — fuera de alcance)
- Dashboard empty state (no es lista, ya tiene su propio summary)
- Auth pages (login, login-verification — no aplica)
- Detail pages (`/tasks/:id`, `/clients/:id`) — same root cause, pero
  se evalúa en segunda pasada.
