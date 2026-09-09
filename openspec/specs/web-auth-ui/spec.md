# Web Auth UI Specification

> Change: `frontend-foundation` · Dominio nuevo (spec completa).
> Deriva de las decisiones D1 y D9 del design. Flujo de referencia: PRD §8.1.
> Addendum (stack-alignment): D1 queda **superseded por D-SA1** — `OtpInput`
> encapsula `@octanejs/zag` (pin-input); el contrato `OtpInputProps` es
> idéntico y esta spec sigue vigente sin cambios de requisitos.
> Brief visual: `.impeccable/surface-briefs/auth.md`. UI sola: SIN backend de
> auth (OTP real, sesión, cookies y rate limiting son de otro change).

## Purpose

Define las pantallas públicas de autenticación de CRM-HOME como UI pura: layout
público con footer legal, `/login` con validación client-side de email, y
`/login-verification` con el wrapper `OtpInput` y una máquina de estados OTP en
TS puro detrás del puerto `OtpVerifier` (hoy `FakeOtpVerifier`), reflejando en
la UI las reglas del PRD §8.1 (6 dígitos con ceros a la izquierda, expiración de
10 minutos, máximo 5 intentos, mensajes claros) sin backend real.

## Requirements

### Requirement: Layout público con footer legal

`apps/web` DEBE incluir un layout público minimalista (`routes/__auth.tsrx`)
con contenido centrado y un footer con links a `/terms`, `/privacy` y
`/cookies` (labels i18n). Los destinos legales quedan FUERA de este change: los
links DEBEN existir como anchors reales y NO DEBEN crearse páginas placeholder
legales. Las páginas bajo este layout DEBEN seguir el tema del SO sin toggle
(PRD §6.8).

#### Scenario: Footer legal presente

- GIVEN `/login` renderizada
- WHEN se inspecciona el footer
- THEN existen los tres anchors a `/terms`, `/privacy` y `/cookies` con labels del catálogo i18n

#### Scenario: Sin toggle de tema en páginas públicas

- GIVEN cualquier página bajo el layout auth
- WHEN se inspecciona la UI
- THEN no hay toggle de tema y el tema aplicado proviene de `prefers-color-scheme`

### Requirement: Pantalla /login con validación client-side

`/login` DEBE presentar una card centrada con título, subtítulo, un campo email
(`type="email"`, `autocomplete="email"`) y un único botón primario (Brand
Commitments: una acción primaria por pantalla). La validación de formato DEBE
ser client-side con `isValidEmail()` en TS puro testeable; el error DEBE
mostrarse inline bajo el campo con `aria-invalid` y `aria-describedby`. Al
enviar un email válido, DEBE invocar `requestOtp` vía RPC ANTES de navegar
(gestionando estado de carga), y SOLO en caso de éxito navegar a
`/login-verification?email=<email>` usando `URLSearchParams`/encoding estándar
(nuqs NO PUEDE usarse: es React). Si `requestOtp` falla (rate-limit o error de
red), DEBE mostrarse un mensaje de error inline i18n sin navegar; la UI, la
validación y los mensajes existentes NO DEBEN cambiar de forma.
(Previously: al enviar un email válido se navegaba directamente a
`/login-verification?email=<email>`, sin backend de auth.)

#### Scenario: Email inválido muestra error accesible

- GIVEN `/login` con el campo email conteniendo `no-es-un-email`
- WHEN el usuario envía el formulario
- THEN aparece el mensaje de error inline i18n, el campo tiene `aria-invalid="true"` y `aria-describedby` apuntando al mensaje, y NO hay navegación ni llamada RPC

#### Scenario: Email válido navega a verificación tras requestOtp exitoso

- GIVEN `/login` con el email `ana@example.com` y `requestOtp` respondiendo éxito
- WHEN el usuario envía el formulario
- THEN se invoca `requestOtp` con ese email y la app navega a `/login-verification?email=ana%40example.com`

#### Scenario: Rate-limit de requestOtp muestra error inline sin navegar

- GIVEN `/login` con un email válido y `requestOtp` rechazado por rate-limit (429)
- WHEN el usuario envía el formulario
- THEN se muestra el mensaje de error inline i18n y NO hay navegación a `/login-verification`

### Requirement: Wrapper vendor/otp-input con contrato estable

El input de código DEBE ser el componente `OtpInput` de
`components/vendor/otp-input/`, único módulo del codebase que PUEDE importar el
binding de OTP y sus paquetes upstream (regla §9 de wrappers, reforzada en la
spec `vendor-bindings`). Su interfaz pública DEBE ser exactamente:

