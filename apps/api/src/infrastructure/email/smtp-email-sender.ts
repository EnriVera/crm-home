import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type {
  EmailMessage,
  EmailSender,
} from "../../domain/ports/email-sender";
import { EmailSendError } from "./email-send-error";
import type { SmtpConfig } from "./parse-smtp-url";

/**
 * Minimal surface that the SMTP adapter relies on from a nodemailer transporter.
 * Defining it as a structural type lets us inject fakes in tests without pulling
 * in the full nodemailer type machinery.
 */
export interface SmtpTransporter {
  sendMail(payload: Record<string, unknown>): Promise<unknown>;
  verify(): Promise<boolean>;
  close(): Promise<void>;
}

export interface CreateSmtpEmailSenderDeps {
  /**
   * Inyectado para tests. En producción se construye vía `nodemailer.createTransport`.
   */
  transporter?: SmtpTransporter;
  /**
   * Configuración SMTP parseada (resultado de `parseSmtpUrl`). Se usa para
   * construir el transporter por defecto cuando `transporter` no se inyecta.
   */
  config?: SmtpConfig;
  /**
   * Remitente por defecto cuando `EmailMessage.from` está vacío.
   */
  fromFallback: string;
}

/**
 * Códigos de error de red/transporte considerados transitorios. La fuente es la
 * documentación de nodemailer + categorización interna: errores de conexión y DNS
 * son recuperables; los demás (configuración inválida, payload rechazado, etc.)
 * se marcan como permanentes para no atascar la cola.
 */
const RETRYABLE_ERROR_CODES: ReadonlySet<string> = new Set([
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "ECONNRESET",
  "EPIPE",
  "EAI_AGAIN",
]);

/**
 * Adapter SMTP sobre nodemailer. Mapea errores del transporte a
 * `EmailSendError { retryable }` para que la task de drenaje decida si deja el
 * mensaje en `pending` (reintento) o lo marca como `failed` (permanente).
 *
 * Contratos observados:
 * - `body` se mantiene para compatibilidad con callers existentes.
 * - Si `html` está presente, se envía como `text/html`.
 * - Si `text` está presente, se añade como alternativa `text/plain` (multipart).
 * - Si no hay `html` ni `text`, se envía `body` como `text/plain`.
 */
export function createSmtpEmailSender(
  deps: CreateSmtpEmailSenderDeps,
): EmailSender {
  const { transporter, config, fromFallback } = deps;

  return {
    async send(message: EmailMessage): Promise<void> {
      const from = message.from?.trim() ? message.from : fromFallback;

      const payload: Record<string, unknown> = {
        from,
        to: message.to,
        subject: message.subject,
        encoding: "utf-8",
      };

      if (message.html) {
        payload.html = message.html;
      }
      if (message.text) {
        payload.text = message.text;
      }
      if (!message.html && !message.text) {
        payload.text = message.body;
      }

      try {
        const t = transporter ?? buildDefaultTransporter(config);
        await t.sendMail(payload);
      } catch (error) {
        throw mapSendError(error);
      }
    },
  };
}

function buildDefaultTransporter(config?: SmtpConfig): Transporter {
  if (!config) {
    throw new Error(
      "SMTP transporter no inicializado: ni `transporter` ni `config` fueron provistos",
    );
  }
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
    pool: true,
    maxConnections: 2,
    maxMessages: 50,
    connectionTimeout: 5_000,
    greetingTimeout: 5_000,
    socketTimeout: 10_000,
  });
}

function mapSendError(error: unknown): EmailSendError {
  const err = error as Error & {
    code?: string;
    responseCode?: number;
  };
  const message = err?.message ?? "Unknown SMTP error";
  const code = err?.code;
  const responseCode = err?.responseCode;

  let retryable = false;
  if (code && RETRYABLE_ERROR_CODES.has(code)) {
    retryable = true;
  } else if (typeof responseCode === "number") {
    // 4xx = transitorio (rate-limit del servidor, mailbox locked, etc.).
    // 5xx = permanente (destino desconocido, autenticación fallida, etc.).
    retryable = responseCode >= 400 && responseCode < 500;
  }

  return new EmailSendError(`SMTP send failed: ${message}`, retryable, error);
}
