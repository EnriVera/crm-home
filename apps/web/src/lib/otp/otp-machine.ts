/**
 * Máquina de estados OTP (D9 → D-SA4, PRD §8.1) sobre **xstate v5**:
 * `idle → ready → submitting → error | expired | success`. Los intentos
 * (máx. 5) y la expiración (10 min) son DATOS del context — nunca strings en
 * componentes. El código es STRING (ceros a la izquierda, §8.1).
 *
 * Puerto `OtpVerifier`: inyectado como actor `fromPromise` (input: code).
 * Este change inyecta `FakeOtpVerifier` (siempre `invalid` tras latencia
 * simulada, para exhibir el estado de error); el change de auth inyecta el
 * verifier real vía RPC sin tocar UI ni máquina.
 *
 * `lib/otp` es el adapter de dominio autorizado a importar `xstate`
 * (confinamiento D-SA4). La fachada pública `createOtpMachine` queda intacta
 * hacia los consumidores: es un adapter delgado actor→interfaz.
 */

import { assign, createActor, fromPromise, setup, waitFor } from "xstate";

/** Reglas §8.1 como datos exportados (fuente única). */
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_EXPIRES_MINUTES = 10;
export const OTP_CODE_LENGTH = 6;

export type OtpStatus =
  | "idle"
  | "ready"
  | "submitting"
  | "error"
  | "expired"
  | "success";

export type Verdict = "valid" | "invalid" | "expired";

/** Puerto de verificación (D9, preservado): estable hacia el change de auth. */
export interface OtpVerifier {
  verify(code: string): Promise<Verdict>;
}

export interface OtpState {
  readonly status: OtpStatus;
  /** Código ingresado; string que preserva ceros a la izquierda. */
  readonly code: string;
  readonly attemptsRemaining: number;
  readonly maxAttempts: number;
  readonly expiresInMinutes: number;
}

export interface OtpMachineOptions {
  verifier: OtpVerifier;
  codeLength?: number;
  maxAttempts?: number;
  expiresInMinutes?: number;
}

export interface OtpMachine {
  getState(): OtpState;
  /** Actualiza el código; `idle ↔ ready` según completitud. */
  setCode(code: string): void;
  /** Envía el código al verifier (solo desde `ready` y con intentos). */
  submit(): Promise<void>;
  /** Vuelve a `idle` con intentos restaurados. */
  reset(): void;
}

type OtpEvent =
  | { type: "SET_CODE"; code: string }
  | { type: "SUBMIT" }
  | { type: "RESET" };

interface OtpContext {
  code: string;
  attemptsRemaining: number;
}

/**
 * Definición de la máquina xstate (D-SA4). Exportada para tests headless de
 * la API de actor; los componentes consumen la fachada `createOtpMachine`.
 */
export function createOtpMachineDef(options: OtpMachineOptions) {
  const codeLength = options.codeLength ?? OTP_CODE_LENGTH;
  const maxAttempts = options.maxAttempts ?? OTP_MAX_ATTEMPTS;

  // SET_CODE compartido por todos los estados salvo `submitting` (donde el
  // evento no tiene handler y se ignora, como en la máquina hand-rolled D9):
  // asigna el código y transita a `ready` si está completo, si no a `idle`.
  const onSetCode = {
    SET_CODE: [
      { guard: "isComplete", target: "ready", actions: "assignCode" },
      { target: "idle", actions: "assignCode" },
    ],
  } as const;

  return setup({
    types: {
      context: {} as OtpContext,
      events: {} as OtpEvent,
    },
    actors: {
      verifier: fromPromise<Verdict, { code: string }>(({ input }) =>
        options.verifier.verify(input.code),
      ),
    },
    guards: {
      isComplete: ({ event }) =>
        event.type === "SET_CODE" && event.code.length === codeLength,
    },
    actions: {
      assignCode: assign({
        code: ({ event }) => (event.type === "SET_CODE" ? event.code : ""),
      }),
    },
  }).createMachine({
    id: "otp",
    initial: "idle",
    context: { code: "", attemptsRemaining: maxAttempts },
    on: {
      // Reset disponible desde cualquier estado terminal o de error (D9).
      RESET: {
        target: ".idle",
        actions: assign({ code: "", attemptsRemaining: maxAttempts }),
      },
    },
    states: {
      idle: { on: { ...onSetCode } },
      ready: {
        on: {
          ...onSetCode,
          SUBMIT: {
            guard: ({ context }) => context.attemptsRemaining > 0,
            target: "submitting",
          },
        },
      },
      submitting: {
        // SET_CODE durante submitting se ignora (sin handler en este estado).
        invoke: {
          src: "verifier",
          input: ({ context }) => ({ code: context.code }),
          onDone: [
            {
              guard: ({ event }) => event.output === "valid",
              target: "success",
            },
            {
              guard: ({ event }) => event.output === "expired",
              target: "expired",
            },
            {
              target: "error",
              actions: assign({
                attemptsRemaining: ({ context }) => context.attemptsRemaining - 1,
              }),
            },
          ],
        },
      },
      error: { on: { ...onSetCode } },
      expired: { on: { ...onSetCode } },
      success: { on: { ...onSetCode } },
    },
  });
}

/**
 * Fachada ESTABLE (contrato público intacto hacia /login-verification):
 * adapter delgado actor xstate → interfaz `OtpMachine`.
 */
export function createOtpMachine(options: OtpMachineOptions): OtpMachine {
  const maxAttempts = options.maxAttempts ?? OTP_MAX_ATTEMPTS;
  const expiresInMinutes = options.expiresInMinutes ?? OTP_EXPIRES_MINUTES;
  const actor = createActor(createOtpMachineDef(options)).start();

  return {
    getState(): OtpState {
      const snapshot = actor.getSnapshot();
      return {
        status: snapshot.value as OtpStatus,
        code: snapshot.context.code,
        attemptsRemaining: snapshot.context.attemptsRemaining,
        maxAttempts,
        expiresInMinutes,
      };
    },

    setCode(next: string) {
      actor.send({ type: "SET_CODE", code: next });
    },

    async submit() {
      const snapshot = actor.getSnapshot();
      if (snapshot.value !== "ready" || snapshot.context.attemptsRemaining <= 0) {
        return;
      }
      actor.send({ type: "SUBMIT" });
      await waitFor(actor, (next) => next.value !== "submitting");
    },

    reset() {
      actor.send({ type: "RESET" });
    },
  };
}

/**
 * Verifier de exhibición (D9): siempre `invalid` tras una latencia simulada,
 * para que la UI muestre el estado de error sin backend. El change de auth
 * lo reemplaza por el verifier real vía RPC.
 */
export class FakeOtpVerifier implements OtpVerifier {
  private readonly latencyMs: number;

  constructor(options: { latencyMs?: number } = {}) {
    this.latencyMs = options.latencyMs ?? 600;
  }

  verify(_code: string): Promise<Verdict> {
    return new Promise((resolve) => {
      setTimeout(() => resolve("invalid"), this.latencyMs);
    });
  }
}
