/**
 * Máquina de estados OTP (D9, PRD §8.1): `idle → ready → submitting →
 * error | expired` (+ `success`). Los intentos (máx. 5) y la expiración
 * (10 min) son DATOS de la máquina — los componentes nunca hardcodean estos
 * números ni sus strings. El código es STRING (ceros a la izquierda, §8.1).
 *
 * TS puro, sin DOM: testeable headless (`otp-machine.test.ts`).
 *
 * Puerto `OtpVerifier`: este change inyecta `FakeOtpVerifier` (siempre
 * `invalid` tras latencia simulada, para exhibir el estado de error); el
 * change de auth inyecta el verifier real vía RPC sin tocar UI ni máquina.
 */

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

/** Puerto de verificación (D9): estable hacia el change de auth. */
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

export function createOtpMachine(options: OtpMachineOptions): OtpMachine {
  const codeLength = options.codeLength ?? OTP_CODE_LENGTH;
  const maxAttempts = options.maxAttempts ?? OTP_MAX_ATTEMPTS;
  const expiresInMinutes = options.expiresInMinutes ?? OTP_EXPIRES_MINUTES;

  let status: OtpStatus = "idle";
  let code = "";
  let attemptsRemaining = maxAttempts;

  const snapshot = (): OtpState => ({
    status,
    code,
    attemptsRemaining,
    maxAttempts,
    expiresInMinutes,
  });

  return {
    getState: snapshot,

    setCode(next: string) {
      if (status === "submitting") return;
      code = next;
      status = code.length === codeLength ? "ready" : "idle";
    },

    async submit() {
      if (status !== "ready" || attemptsRemaining <= 0) return;
      status = "submitting";
      const verdict = await options.verifier.verify(code);
      if (verdict === "valid") {
        status = "success";
      } else if (verdict === "expired") {
        status = "expired";
      } else {
        attemptsRemaining -= 1;
        status = "error";
      }
    },

    reset() {
      status = "idle";
      code = "";
      attemptsRemaining = maxAttempts;
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
