import { describe, expect, test } from "bun:test";
import { describeSmtpTarget } from "./composition-root";

describe("describeSmtpTarget", () => {
  test("sin target cae al fallback de consola", () => {
    expect(describeSmtpTarget(undefined)).toBe("console-fallback");
    expect(describeSmtpTarget("")).toBe("console-fallback");
  });

  test("URL con credenciales muestra solo host:puerto", () => {
    const described = describeSmtpTarget(
      "smtp://audituser:aud1tpass@mail.invalid:587",
    );
    expect(described).toBe("smtp://mail.invalid:587");
    expect(described).not.toContain("aud1tpass");
    expect(described).not.toContain("audituser");
  });

  test("host suelto sin esquema se normaliza a URL smtp", () => {
    expect(describeSmtpTarget("mail.invalid:587")).toBe(
      "smtp://mail.invalid:587",
    );
  });

  test("host con userinfo defensivamente redactado", () => {
    const described = describeSmtpTarget("user:pass@mail.invalid:587");
    expect(described).toBe("smtp://mail.invalid:587");
  });

  test("target no parseable no devuelve el valor crudo", () => {
    const described = describeSmtpTarget("smtp://ho st:12 3");
    expect(described).toBe("configurado (target no parseable)");
  });
});
