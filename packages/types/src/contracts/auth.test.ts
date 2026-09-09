import { describe, expect, test } from "bun:test";
import {
  authContract,
  emailSchema,
  otpCodeSchema,
  requestOtpInputSchema,
  requestOtpOutputSchema,
  verifyOtpInputSchema,
  verifyOtpOutputSchema,
  sessionOutputSchema,
  logoutOutputSchema,
} from "./auth";

describe("emailSchema", () => {
  test("acepta emails válidos", () => {
    expect(emailSchema.safeParse("ana@example.com").success).toBe(true);
  });

  test("rechaza emails inválidos", () => {
    expect(emailSchema.safeParse("no-es-un-email").success).toBe(false);
    expect(emailSchema.safeParse("").success).toBe(false);
  });

  test("preserva mayúsculas en input (no normaliza)", () => {
    const result = emailSchema.safeParse("Ana@Example.com");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("Ana@Example.com");
    }
  });
});

describe("otpCodeSchema", () => {
  test("acepta código con ceros a la izquierda", () => {
    const result = otpCodeSchema.safeParse("041283");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("041283");
    }
  });

  test("rechaza código de 5 dígitos", () => {
    expect(otpCodeSchema.safeParse("41283").success).toBe(false);
  });

  test("rechaza código con letras", () => {
    expect(otpCodeSchema.safeParse("04128a").success).toBe(false);
  });

  test("rechaza tipo numérico", () => {
    expect(otpCodeSchema.safeParse(41283 as unknown as string).success).toBe(
      false,
    );
  });

  test("rechaza código de más de 6 dígitos", () => {
    expect(otpCodeSchema.safeParse("0412831").success).toBe(false);
  });
});

describe("requestOtp schemas", () => {
  test("input requiere email válido", () => {
    const valid = requestOtpInputSchema.safeParse({ email: "ana@example.com" });
    expect(valid.success).toBe(true);

    const invalid = requestOtpInputSchema.safeParse({ email: "mal" });
    expect(invalid.success).toBe(false);
  });

  test("output es { ok: true }", () => {
    const result = requestOtpOutputSchema.safeParse({ ok: true });
    expect(result.success).toBe(true);
  });
});

describe("verifyOtp schemas", () => {
  test("input acepta código con ceros a la izquierda", () => {
    const result = verifyOtpInputSchema.safeParse({
      email: "ana@example.com",
      code: "041283",
    });
    expect(result.success).toBe(true);
  });

  test("output incluye veredicto valid | invalid | expired", () => {
    for (const verdict of ["valid", "invalid", "expired"] as const) {
      const result = verifyOtpOutputSchema.safeParse({ verdict });
      expect(result.success).toBe(true);
    }
  });

  test("output rechaza veredicto inesperado", () => {
    const result = verifyOtpOutputSchema.safeParse({ verdict: "unknown" });
    expect(result.success).toBe(false);
  });
});

describe("session output schema", () => {
  test("output requiere usuario con UUID", () => {
    const result = sessionOutputSchema.safeParse({
      user: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        email: "ana@example.com",
        name: "Ana",
      },
    });
    expect(result.success).toBe(true);
  });

  test("output rechaza id no UUID", () => {
    const result = sessionOutputSchema.safeParse({
      user: {
        id: "no-uuid",
        email: "ana@example.com",
        name: "Ana",
      },
    });
    expect(result.success).toBe(false);
  });
});

describe("logout output schema", () => {
  test("output es { ok: true }", () => {
    const result = logoutOutputSchema.safeParse({ ok: true });
    expect(result.success).toBe(true);
  });
});

describe("authContract", () => {
  test("las rutas llevan prefijo /auth", () => {
    expect(authContract.requestOtp["~orpc"].route.path).toBe(
      "/auth/request-otp",
    );
    expect(authContract.verifyOtp["~orpc"].route.path).toBe(
      "/auth/verify-otp",
    );
    expect(authContract.logout["~orpc"].route.path).toBe("/auth/logout");
    expect(authContract.session["~orpc"].route.path).toBe("/auth/session");
  });

  test("expone requestOtp, verifyOtp, logout y session", () => {
    expect(authContract.requestOtp).toBeDefined();
    expect(authContract.verifyOtp).toBeDefined();
    expect(authContract.logout).toBeDefined();
    expect(authContract.session).toBeDefined();
  });
});
