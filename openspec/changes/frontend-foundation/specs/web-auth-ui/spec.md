# Web Auth UI Specification

> Change: `frontend-foundation` · Dominio nuevo (spec completa).
> Deriva de las decisiones D1 y D9 del design. Flujo de referencia: PRD §8.1.
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
enviar un email válido, DEBE navegar a
`/login-verification?email=<email>` usando `URLSearchParams`/encoding estándar
(nuqs NO PUEDE usarse: es React).

#### Scenario: Email inválido muestra error accesible

- GIVEN `/login` con el campo email conteniendo `no-es-un-email`
- WHEN el usuario envía el formulario
- THEN aparece el mensaje de error inline i18n, el campo tiene `aria-invalid="true"` y `aria-describedby` apuntando al mensaje, y NO hay navegación

#### Scenario: Email válido navega a verificación

- GIVEN `/login` con el email `ana@example.com`
- WHEN el usuario envía el formulario
- THEN la app navega a `/login-verification?email=ana%40example.com`

### Requirement: Wrapper vendor/otp-input con contrato estable

El input de código DEBE ser el componente `OtpInput` de
`components/vendor/otp-input/`, único módulo del codebase que PUEDE importar
`@zag-js/pin-input`/`@zag-js/core` (regla §9 de wrappers). Su interfaz pública
DEBE ser:

```ts
interface OtpInputProps {
  length?: number;            // default 6
  disabled?: boolean;
  invalid?: boolean;
  onComplete?: (code: string) => void;
  "aria-label"?: string;
}
```

Si la base zagjs resultara incompatible con el runtime de Octane, el fallback
hand-rolled DEBE mantener exactamente la misma interfaz pública y la misma
máquina de estados UI. La lógica de la máquina DEBE ser testeable headless en
TS puro (type, backspace, paste, `onComplete`).

#### Scenario: Regla de wrapper auditable

- GIVEN el código de `src/`
- WHEN se inspeccionan los imports de `@zag-js/*`
- THEN aparecen únicamente bajo `components/vendor/otp-input/`

#### Scenario: Máquina testeable sin DOM

- GIVEN la máquina del pin-input creada headless
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

La verificación DEBE modelarse como una máquina de estados en TS puro
(`idle → ready → submitting → error | expired`) con el contador de intentos
(máximo 5, PRD §8.1) y la expiración (10 minutos, PRD §8.1) como DATOS de la
máquina — nunca strings en componentes. El submit DEBE llamar al puerto
`OtpVerifier { verify(code): Promise<Verdict> }`; este change DEBE inyectar
`FakeOtpVerifier` (siempre veredicto `invalid` tras latencia simulada, para
exhibir el estado de error), y el change de auth DEBE poder inyectar el
verifier real sin tocar la UI ni la máquina. Los mensajes de error/expiración
DEBEN mostrarse con los tokens de estado del design system.

#### Scenario: Código inválido consume un intento

- GIVEN la máquina en `ready` con 5 intentos disponibles y el `FakeOtpVerifier`
- WHEN se envía un código de 6 dígitos
- THEN la máquina transita a `submitting` y luego a `error` con 4 intentos restantes y el mensaje i18n correspondiente

#### Scenario: Bloqueo al agotar intentos

- GIVEN la máquina con 0 intentos restantes
- WHEN el usuario intenta enviar otro código
- THEN la máquina NO llama al verifier y muestra el estado de bloqueo/expiración con su mensaje i18n

#### Scenario: Swap del verifier sin tocar UI

- GIVEN la pantalla de verificación compuesta con `FakeOtpVerifier`
- WHEN se inyecta un verifier real vía RPC en el punto de composición
- THEN la UI y la máquina funcionan sin cambios

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
