import { describe, expect, mock, test } from "bun:test";
import { createRpcOtpVerifier } from "./rpc-verifier";
import type { RpcClient } from "../api/rpc";

/**
 * Mock minimalista del namespace `auth` del RpcClient multi-contract.
 * Sólo necesita el método `verifyOtp` callable (la única superficie que
 * `createRpcOtpVerifier` toca). `.mutate()` viene del wrapper de TanStack
 * Query que NO está instalado en MVP — el verifier usa el client directo.
 */
function createMockRpc(
  verdict: "valid" | "invalid" | "expired",
): Pick<RpcClient["auth"], "verifyOtp"> {
  const verifyOtp = mock(() =>
    Promise.resolve({ verdict }),
  ) as unknown as RpcClient["auth"]["verifyOtp"];
  return { verifyOtp };
}

describe("createRpcOtpVerifier", () => {
  test("devuelve valid sin transformación", async () => {
    const verifier = createRpcOtpVerifier("ana@example.com", {
      rpc: {
        auth: createMockRpc("valid"),
      } as unknown as RpcClient,
    });

    const result = await verifier.verify("041283");

    expect(result).toBe("valid");
  });

  test("devuelve invalid sin transformación", async () => {
    const verifier = createRpcOtpVerifier("ana@example.com", {
      rpc: {
        auth: createMockRpc("invalid"),
      } as unknown as RpcClient,
    });

    const result = await verifier.verify("000000");

    expect(result).toBe("invalid");
  });

  test("devuelve expired sin transformación", async () => {
    const verifier = createRpcOtpVerifier("ana@example.com", {
      rpc: {
        auth: createMockRpc("expired"),
      } as unknown as RpcClient,
    });

    const result = await verifier.verify("000000");

    expect(result).toBe("expired");
  });

  test("el email cerrado en la closure se envía en el payload de rpc.auth.verifyOtp", async () => {
    const email = "ana@example.com";
    const verifyOtp = mock(() =>
      Promise.resolve({ verdict: "valid" as const }),
    ) as unknown as RpcClient["auth"]["verifyOtp"];

    const verifier = createRpcOtpVerifier(email, {
      rpc: {
        auth: { verifyOtp },
      } as unknown as RpcClient,
    });

    await verifier.verify("041283");

    expect(verifyOtp).toHaveBeenCalledWith({ email, code: "041283" });
  });
});
