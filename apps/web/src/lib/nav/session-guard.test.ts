import { describe, expect, test } from "bun:test";
import { createRequireSession, type SessionQuery } from "./session-guard";

function createContext() {
  return {
    request: new Request("http://localhost/dashboard"),
    params: {},
    url: new URL("http://localhost/dashboard"),
    state: new Map<string, unknown>(),
  };
}

describe("createRequireSession", () => {
  test("sin sesión redirige a /login", async () => {
    const guard = createRequireSession(() => Promise.resolve(null));

    const response = await guard(createContext(), () =>
      Promise.resolve(new Response("shell")),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/login");
  });

  test("con sesión continúa al render", async () => {
    const guard = createRequireSession(() =>
      Promise.resolve({
        user: {
          id: "550e8400-e29b-41d4-a716-446655440000",
          email: "ana@example.com",
          name: "Ana",
        },
      }),
    );

    const next = await guard(createContext(), () =>
      Promise.resolve(new Response("shell")),
    );

    expect(next.status).toBe(200);
  });

  test("header Location es exactamente /login", async () => {
    const guard = createRequireSession(() => Promise.resolve(null));

    const response = await guard(createContext(), () =>
      Promise.resolve(new Response("shell")),
    );

    expect(response.headers.get("Location")).toBe("/login");
  });

  test("error de red redirige a /login", async () => {
    const guard = createRequireSession(() => Promise.reject(new Error("network")));

    const response = await guard(createContext(), () =>
      Promise.resolve(new Response("shell")),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/login");
  });
});
