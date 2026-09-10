import { describe, expect, test } from "bun:test";
import { createSmtpEmailSender } from "./smtp-email-sender";
import { parseSmtpUrl } from "./parse-smtp-url";

/**
 * Integration test del adapter SMTP contra Mailpit local.
 *
 * Se ejecuta SOLO si:
 * - `TEST_SMTP_URL` (preferido) o `SMTP_URL` apunta a localhost:1025.
 * - Mailpit responde (banner SMTP en localhost:1025) en el momento del test.
 *
 * En cualquier otro caso se salta para no fallar CI sin entorno de dev.
 * No modifica la base de datos ni el estado de `email_sending`; solo envía
 * un mensaje a Mailpit y valida que la UI lo refleja.
 */

const candidateUrl =
  process.env.TEST_SMTP_URL ?? process.env.SMTP_URL ?? "";

const url =
  candidateUrl && /localhost|127\.0\.0\.1/.test(candidateUrl)
    ? candidateUrl
    : "";

let mailpitReachable = false;
let banner = "";

if (url) {
  try {
    const socket = await new Promise<{
      ok: boolean;
      banner: string;
    }>((resolve) => {
      const net = require("node:net") as typeof import("node:net");
      const sock = new net.Socket();
      let resolved = false;
      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          sock.destroy();
        }
      };
      const timeout = setTimeout(() => {
        cleanup();
        resolve({ ok: false, banner: "" });
      }, 500);
      sock.setTimeout(500);
      sock.once("connect", () => {
        sock.once("data", (chunk) => {
          clearTimeout(timeout);
          const b = chunk.toString("utf-8");
          sock.destroy();
          if (!resolved) {
            resolved = true;
            resolve({ ok: true, banner: b });
          }
        });
      });
      sock.once("error", () => {
        clearTimeout(timeout);
        cleanup();
        resolve({ ok: false, banner: "" });
      });
      sock.connect(1025, "localhost");
    });
    mailpitReachable = socket.ok;
    banner = socket.banner;
  } catch {
    mailpitReachable = false;
  }
}

const skipReason = url
  ? mailpitReachable
    ? ""
    : `Mailpit no responde en localhost:1025 (banner: ${JSON.stringify(banner)})`
  : "SMTP_URL/TEST_SMTP_URL no apunta a localhost:1025";

describe.skipIf(skipReason !== "")("SmtpEmailSender integración con Mailpit", () => {
  test("envía un email HTML que aparece en la UI de Mailpit", async () => {
    const config = parseSmtpUrl(url);
    expect(config.host).toBe("localhost");
    expect(config.port).toBe(1025);

    const sender = createSmtpEmailSender({
      config,
      fromFallback: "auth@crmhome.app",
    });

    const stamp = Date.now();
    const subject = `Integration ${stamp}`;
    const html = `<p>OTP test ${stamp}</p>`;
    const text = `OTP test ${stamp}`;

    await sender.send({
      from: "auth@crmhome.app",
      to: `integration+${stamp}@example.com`,
      subject,
      body: html,
      html,
      text,
    });

    // Consultar la API HTTP de Mailpit: lista los mensajes y verifica que
    // aparece el subject recién enviado.
    const listResponse = await fetch("http://localhost:8025/api/v1/messages");
    expect(listResponse.ok).toBe(true);
    const list = (await listResponse.json()) as {
      messages?: Array<{ ID: string; Subject: string }>;
    };
    const messages = list.messages ?? [];
    const ours = messages.find((m) => m.Subject === subject);
    expect(ours).toBeDefined();

    // Limpieza: borrar el mensaje para no acumularlos entre corridas.
    if (ours) {
      await fetch(`http://localhost:8025/api/v1/messages/${ours.ID}`, {
        method: "DELETE",
      });
    }
  }, 10_000);

  test(
    "la UI de Mailpit expone el HTML enviado",
    async () => {
      const config = parseSmtpUrl(url);
      const sender = createSmtpEmailSender({
        config,
        fromFallback: "auth@crmhome.app",
      });

      const stamp = Date.now();
      const subject = `Multipart ${stamp}`;
      const html = `<p>Hola <strong>${stamp}</strong></p>`;
      const text = `Hola ${stamp}`;

      await sender.send({
        from: "auth@crmhome.app",
        to: `multi+${stamp}@example.com`,
        subject,
        body: html,
        html,
        text,
      });

      const listResponse = await fetch(
        "http://localhost:8025/api/v1/messages?limit=10",
      );
      const list = (await listResponse.json()) as {
        messages?: Array<{ ID: string; Subject: string }>;
      };
      const msg = (list.messages ?? []).find((m) => m.Subject === subject);
      expect(msg).toBeDefined();
      if (!msg) return;

      // Inspeccionar el mensaje y verificar que tiene HTML y texto.
      const detail = await fetch(
        `http://localhost:8025/api/v1/message/${msg.ID}`,
      );
      const detailJson = (await detail.json()) as {
        HTML?: string;
        Text?: string;
      };
      expect(detailJson.HTML).toContain(`<strong>${stamp}</strong>`);
      expect(detailJson.Text).toContain(String(stamp));

      await fetch(`http://localhost:8025/api/v1/messages/${msg.ID}`, {
        method: "DELETE",
      });
    },
    10_000,
  );
});
