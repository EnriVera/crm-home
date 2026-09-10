import { describe, expect, test } from "bun:test";
import { createEmailSender } from "./create-email-sender";

/**
 * Tests del selector por env. La factory debe devolver el adapter SMTP si
 * `SMTP_URL` está definida y no vacía, y el adapter consola en cualquier otro
 * caso. No se ejerce el envío real en estos tests.
 */

describe("createEmailSender", () => {
  test("devuelve SMTP cuando SMTP_URL está definida y no vacía", () => {
    const sender = createEmailSender({
      SMTP_URL: "smtp://localhost:1025",
    });
    // tag para distinguir adapters sin importar el módulo de nodemailer
    expect((sender as { kind?: string }).kind).toBe("smtp");
  });

  test("devuelve consola cuando SMTP_URL no está definida", () => {
    const sender = createEmailSender({});
    expect((sender as { kind?: string }).kind).toBe("console");
  });

  test('devuelve consola cuando SMTP_URL es "" (cadena vacía)', () => {
    const sender = createEmailSender({ SMTP_URL: "" });
    expect((sender as { kind?: string }).kind).toBe("console");
  });

  test("devuelve consola cuando SMTP_URL solo contiene espacios", () => {
    const sender = createEmailSender({ SMTP_URL: "   " });
    expect((sender as { kind?: string }).kind).toBe("console");
  });

  test("ignora variables discretas si SMTP_URL está presente", () => {
    const sender = createEmailSender({
      SMTP_URL: "smtps://smtp.example.com:465",
      SMTP_HOST: "ignored.example.com",
      SMTP_PORT: "2525",
      SMTP_USER: "u",
      SMTP_PASS: "p",
      SMTP_SECURE: "true",
    });
    expect((sender as { kind?: string }).kind).toBe("smtp");
  });
});
