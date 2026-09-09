# Delta for Web Auth UI

> Change: `backend-auth`. Modificación acotada alrededor del adapter RPC del
> verifier y del wiring de `requestOtp` en `/login`: el puerto `OtpVerifier`,
> el contrato `Verdict`, las constantes (6 dígitos / 5 intentos / 10 min), la
> máquina OTP y la UI quedan INTACTOS.

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Máquina de estados OTP tras el puerto OtpVerifier

La verificación DEBE modelarse como una máquina de estados
(`idle → ready → submitting → error | expired`) implementada sobre
`@octanejs/xstate`/`xstate` (bindings-status: Completo, con soporte SSR vía
`getServerSnapshot`), dando a xstate un consumidor real en web. La migración a
xstate es la opción por defecto; si design documenta una razón técnica concreta
para mantener la FSM pura en TS, DEBE quedar registrada la decisión y el motivo
en el design del change (requisito condicional) — en ese caso xstate queda
instalado como base fundacional sin consumidor propio aún. En ambos casos: el
contador de intentos (máximo 5, PRD §8.1) y la expiración (10 minutos, PRD
§8.1) DEBEN seguir siendo DATOS de la máquina — nunca strings en componentes;
el submit DEBE llamar al puerto `OtpVerifier { verify(code): Promise<Verdict>
}`; las constantes (`OTP_MAX_ATTEMPTS`, etc.) y el puerto DEBEN preservarse;
este change DEBE inyectar el verifier real vía RPC (`createRpcOtpVerifier`) en
el punto de composición único, sin tocar la UI ni la máquina, y el servidor
pasa a ser la fuente de verdad de intentos y expiración (la máquina refleja el
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
