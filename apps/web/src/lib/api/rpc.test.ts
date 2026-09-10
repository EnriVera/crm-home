import { describe, expect, test } from "bun:test";
import { createRpcClient } from "./rpc";

describe("createRpcClient", () => {
  test("lanza error cuando baseURL no satisface ALLOWED_BASE_URL_PATTERN", () => {
    expect(() => createRpcClient("javascript:alert(1)")).toThrow(
      "Invalid RPC base URL",
    );
    expect(() => createRpcClient("")).toThrow("Invalid RPC base URL");
    expect(() => createRpcClient("not a url")).toThrow("Invalid RPC base URL");
  });

  test("acepta path absoluto (mismo origen)", () => {
    const rpc = createRpcClient("/rpc");
    expect(rpc.auth).toBeDefined();
    expect(rpc.tasks).toBeDefined();
  });

  test("acepta URL http/https completa", () => {
    const rpc = createRpcClient("https://api.example.com/rpc");
    expect(rpc.auth).toBeDefined();
    expect(rpc.tasks).toBeDefined();
  });

  test("expone los namespaces canónicos (auth + tasks)", () => {
    const rpc = createRpcClient("/rpc");
    expect(rpc.auth).toBeDefined();
    expect(rpc.tasks).toBeDefined();
  });

  test("el namespace auth expone verifyOtp y los demás métodos del contract", () => {
    const rpc = createRpcClient("/rpc");
    // auth methods
    expect(typeof rpc.auth.requestOtp).toBe("function");
    expect(typeof rpc.auth.verifyOtp).toBe("function");
    expect(typeof rpc.auth.session).toBe("function");
    expect(typeof rpc.auth.logout).toBe("function");
  });

  test("el namespace tasks expone los 13 métodos del contract", () => {
    const rpc = createRpcClient("/rpc");
    // Tasks methods
    expect(typeof rpc.tasks.list).toBe("function");
    expect(typeof rpc.tasks.get).toBe("function");
    expect(typeof rpc.tasks.create).toBe("function");
    expect(typeof rpc.tasks.update).toBe("function");
    expect(typeof rpc.tasks.move).toBe("function");
    expect(typeof rpc.tasks.remove).toBe("function");
    // States
    expect(typeof rpc.tasks.states.list).toBe("function");
    expect(typeof rpc.tasks.states.create).toBe("function");
    expect(typeof rpc.tasks.states.update).toBe("function");
    expect(typeof rpc.tasks.states.remove).toBe("function");
    expect(typeof rpc.tasks.states.reorder).toBe("function");
    // Lookups (clients.search está en el contract; typesForForm y
    // categoriesByType se exponen en HTTP layer pero no en el contract —
    // por eso no se testean acá).
    expect(typeof rpc.tasks.clients.search).toBe("function");
  });
});
