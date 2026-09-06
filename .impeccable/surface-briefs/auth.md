# Surface brief — auth (login + verificación OTP)

**Target:** `apps/web/src/routes/__auth.tsrx` + `pages/login-page` +
`pages/login-verification-page` + `vendor/otp-input`
**Modo:** Operate con onboarding liviano — el login es la **primera puerta**
del producto: llevar al usuario a su primer valor con cero fricción.
**Mundo:** el de `DESIGN.md` (fijado por el usuario).

- **Audiencia/escena:** freelancer que quiere entrar a trabajar; puede ser su
  primer contacto con el producto (registro implícito passwordless, §8.1).
- **Job:** entrar. Un email, un código de 6 dígitos, adentro.
- **Acción:** escribir email → escribir código. Nada más compite por atención.
- **Contenido:** copy i18n `auth.login.*` / `auth.otp.*` que anticipa qué va a
  pasar ("te enviamos un código de 6 dígitos a <email>"); footer con links
  legales (`/terms`, `/privacy`, `/cookies` — destinos llegan en otro change).
- **Constraints:** tema según SO (páginas públicas, §6.8); una única acción
  primaria por pantalla; OTP con ceros a la izquierda (`inputmode="numeric"`,
  nunca `type="number"`); errores/expiración con tokens de estado y mensajes
  claros (§8.1: 10 min, 5 intentos); UI sola — verificador fake tras el puerto
  `OtpVerifier` hasta el change de auth.
- **Decisión memorable:** card única centrada `max-w-sm`; la pantalla OTP
  nombra el email destino y deja volver sin perder contexto.

## Direction contract

THESIS: la puerta más pequeña posible — un campo, un botón; se rechaza el
"auth hero" con ilustración/marketing lateral del default de categoría.
OWN-WORLD: card `surface` sin sombra sobre `background`, un solo verde (botón
primario), Poppins, mensajes de estado con tokens `error`/`success`.
STORY: el visitante entiende en segundos que entra con su email, que el código
llega a su casilla, y que un error se corrige sin drama.
FIRST VIEWPORT: card centrada vertical/horizontal con título, subtítulo que
explica el paso, input email y botón primario de ancho completo; footer legal
discreto debajo; en OTP, 6 celdas con foco en la primera.
FORM: card de auth minimalista, de la lista propia (mundo fijado por el
usuario; brief-pinned, sin ronda de direcciones).
FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, DESIGN.md, and every shipping raster carrying its
provenance.
