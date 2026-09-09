import { defineTask } from "nitro/runtime";
import { createDatabase } from "../src/infrastructure/kysely/database";
import { KyselyEmailSendingRepository } from "../src/infrastructure/kysely/email-sending-repository";
import { createConsoleEmailSender } from "../src/infrastructure/email/console-email-sender";

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
    const sender = createConsoleEmailSender();

    const pending = await repository.findPending(100);
    let sent = 0;
    let failed = 0;

    for (const message of pending) {
      try {
        await sender.send({
          from: message.from,
          to: message.to,
          subject: message.subject,
          body: message.body,
        });
        await repository.markSent(message.id);
        sent += 1;
      } catch (error) {
        console.error("[email-sending] failed to send", message.id, error);
        await repository.markFailed(message.id);
        failed += 1;
      }
    }

    await db.destroy();

    return { result: `processed ${pending.length} messages (${sent} sent, ${failed} failed)` };
  },
});
