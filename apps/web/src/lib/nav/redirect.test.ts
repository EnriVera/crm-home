import { describe, expect, test } from "bun:test";
import {
  createAuthRedirect,
  redirectResponse,
  type SessionQuery,
} from "./redirect";

function createContext() {
  return {
    request: new Request("http://localhost/"),
    params: {},
    url: new URL("http://localhost/"),
    state: new Map<string, unknown>(),
  };
}

describe("createAuthRedirect", () => {
  test("sin sesión redirige a /login", async () => {
    const getSession: SessionQuery = () => Promise.resolve(null);
    const redirect = createAuthRedirect(getSession);

    const response = await redirect(createContext(), () =>
      Promise.resolve(new Response("no debería renderizar")),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/login");
  });

  test("con sesión redirige a /dashboard", async () => {
    const getSession: SessionQuery = () =>
      Promise.resolve({
        user: {
          id: "550e8400-e29b-41d4-a716-446655440000",
          email: "ana@example.com",
          name: "Ana",
        },
      });
    const redirect = createAuthRedirect(getSession);

    const response = await redirect(createContext(), () =>
      Promise.resolve(new Response("no debería renderizar")),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/dashboard");
  });

  test("error de red redirige a /login", async () => {
    const getSession: SessionQuery = () => Promise.reject(new Error("network"));
    const redirect = createAuthRedirect(getSession);

    const response = await redirect(createContext(), () =>
      Promise.resolve(new Response("no debería renderizar")),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/login");
  });

  test("el middleware nunca llama a next", async () => {
    const redirect = createAuthRedirect(() => Promise.resolve(null));
    let nextCalled = false;

    await redirect(createContext(), () => {
      nextCalled = true;
      return Promise.resolve(new Response("fallback"));
    });

    expect(nextCalled).toBe(false);
  });
});

describe("redirectResponse", () => {
  test("devuelve 302 con Location", () => {
    const response = redirectResponse("/login");
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/login");
  });
});
