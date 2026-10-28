import { describe, expect, it, vi } from "vitest";

/**
 * The orpc wrapper is the only door to the API (PRD-v4 §10.3), so the path
 * it builds is worth pinning: a wrong path reaches the API as a 404 instead
 * of failing loudly.
 */
const { calls, register, client } = await vi.hoisted(async () => {
  const calls: { path: string[]; input: unknown }[] = [];
  const client: Record<string, unknown> = {};
  // The client is a tree of nested objects whose leaves are the procedures.
  const register = (path: string[], value: unknown) => {
    let node = client;
    for (const segment of path.slice(0, -1)) {
      const next = (node as Record<string, unknown>)[segment] as
        | Record<string, unknown>
        | undefined;
      const created = next ?? {};
      (node as Record<string, unknown>)[segment] = created;
      node = created;
    }
    (node as Record<string, unknown>)[path[path.length - 1]] = (
      input: unknown,
    ) => {
      calls.push({ path, input });
      return Promise.resolve(value);
    };
  };
  return { calls, register, client };
});

vi.mock("@orpc/client", () => ({
  createORPCClient: () => client,
  RPCLink: class {},
  ORPCError: class extends Error {},
}));

vi.mock("@orpc/client/fetch", () => ({
  RPCLink: class {},
}));

const { callAuth, callTasks } = await import("~/shared/vendor/orpc/client");

describe("orpc wrapper paths", () => {
  it("calls auth procedures under the auth segment", async () => {
    register(["auth", "requestOtp"], { ok: true });

    const result = await callAuth("requestOtp", { email: "a@b.com" });

    expect(result).toEqual({ ok: true });
    expect(calls.at(-1)?.path).toEqual(["auth", "requestOtp"]);
    expect(calls.at(-1)?.input).toEqual({ email: "a@b.com" });
  });

  it("calls the task list under the tasks segment", async () => {
    register(["tasks", "list"], []);

    await callTasks("list", {});

    expect(calls.at(-1)?.path).toEqual(["tasks", "list"]);
  });

  it("calls the task states under the nested states segment", async () => {
    register(["tasks", "states", "list"], []);

    await callTasks("states.list", undefined);

    expect(calls.at(-1)?.path).toEqual(["tasks", "states", "list"]);
  });

  it("fails loudly when the procedure is not registered", () => {
    // The walk throws synchronously: the procedure does not exist in the
    // client, so there is nothing to await.
    expect(() => callAuth("session", undefined)).toThrow(
      /auth.session is not registered/,
    );
  });
});
