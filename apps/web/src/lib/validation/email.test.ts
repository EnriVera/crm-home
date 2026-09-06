import { describe, expect, test } from "bun:test";

/**
 * Tests puros de `isValidEmail()` (D9, validación client-side del login).
 * RED: `lib/validation/email.ts` todavía no existe — este test debe fallar.
 */
describe("lib/validation/email", () => {
  test("emails válidos comunes", async () => {
    const { isValidEmail } = await import("./email");
    expect(isValidEmail("ana@example.com")).toBe(true);
    expect(isValidEmail("ana.perez@empresa.com.ar")).toBe(true);
    expect(isValidEmail("a@b.co")).toBe(true); // edge: dominio corto con TLD
    expect(isValidEmail("ana+facturas@example.com")).toBe(true); // plus-addressing
    expect(isValidEmail("ANA@EXAMPLE.COM")).toBe(true);
  });

  test("emails inválidos: sin @, sin dominio, con espacios", async () => {
    const { isValidEmail } = await import("./email");
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("anaexample.com")).toBe(false); // sin @
    expect(isValidEmail("ana@")).toBe(false); // sin dominio
    expect(isValidEmail("ana@example")).toBe(false); // sin TLD
    expect(isValidEmail("@example.com")).toBe(false); // sin local part
    expect(isValidEmail("ana perez@example.com")).toBe(false); // espacio
    expect(isValidEmail("ana@example .com")).toBe(false); // espacio en dominio
    expect(isValidEmail("ana@@example.com")).toBe(false); // doble @
  });

  test("tolera espacios alrededor (trim) pero no dentro", async () => {
    const { isValidEmail } = await import("./email");
    expect(isValidEmail("  ana@example.com  ")).toBe(true);
    expect(isValidEmail("ana @example.com")).toBe(false);
  });
});
