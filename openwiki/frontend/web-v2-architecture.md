---
type: "Referencia"
title: "Arquitectura del frontend web-v2 (Vue 3)"
openwiki_generated: true
verified:
  - by: openwiki/0.7.2
    at: 2026-10-27T02:48:33.191Z
sources:
  - id: openwiki-source-3609df6a9246a9c802593f49
    resource: repo://apps/web-v2/eslint.config.ts
  - id: openwiki-source-432409bf2e65664c2f474c4e
    resource: repo://apps/web-v2/src/app/boot.ts
  - id: openwiki-source-dc31e7b97af97f994d6f09c3
    resource: repo://apps/web-v2/src/app/main.ts
  - id: openwiki-source-1a699ecd3e0ccd510f93aaf3
    resource: repo://apps/web-v2/src/router/index.ts
  - id: openwiki-source-d8bfefaa39817c181e658114
    resource: repo://apps/web-v2/src/router/routes/(authed)/route.tsx
  - id: openwiki-source-9e8a9cbaa4c1e62650c282ef
    resource: repo://apps/web-v2/src/router/routeTree.gen.ts
  - id: openwiki-source-50d4ec7cd42755abeb7ed9bb
    resource: repo://apps/web-v2/src/shared/composables/use-list-tasks.ts
  - id: openwiki-source-7e7ea06b0ee3d583d67eab7d
    resource: repo://apps/web-v2/src/shared/vendor/forms/index.ts
  - id: openwiki-source-ceda04241dcb1b84cf07b169
    resource: repo://apps/web-v2/src/shared/vendor/orpc/client.ts
  - id: openwiki-source-edad86071faf37092af9148c
    resource: repo://apps/web-v2/src/shared/vendor/orpc/query.ts
  - id: openwiki-source-d7d19e3cf532a5679567046f
    resource: repo://apps/web-v2/src/shared/vendor/zag/index.ts
  - id: openwiki-source-cd3dccc8ae1f2ae0ca14c561
    resource: repo://apps/web-v2/src/stores/auth.ts
  - id: openwiki-source-ceac48ab12912b5f4a656531
    resource: repo://apps/web-v2/src/ui/molecules/edit-task-drawer/EditTaskDrawer.vue
  - id: openwiki-source-4cfa4017f9813ee7a0cbf746
    resource: repo://apps/web-v2/vite.config.ts
  - id: openwiki-source-9294d2b37f1effb115574c4d
    resource: repo://apps/web/src/lib/nav/routes.ts
generated: { by: "pi", at: "2026-10-27T02:48:33.191Z" }
---


# Arquitectura del frontend web-v2 (Vue 3)

`apps/web-v2` es el frontend activo: Vue 3 + TypeScript, router de archivos de
TanStack, TanStack Query para el estado remoto, Pinia para el estado de
sesión y capa de dominio propia.

## Bootstrap

`src/app/main.ts` fija el orden de instalación, que importa:

1. `createApp(App)`;
2. **Pinia antes que cualquier otra cosa**, porque el boot de autenticación
   llama `useAuthStore()` y la app no arranca si el store no está instalado;
3. `VueQueryPlugin` con un `QueryClient` configurado con `retry: 1`,
   `refetchOnWindowFocus: false` y `staleTime` de 30 segundos;
4. el plugin de i18n;
5. `await bootAuth()`;
6. `app.mount("#app")`.

El paso 5 es la clave: el boot ocurre **antes** del montaje, para que cuando
el router resuelva la primera ruta el store de autenticación ya esté
hidratado. `src/app/boot.ts` lo implementa con un *single-flight* (guarda la
promesa) para que varios componentes no disparen consultas de sesión
concurrentes, y marca `isBooted` al terminar.

`App.vue` monta la pila de providers (tema, i18n, toasts) y el
`RouterProvider`. TanStack Router no es un plugin de Vue: se pasa como
prop al árbol.

## Capas y purity

El código de `src` está partido en:

| Capa | Contenido |
| --- | --- |
| `domain/` | entidades, políticas y puertos; sin dependencias externas |
| `application/` | casos de uso como fábricas `makeX(repo) => (input) => Result` |
| `infrastructure/` | repositorios (implementación oRPC) y mapeo de errores |
| `ui/` | atoms, molecules, organisms, pages, templates |
| `shared/` | composables, vendor, utilidades |
| `router/`, `stores/`, `app/` | ruteo, estado global y bootstrap |