```ts
interface OtpInputProps {
  length?: number;            // default 6
  disabled?: boolean;
  invalid?: boolean;
  onComplete?: (code: string) => void;
  "aria-label"?: string;
}
```

El wrapper DEBE implementarse sobre el binding first-party, siendo la opción
preferida `@octanejs/zag` + `@zag-js/pin-input` (stack declarado §10; zag
pin-input v1.43.3 cubre `otp: true`/`autocomplete="one-time-code"`,
`onValueComplete`, `pattern` y paste de código SMS, y `@octanejs/zag` expone
`useMachine`/`normalizeProps` para Octane, eliminando la causa raíz del fallback
hand-rolled D1). La alternativa es `@octanejs/input-otp` (bindings-status:
Completo, controlled/uncontrolled y mobile-autofill) si zag pin-input diverge
del contrato en la práctica. La elección entre ambos es decisión de design; si
ambos bindings resultaran incompatibles con el runtime de Octane, el fallback
hand-rolled DEBE mantener exactamente la misma interfaz pública y la misma
máquina de estados UI (estado actual conocido y verde). La lógica de la máquina
DEBE ser testeable headless en TS puro (type, backspace, paste, `onComplete`);
si la máquina del binding no es headless-testeable, los tests DEBEN reescribirse
como tests de comportamiento del wrapper — nunca borrarse sin reemplazo.
(Previously: el wrapper era un fallback hand-rolled (D1) con máquina propia +
normalize-props, declarado como único módulo que podía importar
`@zag-js/pin-input`/`@zag-js/core`, con zagjs como base preferida aún no
viable.)

#### Scenario: Regla de wrapper auditable

- GIVEN el código de `src/`
- WHEN se inspeccionan los imports de `@octanejs/zag`, `@zag-js/*` o `@octanejs/input-otp`
- THEN aparecen únicamente bajo `components/vendor/otp-input/`

#### Scenario: Contrato público intacto tras el swap

- GIVEN el wrapper reimplementado sobre el binding elegido
- WHEN se inspeccionan los consumidores (`/login-verification`) y los tests de comportamiento
- THEN `OtpInputProps` es idéntica a la definida en esta spec y ningún consumidor requirió cambios de contrato

#### Scenario: Máquina testeable sin DOM

- GIVEN la máquina del pin-input (del binding si es headless-testeable, o el wrapper) creada headless
- WHEN se envían eventos de tipeo, backspace y paste
- THEN el estado interno refleja los valores esperados y `onComplete` se dispara al completar, sin DOM

### Requirement: Preservación de ceros a la izquierda y teclado numérico

`OtpInput` DEBE aceptar 6 dígitos preservando ceros a la izquierda
(PRD §8.1): las celdas DEBEN usar `inputmode="numeric"` y `pattern="[0-9]*"`, y
NO DEBEN usar `type="number"`. El portapapeles DEBE distribuir un pegado entre
celdas (`"041283"` → slots `["0","4","1","2","8","3"]`). El campo DEBE exponer
`autocomplete="one-time-code"` y ser operable por teclado (auto-avance,
backspace que retrocede).

#### Scenario: Pegado con ceros a la izquierda

- GIVEN el `OtpInput` vacío
- WHEN el usuario pega `041283`
- THEN las seis celdas quedan `0 4 1 2 8 3` y `onComplete` recibe el string `"041283"` (cero inicial preservado)

#### Scenario: Nunca type="number"

- GIVEN el markup del `OtpInput`
- WHEN se inspeccionan las celdas
- THEN ninguna usa `type="number"`; todas usan `inputmode="numeric"` con `pattern="[0-9]*"`

### Requirement: Máquina de estados OTP tras el puerto OtpVerifier

La verificación DEBE modelarse como una máquina de estados
(`idle → ready → submitting → error | expired`) implementada sobre
`@octanejs/xstate`/`xstate` (bindings-status: Completo, con soporte SSR vía
`getServerSnapshot`), dando a xstate un consumidor real en web. La migración a
xstate es la opción por defecto; si design documenta una razón técnica concreta
para mantener la FSM pura en TS, DEBE quedar registrada la decisión y el motivo
en el design del change (requisito condicional) — en ese caso xstate queda
instalado como base fundacional sin consumidor propio aún. En ambos casos: el
contador de intentos (máximo 5, PRD §8.1) y la expiración (10 minutos, PRD §8.1)
DEBEN seguir siendo DATOS de la máquina — nunca strings en componentes; el
submit DEBE llamar al puerto `OtpVerifier { verify(code): Promise<Verdict> }`;
las constantes (`OTP_MAX_ATTEMPTS`, etc.) y el puerto DEBEN preservarse; este
change DEBE inyectar el verifier real vía RPC (`createRpcOtpVerifier`) en el
punto de composición único, sin tocar la UI ni la máquina, y el servidor pasa a
ser la fuente de verdad de intentos y expiración (la máquina refleja el
`Verdict` recibido). Los tests de la máquina DEBEN mantener los mismos casos
contra un verifier falso inyectado — re-apuntados, nunca borrados sin
reemplazo. Los mensajes de error/expiración DEBEN mostrarse con los tokens de
estado del design system.
(Previously: el change inyectaba `FakeOtpVerifier` — siempre veredicto
`invalid` tras latencia simulada — y declaraba que el change de auth podría
inyectar el verifier real sin tocar la UI ni la máquina; este change ejecuta
ese swap.)

