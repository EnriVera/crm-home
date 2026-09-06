import { describe, expect, test } from "bun:test";

/**
 * Tests headless de la máquina OTP del wrapper `vendor/otp-input` (D1,
 * fallback hand-rolled con el contrato `OtpInputProps` intacto). Sin DOM:
 * se ejercitan tipeo, backspace, paste y `onComplete` contra el estado puro.
 * RED: el módulo `machine.ts` todavía no existe — este test debe fallar.
 */
describe("vendor/otp-input machine", () => {
  test("tipeo dígito a dígito llena los slots en orden", async () => {
    const { createOtpMachine } = await import("./machine");
    const machine = createOtpMachine({ length: 6 });
    machine.typeDigit(0, "0");
    machine.typeDigit(1, "4");
    expect(machine.getValue()).toEqual(["0", "4", "", "", "", ""]);
    expect(machine.isComplete()).toBe(false);
  });

  test("backspace: en celda llena borra y queda; en celda vacía retrocede", async () => {
    const { createOtpMachine } = await import("./machine");
    const machine = createOtpMachine({ length: 6 });
    machine.typeDigit(0, "1");
    machine.typeDigit(1, "2");
    // Celda llena: borra el dígito, el foco permanece.
    expect(machine.backspace(1)).toBe(1);
    expect(machine.getValue()).toEqual(["1", "", "", "", "", ""]);
    // Celda vacía: retrocede y borra la anterior.
    expect(machine.backspace(1)).toBe(0);
    expect(machine.getValue()).toEqual(["", "", "", "", "", ""]);
  });

  test("paste '041283' distribuye entre celdas preservando ceros a la izquierda", async () => {
    const { createOtpMachine } = await import("./machine");
    const completed: string[] = [];
    const machine = createOtpMachine({
      length: 6,
      onComplete: (code) => completed.push(code),
    });
    machine.paste(0, "041283");
    expect(machine.getValue()).toEqual(["0", "4", "1", "2", "8", "3"]);
    expect(machine.isComplete()).toBe(true);
    expect(completed).toEqual(["041283"]);
  });

  test("paste parcial desde una posición intermedia", async () => {
    const { createOtpMachine } = await import("./machine");
    const machine = createOtpMachine({ length: 6 });
    machine.typeDigit(0, "9");
    machine.paste(2, "412");
    expect(machine.getValue()).toEqual(["9", "", "4", "1", "2", ""]);
  });

  test("rechaza caracteres no numéricos", async () => {
    const { createOtpMachine } = await import("./machine");
    const machine = createOtpMachine({ length: 6 });
    machine.typeDigit(0, "a");
    machine.paste(1, "12x4");
    expect(machine.getValue()).toEqual(["", "1", "2", "4", "", ""]);
  });

  test("length distinto de 6", async () => {
    const { createOtpMachine } = await import("./machine");
    const completed: string[] = [];
    const machine = createOtpMachine({
      length: 4,
      onComplete: (code) => completed.push(code),
    });
    machine.paste(0, "0815");
    expect(machine.getValue()).toEqual(["0", "8", "1", "5"]);
    expect(completed).toEqual(["0815"]);
  });

  test("deshabilitada ignora tipeo y paste", async () => {
    const { createOtpMachine } = await import("./machine");
    const machine = createOtpMachine({ length: 6, disabled: true });
    machine.typeDigit(0, "5");
    machine.paste(0, "123456");
    expect(machine.getValue()).toEqual(["", "", "", "", "", ""]);
    expect(machine.isComplete()).toBe(false);
  });

  test("onComplete no se repite si ya estaba completa y se re-tipea un dígito", async () => {
    const { createOtpMachine } = await import("./machine");
    const completed: string[] = [];
    const machine = createOtpMachine({
      length: 6,
      onComplete: (code) => completed.push(code),
    });
    machine.paste(0, "041283");
    machine.typeDigit(5, "3");
    expect(completed).toEqual(["041283"]);
  });
});
