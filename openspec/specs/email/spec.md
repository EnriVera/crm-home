# Email Specification

> Dominio nuevo introducido por el change `transactional-email`. Define el
> paquete compartido `packages/email` (`@crm/email`) que aloja las plantillas de
> email transaccional como componentes Octane `.tsrx`, su tooling de
> compilación/preview y la primera plantilla del sistema: el email OTP de
> autenticación con copy en español y fallback de texto plano.
> Fuente: proposal §3 (alcance `packages/email`), design D1 (precompile a JS
> vía vite library-mode + `octane/compiler/vite`), D2 (verificación npm
> bloqueante), D4 (puerto `EmailTemplateRenderer` y copy OTP) y §3 (layout de
> archivos).

## Purpose

Define el paquete compartido `packages/email` (`@crm/email`) que aloja las
plantillas de email transaccional como componentes Octane `.tsrx`, su tooling de
compilación/preview y la primera plantilla del sistema: el email OTP de
autenticación con copy en español y fallback de texto plano. Es la fundación
sobre la que futuros changes añadirán más plantillas (bienvenida, reset,
facturación); este change solo entrega la plantilla OTP.

## Requirements

### Requirement: Paquete @crm/email con plantillas .tsrx precompiladas a JS

El workspace DEBE incluir un paquete nuevo `packages/email` (nombre `@crm/email`)
siguiendo las convenciones de los paquetes existentes: `private: true`,
`type: module`, dependencia consumida como `workspace:*` y `tsconfig.json` que
extiende `@crm/tsconfig`. El paquete DEBE compilar sus componentes `.tsrx` a
módulos JavaScript ESM consumibles por Bun mediante un script `build` propio
basado en `vite` en modo librería con el plugin `octane/compiler/vite`, y su
`package.json` DEBE apuntar su entrypoint al artifact compilado (no a los
fuentes `.tsrx`) junto con un `dist/index.d.ts`. Los consumidores (`apps/api`)
NUNCA DEBEN importar archivos `.tsrx` directamente dentro de código empaquetado
por nitro: el consumo es siempre del artifact precompilado, alineado con la
dependencia `^build` de turborepo. El paquete DEBE declarar `@octanejs/email`
como dependencia con versión exacta pineada.

#### Scenario: Build del paquete produce artifact consumible

- GIVEN el workspace instalado y `packages/email` con la plantilla OTP
- WHEN se ejecuta el `build` del paquete (directo o vía `turbo run build`)
- THEN se genera el entrypoint JavaScript ESM declarado en `package.json` y un
  script Bun en `apps/api` puede importar el componente OTP desde `@crm/email`
  sin pipeline vite ni registro de compiler en runtime

#### Scenario: turbo respeta la dependencia de build

- GIVEN el `turbo.json` del workspace
- WHEN se ejecutan `test` o `typecheck` en `apps/api`
- THEN el `build` de `packages/email` se ha ejecutado antes (dependencia
  `^build`) y el artifact compilado está disponible para el consumo

### Requirement: Tooling de desarrollo y exportación con @octanejs/email-cli

El paquete `@crm/email` DEBE incluir tooling propio basado en
`@octanejs/email-cli` (declarado como devDependency con versión exacta) con
scripts para previsualizar y exportar las plantillas durante el desarrollo, y un
script `typecheck` que valide los componentes `.tsrx` con `tsrx-tsc`
(invocado con `--noEmit -p tsconfig.typecheck.json`). El typecheck del paquete
DEBE pasar de forma aislada (`bun run typecheck` en `packages/email`) y como
parte del pipeline del workspace.

#### Scenario: Typecheck del paquete aislado

- GIVEN el paquete `packages/email` instalado con sus dependencias
- WHEN se ejecuta su script `typecheck`
- THEN los componentes `.tsrx` typecheckean sin errores con el tooling tsrx

#### Scenario: Exportación de la plantilla OTP en desarrollo

- GIVEN la plantilla OTP en `packages/email/src/templates/`
- WHEN se ejecuta el script de exportación/preview del paquete
- THEN se obtiene el HTML renderizado de la plantilla sin levantar `apps/api`

### Requirement: Plantilla OTP con copy en español y fallback de texto plano

El paquete DEBE incluir la plantilla `otp-email` como componente `.tsrx` que
recibe el código OTP como prop. Todo el copy visible DEBE estar en español
(`language_ui: es`). El asunto DEBE ser "Tu código de acceso". El cuerpo HTML
DEBE presentar el código de 6 dígitos de forma visualmente destacada (el código
es el elemento principal del email), DEBE indicar que el código expira en 10
minutos (coherente con la expiración server-side de la spec `api-auth`) y DEBE
incluir el aviso "Si no lo solicitaste, ignorá este mensaje." (o redacción
equivalente). La plantilla DEBE tener una versión alternativa en texto plano
que incluya el código, la expiración y el mismo aviso, usable como fallback
`text/plain` por los clientes de correo.

#### Scenario: Código destacado y copy completo en el HTML

- GIVEN la plantilla `otp-email`
- WHEN se renderiza con el código `"041283"`
- THEN el HTML contiene el código `041283` con el cero inicial preservado como
  elemento visualmente destacado, el aviso de expiración de 10 minutos y el
  disclaimer de "ignorá este mensaje", todo en español

#### Scenario: Fallback de texto plano equivalente

- GIVEN la plantilla `otp-email`
- WHEN se obtiene su versión de texto plano con el código `"041283"`
- THEN el texto incluye el código, la expiración de 10 minutos y el aviso de
  ignorar el mensaje si no fue solicitado, sin markup HTML

### Requirement: Snapshot del render de la plantilla OTP

El paquete DEBE incluir un test ejecutable con `bun test` que renderice la
plantilla OTP con un código fijo vía el render real de `@octanejs/email` y
compare el HTML resultante contra un snapshot (golden) versionado, de modo que
cualquier regresión de copy o estructura visual falle el test. El snapshot DEBE
poder actualizarse de forma explícita cuando el cambio de copy sea intencional.

#### Scenario: Regresión de copy detectada por el snapshot

- GIVEN el snapshot versionado del render de `otp-email`
- WHEN alguien modifica el copy o la estructura de la plantilla y corre
  `bun test`
- THEN el test del snapshot falla hasta que el snapshot se actualice
  explícitamente
