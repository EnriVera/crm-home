import type { OtpVerifier, Verdict } from "./otp-machine";
import { createRpcClient, type RpcClient } from "../api/rpc";

export interface RpcOtpVerifierOptions {
  rpc?: RpcClient;
}

export function createRpcOtpVerifier(
  email: string,
  options: RpcOtpVerifierOptions = {},
): OtpVerifier {
  const rpc = options.rpc ?? createRpcClient(import.meta.env.VITE_API_URL ?? "/rpc");

  return {
    async verify(code: string): Promise<Verdict> {
      const result = await rpc.verifyOtp({ email, code });
      return result.verdict;
    },
  };
}
