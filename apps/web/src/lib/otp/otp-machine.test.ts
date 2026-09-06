import { describe, expect, test } from "bun:test";
import { createActor, waitFor } from "xstate";

import {
  createOtpMachineDef,
  FakeOtpVerifier,
  OTP_EXPIRES_MINUTES,
  OTP_MAX_ATTEMPTS,
  type OtpMachineOptions,
} from "./otp-machine";

/**
 * Tests de la máquina OTP migrada a xstate (D-SA4): API de actor
 * (`createActor`, `send`, `snapshot.context`) con LOS MISMOS casos que la
 * versión hand-rolled (D9): estados `idle → ready → submitting →
 * error | expired | success`, intentos (máx. 5) y expiración (10 min) como
 * DATOS del context, código como string con ceros a la izquierda (§8.1).
 * RED: `createOtpMachineDef` todavía no existe — este test debe fallar.
 */

const VALID_CODE = "041283"; // con ceros a la izquierda (§8.1): string, no número

const invalidVerifier = { verify: () => Promise.resolve("invalid" as const) };

function startOtpActor(options: OtpMachineOptions) {
  return createActor(createOtpMachineDef(options)).start();
}

async function submitAndSettle(actor: ReturnType<typeof startOtpActor>) {
  actor.send({ type: "SUBMIT" });
  await waitFor(actor, (snapshot) => snapshot.value !== "submitting");
}

describe("lib/otp/otp-machine (actor xstate)", () => {
  test("estado inicial: idle con 5 intentos y expiración de 10 min como datos", () => {
    expect(OTP_MAX_ATTEMPTS).toBe(5);
    expect(OTP_EXPIRES_MINUTES).toBe(10);
    const actor = startOtpActor({ verifier: invalidVerifier });
    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe("idle");
    expect(snapshot.context.code).toBe("");
    expect(snapshot.context.attemptsRemaining).toBe(5);
  });

  test("idle → ready al completar 6 dígitos (string con ceros preservados)", () => {
    const actor = startOtpActor({ verifier: invalidVerifier });
    actor.send({ type: "SET_CODE", code: "04128" });
    expect(actor.getSnapshot().value).toBe("idle");
    actor.send({ type: "SET_CODE", code: VALID_CODE });
    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe("ready");
    expect(snapshot.context.code).toBe("041283"); // ceros a la izquierda intactos
  });

  test("código inválido consume un intento (5→4) y vuelve a error", async () => {
    const actor = startOtpActor({ verifier: invalidVerifier });
    actor.send({ type: "SET_CODE", code: VALID_CODE });
    await submitAndSettle(actor);
    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe("error");
    expect(snapshot.context.attemptsRemaining).toBe(4);
  });

  test("bloqueo al agotar intentos: NO llama más al verifier", async () => {
    let calls = 0;
    const actor = startOtpActor({
      verifier: {
        verify: () => {
          calls += 1;
          return Promise.resolve("invalid" as const);
        },
      },
    });
    for (let i = 0; i < 5; i += 1) {
      actor.send({ type: "SET_CODE", code: VALID_CODE });
      await submitAndSettle(actor);
    }
    expect(actor.getSnapshot().context.attemptsRemaining).toBe(0);
    expect(actor.getSnapshot().value).toBe("error");
    actor.send({ type: "SET_CODE", code: VALID_CODE });
    await submitAndSettle(actor);
    expect(calls).toBe(5); // sexto submit: no llamó al verifier
  });

  test("verifier que responde expired → estado expired", async () => {
    const actor = startOtpActor({
      verifier: { verify: () => Promise.resolve("expired" as const) },
    });
    actor.send({ type: "SET_CODE", code: VALID_CODE });
    await submitAndSettle(actor);
    expect(actor.getSnapshot().value).toBe("expired");
  });

  test("verifier que responde valid → estado success", async () => {
    const actor = startOtpActor({
      verifier: { verify: () => Promise.resolve("valid" as const) },
    });
    actor.send({ type: "SET_CODE", code: VALID_CODE });
    await submitAndSettle(actor);
    expect(actor.getSnapshot().value).toBe("success");
  });

  test("transiciones inválidas: submit desde idle o con código incompleto no llama al verifier", async () => {
    let calls = 0;
    const actor = startOtpActor({
      verifier: {
        verify: () => {
          calls += 1;
          return Promise.resolve("valid" as const);
        },
      },
    });
    await submitAndSettle(actor); // idle
    actor.send({ type: "SET_CODE", code: "0412" });
    await submitAndSettle(actor); // incompleto
    expect(calls).toBe(0);
    expect(actor.getSnapshot().value).toBe("idle");
  });

  test("reset tras error: vuelve a idle con intentos restaurados", async () => {
    const actor = startOtpActor({ verifier: invalidVerifier });
    actor.send({ type: "SET_CODE", code: VALID_CODE });
    await submitAndSettle(actor);
    expect(actor.getSnapshot().value).toBe("error");
    actor.send({ type: "RESET" });
    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe("idle");
    expect(snapshot.context.code).toBe("");
    expect(snapshot.context.attemptsRemaining).toBe(5);
  });

  test("FakeOtpVerifier: siempre invalid tras latencia simulada", async () => {
    const fake = new FakeOtpVerifier({ latencyMs: 1 });
    const before = Date.now();
    const verdict = await fake.verify(VALID_CODE);
    expect(verdict).toBe("invalid");
    expect(Date.now() - before).toBeGreaterThanOrEqual(0);
  });
});

describe("lib/otp fachada createOtpMachine (adapter actor→interfaz, TRIANGULATE)", () => {
  test("el contrato público del consumidor se preserva sobre el actor xstate", async () => {
    const { createOtpMachine } = await import("./otp-machine");
    const machine = createOtpMachine({ verifier: invalidVerifier });
    expect(machine.getState()).toEqual({
      status: "idle",
      code: "",
      attemptsRemaining: 5,
      maxAttempts: 5,
      expiresInMinutes: 10,
    });
    machine.setCode("04128");
    expect(machine.getState().status).toBe("idle");
    machine.setCode(VALID_CODE);
    expect(machine.getState().status).toBe("ready");
    await machine.submit();
    const state = machine.getState();
    expect(state.status).toBe("error");
    expect(state.attemptsRemaining).toBe(4);
    machine.reset();
    expect(machine.getState().status).toBe("idle");
    expect(machine.getState().attemptsRemaining).toBe(5);
  });
});
