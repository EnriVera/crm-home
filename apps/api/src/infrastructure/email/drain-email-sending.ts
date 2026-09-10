import type { EmailSender }
  from "../../domain/ports/email-sender";
import type { EmailSendingRepository }
  from "../../domain/ports/email-sending-repository";
import { EmailSendError } from "./email-send-error";

/**
 * Resultado del ciclo de drenaje para tests y métricas.
 */
export interface DrainResult {
  processed: number;
  sent: number;
  failed: number;
  /** Mensajes que NO se marcan como sent/failed porque el error fue retryable. */
  pending: number;
}

export interface DrainEmailSendingDeps {
  repository: EmailSendingRepository;
  sender: EmailSender;
  /** Tope de mensajes por corrida. */
  limit?: number;
  /** Logger opcional (para tests). Solo recibe ids, nunca to/subject/body. */
  logger?: {
    warn: (message: string, context?: Record<string, unknown>) => void;
    error: (message: string, context?: Record<string, unknown>) => void;
  };
}

/**
 * Drena hasta `limit` mensajes pendientes. Para cada uno:
 * - éxito → `markSent`
 * - `EmailSendError { retryable: true }` → se deja en `pending` (sin transición)
 * - `EmailSendError { retryable: false }` → `markFailed`
 * - cualquier otro error → `markFailed` (política conservadora)
 *
 * Importante: en ningún caso se loguean `to`, `subject` ni `body` (PRD §9). Solo
 * se loguean el id del mensaje y la clasificación del error.
 */
export async function drainEmailSending(
  deps: DrainEmailSendingDeps,
): Promise<DrainResult> {
  const limit = deps.limit ?? 100;
  const logger = deps.logger ?? console;
  const pending = await deps.repository.findPending(limit);

  let sent = 0;
  let failed = 0;
  let leftPending = 0;

  for (const message of pending) {
    try {
      await deps.sender.send({
        from: message.from,
        to: message.to,
        subject: message.subject,
        body: message.body,
        // `body` contiene el HTML renderizado por `RequestOtp`; lo enviamos
        // también como `html` para que el adapter SMTP use text/html.
        html: message.body,
      });
      await deps.repository.markSent(message.id);
      sent += 1;
    } catch (error) {
      if (error instanceof EmailSendError && error.retryable) {
        // Dejar pendiente para reintento en la próxima corrida.
        leftPending += 1;
        logger.warn("[email-sending] retryable send error; leaving pending", {
          id: message.id,
          errorName: error.name,
        });
        continue;
      }

      await deps.repository.markFailed(message.id);
      failed += 1;
      logger.error("[email-sending] send failed; marked failed", {
        id: message.id,
        errorName:
          error instanceof Error ? error.name : typeof error,
      });
    }
  }

  return {
    processed: pending.length,
    sent,
    failed,
    pending: leftPending,
  };
}
