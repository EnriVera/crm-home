import type { EmailSender, EmailMessage } from "../../domain/ports/email-sender";

export function createConsoleEmailSender(): EmailSender {
  return {
    async send(message: EmailMessage): Promise<void> {
      console.info("[Email]", {
        from: message.from,
        to: message.to,
        subject: message.subject,
        body: message.body,
      });
    },
  };
}