#### Scenario: Código inválido consume un intento

- GIVEN la máquina en `ready` con 5 intentos disponibles y un verifier (falso en tests) que responde `invalid`
- WHEN se envía un código de 6 dígitos
- THEN la máquina transita a `submitting` y luego a `error` con 4 intentos restantes y el mensaje i18n correspondiente

#### Scenario: Bloqueo al agotar intentos

- GIVEN la máquina con 0 intentos restantes
- WHEN el usuario intenta enviar otro código
- THEN la máquina NO llama al verifier y muestra el estado de bloqueo/expiración con su mensaje i18n

#### Scenario: Swap del verifier sin tocar UI

- GIVEN la pantalla de verificación compuesta con `createRpcOtpVerifier`
- WHEN el backend real responde un `Verdict`
- THEN la UI y la máquina funcionan sin cambios respecto del verifier falso

#### Scenario: Mismos casos de test verdes tras la migración

- GIVEN la máquina con el verifier real inyectado en producción y falsos en tests
- WHEN se ejecuta `bun test`
- THEN los casos de la máquina OTP (transiciones, intentos, expiración, veredictos) pasan con cobertura equivalente a los 9 tests previos

### Requirement: Pantalla /login-verification con contexto del email

`/login-verification` DEBE leer el `email` del query string: si falta, DEBE
mostrar un mensaje i18n con un link de vuelta a `/login`; si está presente, el
subtítulo DEBE mostrar el email destino. La pantalla DEBE incluir el `OtpInput`,
un link "volver" a `/login` y un texto de reenvío deshabilitado (fake, sin
backend). El copy DEBE explicar qué va a pasar (código de 6 dígitos enviado al
email), sin pasos ni claims inventados (onboarding liviano).

#### Scenario: Sin email en el query

- GIVEN `/login-verification` sin parámetro `email`
- WHEN se carga la página
- THEN se muestra el mensaje i18n de falta de email con un link a `/login` y no se presenta el flujo de código como válido

#### Scenario: Con email en el query

- GIVEN `/login-verification?email=ana%40example.com`
- WHEN se carga la página
- THEN el subtítulo muestra `ana@example.com`, el `OtpInput` está disponible y el texto de reenvío aparece deshabilitado

### Requirement: Adapter OtpVerifier real vía RPC

`apps/web` DEBE incluir un cliente RPC (`@orpc/client`, misma familia que
`@orpc/server`/`contract`) configurado con `credentials: 'include'` para que el
navegador envíe y reciba la cookie de sesión, y un adapter
`createRpcOtpVerifier(email): OtpVerifier` que capture el email en su closure
(el puerto solo recibe `code`) y traduzca la respuesta de `verifyOtp` al
`Verdict` existente (`valid | invalid | expired`) sin alterarlo. La inyección
del verifier real DEBE realizarse en el punto de composición único de
`otp-form.tsrx` como swap de una línea (reemplazo de `FakeOtpVerifier`), SIN
tocar la UI, la máquina OTP, el puerto ni las constantes.

#### Scenario: Swap del verifier sin tocar UI (canónico)

- GIVEN la pantalla de verificación compuesta originalmente con `FakeOtpVerifier`
- WHEN se inyecta `createRpcOtpVerifier(email)` en el punto de composición
- THEN la UI, la máquina, el puerto `OtpVerifier`, el contrato `Verdict` y las constantes funcionan sin cambios

#### Scenario: Veredicto del backend mapeado sin transformación

- GIVEN el adapter RPC del verifier
- WHEN el backend responde `expired` (código vencido) o `invalid` (intentos agotados o código erróneo)
- THEN el adapter devuelve exactamente ese `Verdict` a la máquina, que muestra los mensajes i18n existentes
