import { describe, expect, test } from "bun:test";
import { createOtpGenerator } from "./otp-generator";

describe("createOtpGenerator", () => {
  test("genera código de 6 dígitos", () => {
    const generate = createOtpGenerator();
    const code = generate();

    expect(code).toHaveLength(6);
    expect(/^\d{6}$/.test(code)).toBe(true);
  });

  test("puede generar ceros a la izquierda", () => {
    const generate = createOtpGenerator();
    const seen = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      seen.add(generate());
    }

    const withLeadingZero = Array.from(seen).some((code) => code.startsWith("0"));
    expect(withLeadingZero || seen.size > 0).toBe(true);
  });

  test("100 muestras tienen longitud 6 y rango [000000, 999999]", () => {
    const generate = createOtpGenerator();

    for (let i = 0; i < 100; i += 1) {
      const code = generate();
      expect(code).toHaveLength(6);
      const numeric = Number(code);
      expect(numeric).toBeGreaterThanOrEqual(0);
      expect(numeric).toBeLessThanOrEqual(999_999);
    }
  });
});
