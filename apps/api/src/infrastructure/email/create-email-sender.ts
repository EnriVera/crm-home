import type { EmailSender } from "../../domain/ports/email-sender";
import { createConsoleEmailSender } from "./console-email-sender";
import { parseSmtpUrl } from "./parse-smtp-url";
import { createSmtpEmailSender } from "./smtp-email-sender";

/**
 * Variables de entorno relevantes para el selector. Acepta tanto la URL
 * consolidada (`SMTP_URL`) como las variables discretas tradicionales; en este
 * change solo se usa `SMTP_URL` (las discretas quedan como espacio futuro).
 */
export interface EmailSenderEnv {
  SMTP_URL?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_SECURE?: string;
}

/**
 * `EmailSender` enriquecido con un discriminador `kind` para que callers
 * (tests, métricas, debugging) puedan saber qué adapter está activo sin
 * importar la implementación concreta.
 */
export interface TaggedEmailSender extends EmailSender {
  readonly kind: "smtp" | "console";
}

const DEFAULT_FROM_FALLBACK = "auth@crmhome.app";

/**
 * Selector por env. Política MVP:
 * - `SMTP_URL` con valor no vacío (tras trim) → adapter SMTP.
 * - En cualquier otro caso → adapter consola (preserva el comportamiento previo).
 *
 * Las variables discretas se reservan para una iteración futura; mientras
 * tanto, su presencia sin `SMTP_URL` no activa SMTP.
 */
export function createEmailSender(env: EmailSenderEnv): TaggedEmailSender {
  const url = env.SMTP_URL?.trim();

  if (url) {
    const config = parseSmtpUrl(url);
    const sender = createSmtpEmailSender({
      config,
      fromFallback: DEFAULT_FROM_FALLBACK,
    });
    return Object.assign(sender, { kind: "smtp" as const });
  }

  const sender = createConsoleEmailSender();
  return Object.assign(sender, { kind: "console" as const });
}