La disciplina se verifica en el lint, no por convención:

- **Vendor encapsulation**: los paquetes de terceros solo se pueden importar
  dentro de `src/shared/vendor/<tool>/`; el resto de `src` recibe un error
  que pide crear un wrapper en el vendor.
- **Purity de `domain/`**: ni terceros ni `xstate` ni `effect`.
- **Purity de `application/`**: lo mismo, sin `xstate` ni `effect`.

## Router

El router se construye con el árbol de rutas generado por el plugin de Vite
(`src/router/routeTree.gen.ts`) y usa **historial de navegador**, no de
memoria, para que la URL refleje la ruta activa y funcionen el refresh, el
atrás/adelante y los deep links.

Las rutas públicas son `/`, `/login`, `/login-verification`, `/cookies`,
`/privacy` y `/terms`. Las autenticadas viven en el grupo `(authed)`
(dashboard, tasks, tasks-config, schedules, clients, config), cuyo `route.tsx`
aplica el `AppShell` y la guarda:

- si el boot sigue en vuelo, la guarda espera;
- si no hay sesión, guarda el destino en un store de redirect (no en la URL,
  para no ensuciar la barra de direcciones) y redirige a `/login`;
- el destino solo se acepta si es un path relativo, lo que evita
  open-redirect.

## Estado

Cuatro stores de Pinia:

| Store | Responsabilidad |
| --- | --- |
| `auth` | sesión y perfil, `isBooted`, `isAuthenticated`, reset |
| `redirect` | destino transitorio posterior al login |
| `theme` | preferencia de tema persistida e hidratación síncrona |
| `ui` | estado del sidebar |

La fuente de verdad de la sesión sigue siendo la cookie `httpOnly` del
servidor; el store es un espejo en memoria.

## Datos

El único lugar del proyecto que importa `@orpc/client` es
`src/shared/vendor/orpc/client.ts`: crea un `RPCLink` con la URL base
`VITE_API_URL` (por defecto `http://localhost:3000`) más `/rpc`, y un `fetch`
que siempre manda `credentials: "include"` para que viaje la cookie de
sesión.

El cliente está tipado de forma genérica (`NestedClient<Record<string,
unknown>>`) a la espera de que el backend exponga el tipo de su router.

El acceso a datos real no pasa por los helpers `useOrpcQuery`/`useOrpcMutation`
del vendor —no tienen consumidores— sino por composables propios que usan
TanStack Query: `use-list-tasks`, `use-create-task`, `use-list-task-states`,
`use-update-task-state` (movimiento optimista del kanban), `use-task-form-listers`
(con debounce de 250 ms) y los de auth y tema. Los errores del dominio se
traducen a `Error` mediante una clase local para que TanStack Query pueda
reaccionar.

## Formularios y componentes

Los formularios usan `vee-validate` con `toTypedSchema` sobre los esquemas de
`@crm/contract` (por ejemplo `TaskInput`), a través de un wrapper en
`shared/vendor/forms`. Las primitivas de interfaz vienen de **Zag**
(dialog, sheet, popover, dropdown, pin-input para el OTP), y la capa visual
propia está en `ui/` (Button, BaseView, KanbanBoard, TaskGrid, TaskCard,
EditTaskDrawer) con componentes de plantilla (`app-shell`, `auth-layout`).

## Qué falta

El frontend todavía no implementa varios dominios del backend. Están
**vacíos** los directorios `application/{client,config,schedule}`,
`domain/{client,config,finance,schedule}` (entidades, puertos y value
objects), `domain/task/{events,policies}`, `infrastructure/{persistence,platform,realtime}`,
`router/{guards,machine}` y los vendors de charts, datepicker, dnd,
resizable y richtext.

En el árbol de rutas no existen `/incomes`, `/expenses`, `/transfers` ni el
detalle `/tasks/:id`, que sí tiene el frontend legacy. Tampoco hay runner de
e2e (Playwright), pese a que el PRD lo contempla como mecanismo de
verificación del cutover.
