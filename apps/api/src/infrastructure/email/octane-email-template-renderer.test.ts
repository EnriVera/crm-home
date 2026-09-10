import { describe, expect, test } from "bun:test";
import { OctaneEmailTemplateRenderer } from "./octane-email-template-renderer";

describe("OctaneEmailTemplateRenderer", () => {
  test("fake render devuelve subject, html y text", async () => {
    const renderer = new OctaneEmailTemplateRenderer({
      renderOtp: async (code) => ({
        subject: "Tu código de acceso",
        html: `<p>${code}</p>`,
        text: `Código: ${code}`,
      }),
    });

    const result = await renderer.renderOtp({ code: "041283" });

    expect(result.subject).toBe("Tu código de acceso");
    expect(result.html).toBe("<p>041283</p>");
    expect(result.text).toBe("Código: 041283");
  });

  test("render real incluye el código y el disclaimer", async () => {
    const renderer = new OctaneEmailTemplateRenderer();

    const result = await renderer.renderOtp({ code: "041283" });

    expect(result.subject).toBe("Tu código de acceso");
    expect(result.html).toContain("041283");
    expect(result.html).toContain("Si no lo solicitaste, ignorá este mensaje.");
    expect(result.text).toContain("041283");
  });
});
