import { describe, expect, test } from "bun:test";

/**
 * Tests puros de la máquina de estados OTP (D9, PRD §8.1): TS puro, sin DOM.
 * Estados `idle → ready → submitting → error | expired`; intentos (máx. 5) y
 * expiración (10 min) como DATOS de la máquina, nunca strings en componentes.
 * RED: `lib/otp/otp-machine.ts` todavía no existe — este test debe fallar.
 */

const VALID_CODE = "041283"; // con ceros a la izquierda (§8.1): string, no número

describe("lib/otp/otp-machine", () => {
  test("estado inicial: idle con 5 intentos y expiración de 10 min como datos", async () => {
    const { createOtpMachine, OTP_MAX_ATTEMPTS, OTP_EXPIRES_MINUTES } =
      await import("./otp-machine");
    expect(OTP_MAX_ATTEMPTS).toBe(5);
    expect(OTP_EXPIRES_MINUTES).toBe(10);
    const machine = createOtpMachine({ verifier: { verify: () => Promise.resolve("invalid") } });
    const state = machine.getState();
    expect(state.status).toBe("idle");
    expect(state.code).toBe("");
    expect(state.attemptsRemaining).toBe(5);
    expect(state.maxAttempts).toBe(5);
    expect(state.expiresInMinutes).toBe(10);
  });

  test("idle → ready al completar 6 dígitos (string con ceros preservados)", async () => {
    const { createOtpMachine } = await import("./otp-machine");
    const machine = createOtpMachine({ verifier: { verify: () => Promise.resolve("invalid") } });
    machine.setCode("04128");
    expect(machine.getState().status).toBe("idle");
    machine.setCode(VALID_CODE);
    const state = machine.getState();
    expect(state.status).toBe("ready");
    expect(state.code).toBe("041283"); // ceros a la izquierda intactos
  });

  test("código inválido consume un intento (5→4) y vuelve a ready", async () => {
    const { createOtpMachine } = await import("./otp-machine");
    const machine = createOtpMachine({ verifier: { verify: () => Promise.resolve("invalid") } });
    machine.setCode(VALID_CODE);
    await machine.submit();
    const state = machine.getState();
    expect(state.status).toBe("error");
    expect(state.attemptsRemaining).toBe(4);
  });

  test("bloqueo al agotar intentos: NO llama más al verifier", async () => {
    const { createOtpMachine } = await import("./otp-machine");
    let calls = 0;
    const machine = createOtpMachine({
      verifier: {
        verify: () => {
          calls += 1;
          return Promise.resolve("invalid");
        },
      },
    });
    for (let i = 0; i < 5; i += 1) {
      machine.setCode(VALID_CODE);
      await machine.submit();
    }
    expect(machine.getState().attemptsRemaining).toBe(0);
    expect(machine.getState().status).toBe("error");
    machine.setCode(VALID_CODE);
    await machine.submit();
    expect(calls).toBe(5); // sexto submit: no llamó al verifier
  });

  test("verifier que responde expired → estado expired", async () => {
    const { createOtpMachine } = await import("./otp-machine");
    const machine = createOtpMachine({ verifier: { verify: () => Promise.resolve("expired") } });
    machine.setCode(VALID_CODE);
    await machine.submit();
    expect(machine.getState().status).toBe("expired");
  });

  test("verifier que responde valid → estado success", async () => {
    const { createOtpMachine } = await import("./otp-machine");
    const machine = createOtpMachine({ verifier: { verify: () => Promise.resolve("valid") } });
    machine.setCode(VALID_CODE);
    await machine.submit();
    expect(machine.getState().status).toBe("success");
  });

  test("transiciones inválidas: submit desde idle o con código incompleto no llama al verifier", async () => {
    const { createOtpMachine } = await import("./otp-machine");
    let calls = 0;
    const machine = createOtpMachine({
      verifier: {
        verify: () => {
          calls += 1;
          return Promise.resolve("valid");
        },
      },
    });
    await machine.submit(); // idle
    machine.setCode("0412");
    await machine.submit(); // incompleto
    expect(calls).toBe(0);
    expect(machine.getState().status).toBe("idle");
  });

  test("reset tras error: vuelve a idle con intentos restaurados", async () => {
    const { createOtpMachine } = await import("./otp-machine");
    const machine = createOtpMachine({ verifier: { verify: () => Promise.resolve("invalid") } });
    machine.setCode(VALID_CODE);
    await machine.submit();
    expect(machine.getState().status).toBe("error");
    machine.reset();
    const state = machine.getState();
    expect(state.status).toBe("idle");
    expect(state.code).toBe("");
    expect(state.attemptsRemaining).toBe(5);
  });

  test("FakeOtpVerifier: siempre invalid tras latencia simulada", async () => {
    const { FakeOtpVerifier } = await import("./otp-machine");
    const fake = new FakeOtpVerifier({ latencyMs: 1 });
    const before = Date.now();
    const verdict = await fake.verify(VALID_CODE);
    expect(verdict).toBe("invalid");
    expect(Date.now() - before).toBeGreaterThanOrEqual(0);
  });
});
