import type { OtpVerifier, Verdict } from "./otp-machine";
import { createRpcClient, type RpcClient } from "../api/rpc";

/**
 * Verifier OTP basado en RPC. Captura el email en closure; `verify(code)` lo
 * envía como parte del payload de `rpc.auth.verifyOtp.mutate`.
 *
 * El método HTTP expuesto es `POST /rpc/auth/verify-otp`. Verdict wire:
 *   "valid" | "invalid" | "expired" — se devuelve sin transformación.
 */

export interface RpcOtpVerifierOptions {
  rpc?: RpcClient;
}

export function createRpcOtpVerifier(
  email: string,
  options: RpcOtpVerifierOptions = {},
): OtpVerifier {
  const rpc =
    options.rpc ?? createRpcClient(import.meta.env.VITE_API_URL ?? "/rpc");

  return {
    async verify(code: string): Promise<Verdict> {
      // El contract client expone los procedures como funciones callable
      // directamente (`rpc.auth.verifyOtp(input)`). El método `.mutate()` que
      // menciona el spec de WU7 viene del wrapper de TanStack Query
      // (`createTanstackQueryUtils`), que NO está instalado en MVP — ver
      // docs/orpc/client para el detalle.
      const result = await rpc.auth.verifyOtp({ email, code });
      return result.verdict;
    },
  };
}
