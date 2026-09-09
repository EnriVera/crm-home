import { describe, expect, mock, test } from "bun:test";
import { createRpcOtpVerifier } from "./rpc-verifier";
import type { RpcClient } from "../api/rpc";

function createMockRpc(
  verdict: "valid" | "invalid" | "expired",
): Pick<RpcClient, "verifyOtp"> {
  const verifyOtp = mock(() => Promise.resolve({ verdict }));
  return { verifyOtp } as Pick<RpcClient, "verifyOtp">;
}

describe("createRpcOtpVerifier", () => {
  test("devuelve valid sin transformación", async () => {
    const verifier = createRpcOtpVerifier("ana@example.com", {
      rpc: createMockRpc("valid") as RpcClient,
    });

    const result = await verifier.verify("041283");

    expect(result).toBe("valid");
  });

  test("devuelve invalid sin transformación", async () => {
    const verifier = createRpcOtpVerifier("ana@example.com", {
      rpc: createMockRpc("invalid") as RpcClient,
    });

    const result = await verifier.verify("000000");

    expect(result).toBe("invalid");
  });

  test("devuelve expired sin transformación", async () => {
    const verifier = createRpcOtpVerifier("ana@example.com", {
      rpc: createMockRpc("expired") as RpcClient,
    });

    const result = await verifier.verify("000000");

    expect(result).toBe("expired");
  });

  test("el email cerrado en la closure se envía en el payload", async () => {
    const email = "ana@example.com";
    const verifyOtp = mock(() => Promise.resolve({ verdict: "valid" as const }));
    const verifier = createRpcOtpVerifier(email, {
      // SAFETY: partial mock for unit test
      rpc: { verifyOtp } as unknown as RpcClient,
    });

    await verifier.verify("041283");

    expect(verifyOtp).toHaveBeenCalledWith({ email, code: "041283" });
  });
});
