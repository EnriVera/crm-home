import { defineTask } from "nitro/runtime";
import { createDatabase } from "../src/infrastructure/kysely/database";
import { KyselyEmailSendingRepository } from "../src/infrastructure/kysely/email-sending-repository";
import {
  createEmailSender,
  type EmailSenderEnv,
} from "../src/infrastructure/email/create-email-sender";
import { drainEmailSending } from "../src/infrastructure/email/drain-email-sending";

export default defineTask({
  meta: {
    name: "email-sending",
    description: "Drena la cola email_sending y envía los mensajes pendientes",
  },
  async run() {
    const databaseUrl = process.env.DATABASE_URL ?? "";
    if (!databaseUrl) {
      console.warn("[email-sending] DATABASE_URL no configurada; omitiendo");
      return { result: "skipped" };
    }

    const db = createDatabase(databaseUrl);
    const repository = new KyselyEmailSendingRepository(db);

    const env: EmailSenderEnv = {
      SMTP_URL: process.env.SMTP_URL,
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS,
      SMTP_SECURE: process.env.SMTP_SECURE,
    };
    const sender = createEmailSender(env);

    const result = await drainEmailSending({
      repository,
      sender,
      limit: 100,
    });

    await db.destroy();

    return {
      result: `processed ${result.processed} (${result.sent} sent, ${result.failed} failed, ${result.pending} pending)`,
      senderKind: sender.kind,
    };
  },
});
