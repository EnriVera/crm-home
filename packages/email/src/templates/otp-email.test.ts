import { describe, expect, test } from "bun:test";
import { OtpEmail, OTP_EMAIL_SUBJECT, renderOtp } from "@crm/email";

describe("OtpEmail", () => {
  test("renderiza el HTML con el código, expiración y disclaimer", async () => {
    const { html } = await renderOtp("041283");

    expect(html).toContain("041283");
    expect(html).toContain(OTP_EMAIL_SUBJECT);
    expect(html).toContain("10 minutos");
    expect(html).toContain("Si no lo solicitaste, ignorá este mensaje.");
    expect(html).toMatchSnapshot();
  });

  test("fallback de texto plano incluye código, expiración y disclaimer", async () => {
    const { text } = await renderOtp("041283");

    expect(text).toContain("041283");
    expect(text).toContain("10 minutos");
    expect(text).toContain("Si no lo solicitaste, ignorá este mensaje.");
  });

  test("conserva los ceros a la izquierda del código", async () => {
    const { html } = await renderOtp("001122");

    expect(html).toContain("001122");
  });

  test("OtpEmail es el componente exportado", () => {
    expect(typeof OtpEmail).toBe("function");
  });
});
