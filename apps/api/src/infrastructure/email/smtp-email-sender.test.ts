import { describe, expect, test } from "bun:test";
import { EmailSendError } from "./email-send-error";
import { createSmtpEmailSender } from "./smtp-email-sender";
import type { SmtpTransporter } from "./smtp-email-sender";

/**
 * Tests unitarios de `createSmtpEmailSender`. Usan un `SmtpTransporter` fake
 * inyectado para evitar cualquier contacto con SMTP real. El comportamiento
 * observable es: argumentos de `sendMail` y clasificación de errores en
 * `EmailSendError { retryable }` según el error del transporte.
 */

function makeFakeTransporter(
  overrides: Partial<SmtpTransporter> = {},
): SmtpTransporter & { calls: Array<Record<string, unknown>> } {
  const calls: Array<Record<string, unknown>> = [];
  return {
    calls,
    async sendMail(payload: Record<string, unknown>) {
      calls.push(payload);
      return { messageId: "fake-id" };
    },
    async verify() {
      return true;
    },
    async close() {
      return;
    },
    ...overrides,
  };
}

describe("createSmtpEmailSender", () => {
  test("envía con html cuando el mensaje provee html y text", async () => {
    const transporter = makeFakeTransporter();
    const sender = createSmtpEmailSender({
      transporter,
      fromFallback: "noreply@crmhome.app",
    });

    await sender.send({
      from: "auth@crmhome.app",
      to: "user@example.com",
      subject: "Hola",
      body: "<p>Hola</p>",
      html: "<p>Hola</p>",
      text: "Hola",
    });

    expect(transporter.calls).toHaveLength(1);
    const call = transporter.calls[0]!;
    expect(call.from).toBe("auth@crmhome.app");
    expect(call.to).toBe("user@example.com");
    expect(call.subject).toBe("Hola");
    expect(call.html).toBe("<p>Hola</p>");
    expect(call.text).toBe("Hola");
    // multipart alternative cuando hay text + html
    expect(call.alternatives).toBeUndefined();
  });

  test("usa fromFallback si el mensaje no incluye from", async () => {
    const transporter = makeFakeTransporter();
    const sender = createSmtpEmailSender({
      transporter,
      fromFallback: "fallback@crmhome.app",
    });

    await sender.send({
      from: "",
      to: "user@example.com",
      subject: "S",
      body: "b",
    });

    expect(transporter.calls[0]?.from).toBe("fallback@crmhome.app");
  });

  test("clasifica ECONNREFUSED como retryable", async () => {
    const transporter = makeFakeTransporter({
      async sendMail() {
        const err = new Error("connect ECONNREFUSED 127.0.0.1:1025") as Error & {
          code?: string;
        };
        err.code = "ECONNREFUSED";
        throw err;
      },
    });
    const sender = createSmtpEmailSender({ transporter, fromFallback: "f@x" });

    let caught: unknown;
    try {
      await sender.send({
        from: "a@b",
        to: "c@d",
        subject: "s",
        body: "b",
      });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(EmailSendError);
    expect((caught as EmailSendError).retryable).toBe(true);
    expect((caught as EmailSendError).message).toContain("ECONNREFUSED");
  });

  test("clasifica ETIMEDOUT como retryable", async () => {
    const transporter = makeFakeTransporter({
      async sendMail() {
        const err = new Error("connect ETIMEDOUT") as Error & { code?: string };
        err.code = "ETIMEDOUT";
        throw err;
      },
    });
    const sender = createSmtpEmailSender({ transporter, fromFallback: "f@x" });

    await expect(
      sender.send({ from: "a", to: "b", subject: "s", body: "b" }),
    ).rejects.toMatchObject({ name: "EmailSendError", retryable: true });
  });

  test("clasifica respuesta SMTP 4xx como retryable", async () => {
    const transporter = makeFakeTransporter({
      async sendMail() {
        const err = new Error(
          "Mail command failed: 451 4.7.1 Try again later",
        ) as Error & { responseCode?: number };
        err.responseCode = 451;
        throw err;
      },
    });
    const sender = createSmtpEmailSender({ transporter, fromFallback: "f@x" });

    await expect(
      sender.send({ from: "a", to: "b", subject: "s", body: "b" }),
    ).rejects.toMatchObject({ name: "EmailSendError", retryable: true });
  });

  test("clasifica respuesta SMTP 5xx como no retryable", async () => {
    const transporter = makeFakeTransporter({
      async sendMail() {
        const err = new Error(
          "Mail command failed: 550 5.7.1 User unknown",
        ) as Error & { responseCode?: number };
        err.responseCode = 550;
        throw err;
      },
    });
    const sender = createSmtpEmailSender({ transporter, fromFallback: "f@x" });

    await expect(
      sender.send({ from: "a", to: "b", subject: "s", body: "b" }),
    ).rejects.toMatchObject({ name: "EmailSendError", retryable: false });
  });

  test("clasifica cualquier error desconocido como no retryable", async () => {
    const transporter = makeFakeTransformer_throw();
    const sender = createSmtpEmailSender({ transporter, fromFallback: "f@x" });

    await expect(
      sender.send({ from: "a", to: "b", subject: "s", body: "b" }),
    ).rejects.toMatchObject({ name: "EmailSendError", retryable: false });
  });

  test("acepta envío multipart cuando html y text están presentes", async () => {
    const transporter = makeFakeTransporter();
    const sender = createSmtpEmailSender({
      transporter,
      fromFallback: "f@x",
    });

    await sender.send({
      from: "a@b",
      to: "c@d",
      subject: "otp",
      body: "<p>Tu código es <strong>041283</strong></p>",
      html: "<p>Tu código es <strong>041283</strong></p>",
      text: "Tu código es 041283",
    });

    const call = transporter.calls[0]!;
    expect(call.html).toBe(
      "<p>Tu código es <strong>041283</strong></p>",
    );
    expect(call.text).toBe("Tu código es 041283");
    expect(call.encoding).toBe("utf-8");
  });

  test("envía solo html cuando text no está presente", async () => {
    const transporter = makeFakeTransporter();
    const sender = createSmtpEmailSender({
      transporter,
      fromFallback: "f@x",
    });

    await sender.send({
      from: "a@b",
      to: "c@d",
      subject: "s",
      body: "<p>x</p>",
      html: "<p>x</p>",
    });

    expect(transporter.calls[0]?.text).toBeUndefined();
  });
});

function makeFakeTransformer_throw(): SmtpTransporter {
  return {
    async sendMail() {
      throw new Error("unexpected internal failure");
    },
    async verify() {
      return true;
    },
    async close() {
      return;
    },
  };
}
