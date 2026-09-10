import { beforeEach, describe, expect, test } from "bun:test";
import type { EmailSender }
  from "../../domain/ports/email-sender";
import type {
  EmailSending,
  EmailSendingRepository,
} from "../../domain/ports/email-sending-repository";
import { EmailSendError } from "./email-send-error";
import { drainEmailSending } from "./drain-email-sending";

/**
 * Tests unitarios del drenador. Usa fakes de repositorio y sender; no toca
 * SMTP real ni base de datos. Cubre:
 * - selección de adapter vía `createEmailSender` (probado en su propio test)
 * - política de reintento (retryable → pending; non-retryable → failed)
 * - payload enviado: html = body (para que SMTP use text/html)
 */

function makeMessage(overrides: Partial<EmailSending> = {}): EmailSending {
  return {
    id: "msg-1",
    from: "auth@crmhome.app",
    to: "user@example.com",
    subject: "Tu código de acceso",
    body: "<p>Hola</p>",
    loginId: "login-1",
    status: "pending",
    createdAt: new Date(),
    ...overrides,
  };
}

function makeFakeRepo(
  initialPending: EmailSending[],
): EmailSendingRepository & {
  sent: string[];
  failed: string[];
  leftPending: string[];
} {
  const state = {
    pending: [...initialPending],
    sent: [] as string[],
    failed: [] as string[],
  };
  return {
    get sent() {
      return state.sent;
    },
    get failed() {
      return state.failed;
    },
    get leftPending() {
      return state.pending.map((m) => m.id);
    },
    async create() {
      throw new Error("no usado en este test");
    },
    async findPending(_limit: number) {
      return [...state.pending];
    },
    async markSent(id: string) {
      state.sent.push(id);
      state.pending = state.pending.filter((m) => m.id !== id);
    },
    async markFailed(id: string) {
      state.failed.push(id);
      state.pending = state.pending.filter((m) => m.id !== id);
    },
  };
}

function makeFakeSender(
  behavior: (msg: { to: string }) => Promise<void> = async () => {},
): EmailSender & { sent: Array<{ to: string; html?: string; body: string }> } {
  const sent: Array<{ to: string; html?: string; body: string }> = [];
  return {
    sent,
    async send(message) {
      await behavior({ to: message.to });
      sent.push({
        to: message.to,
        html: message.html,
        body: message.body,
      });
    },
  };
}

describe("drainEmailSending", () => {
  let logs: Array<{ level: "warn" | "error"; msg: string; ctx?: unknown }>;

  beforeEach(() => {
    logs = [];
  });

  function logger() {
    return {
      warn: (msg: string, ctx?: Record<string, unknown>) => {
        logs.push({ level: "warn", msg, ctx });
      },
      error: (msg: string, ctx?: Record<string, unknown>) => {
        logs.push({ level: "error", msg, ctx });
      },
    };
  }

  test("marca enviado y contabiliza sent cuando el sender resuelve", async () => {
    const repo = makeFakeRepo([makeMessage({ id: "m1" })]);
    const sender = makeFakeSender();
    const result = await drainEmailSending({
      repository: repo,
      sender,
      logger: logger(),
    });

    expect(result).toEqual({
      processed: 1,
      sent: 1,
      failed: 0,
      pending: 0,
    });
    expect(repo.sent).toEqual(["m1"]);
    expect(repo.failed).toEqual([]);
  });

  test("pasa html = body al sender para que SMTP use text/html", async () => {
    const repo = makeFakeRepo([makeMessage({ id: "m1", body: "<p>x</p>" })]);
    const sender = makeFakeSender();
    await drainEmailSending({ repository: repo, sender, logger: logger() });

    expect(sender.sent[0]).toEqual({
      to: "user@example.com",
      html: "<p>x</p>",
      body: "<p>x</p>",
    });
  });

  test("retryable deja el mensaje pendiente y registra warn", async () => {
    const repo = makeFakeRepo([makeMessage({ id: "m1" })]);
    const sender = makeFakeSender(async () => {
      throw new EmailSendError("ECONNREFUSED", true);
    });
    const result = await drainEmailSending({
      repository: repo,
      sender,
      logger: logger(),
    });

    expect(result).toEqual({
      processed: 1,
      sent: 0,
      failed: 0,
      pending: 1,
    });
    expect(repo.sent).toEqual([]);
    expect(repo.failed).toEqual([]);
    expect(repo.leftPending).toEqual(["m1"]);
    expect(logs).toHaveLength(1);
    expect(logs[0]?.level).toBe("warn");
    expect(logs[0]?.ctx).toMatchObject({ id: "m1" });
  });

  test("non-retryable marca failed y registra error", async () => {
    const repo = makeFakeRepo([makeMessage({ id: "m1" })]);
    const sender = makeFakeSender(async () => {
      throw new EmailSendError("550 permanent", false);
    });
    const result = await drainEmailSending({
      repository: repo,
      sender,
      logger: logger(),
    });

    expect(result).toEqual({
      processed: 1,
      sent: 0,
      failed: 1,
      pending: 0,
    });
    expect(repo.sent).toEqual([]);
    expect(repo.failed).toEqual(["m1"]);
    expect(logs).toHaveLength(1);
    expect(logs[0]?.level).toBe("error");
  });

  test("error no-EmailSendError también marca failed", async () => {
    const repo = makeFakeRepo([makeMessage({ id: "m1" })]);
    const sender = makeFakeSender(async () => {
      throw new Error("boom");
    });
    const result = await drainEmailSending({
      repository: repo,
      sender,
      logger: logger(),
    });

    expect(result.failed).toBe(1);
    expect(repo.failed).toEqual(["m1"]);
  });

  test("mezcla retryable, failed y sent en una sola corrida", async () => {
    const repo = makeFakeRepo([
      makeMessage({ id: "m1" }),
      makeMessage({ id: "m2" }),
      makeMessage({ id: "m3" }),
    ]);
    let attempt = 0;
    const sender = makeFakeSender(async () => {
      attempt += 1;
      if (attempt === 1) throw new EmailSendError("4xx transient", true);
      if (attempt === 2) throw new Error("unexpected");
      // third succeeds
    });
    const result = await drainEmailSending({
      repository: repo,
      sender,
      logger: logger(),
    });

    expect(result).toEqual({
      processed: 3,
      sent: 1,
      failed: 1,
      pending: 1,
    });
    expect(repo.sent).toEqual(["m3"]);
    expect(repo.failed).toEqual(["m2"]);
    expect(repo.leftPending).toEqual(["m1"]);
  });

  test("los logs no contienen to/subject/body (PRD §9)", async () => {
    const repo = makeFakeRepo([makeMessage({ id: "m1" })]);
    const sender = makeFakeSender(async () => {
      throw new EmailSendError("5xx perm", false);
    });
    await drainEmailSending({ repository: repo, sender, logger: logger() });

    const serialized = JSON.stringify(logs);
    expect(serialized).not.toContain("user@example.com");
    expect(serialized).not.toContain("Tu código de acceso");
    expect(serialized).not.toContain("<p>Hola</p>");
  });
});
