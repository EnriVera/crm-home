import { describe, expect, test } from "bun:test";
import {
  createAuthRedirect,
  createRedirectIfAuthenticated,
  redirectResponse,
} from "./redirect";

function createContext(opts: { cookie?: string; url?: string } = {}) {
  const headers = new Headers();
  if (opts.cookie) headers.set("cookie", opts.cookie);
  const url = opts.url ?? "http://localhost/";
  return {
    request: new Request(url, { headers }),
    params: {},
    url: new URL(url),
    state: new Map<string, unknown>(),
  };
}

describe("createAuthRedirect", () => {
  test("sin cookie redirige a /login", async () => {
    const redirect = createAuthRedirect();

    const response = await redirect(createContext(), () =>
      Promise.resolve(new Response("no debería renderizar")),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/login");
  });

  test("con cookie crm_session redirige a /dashboard", async () => {
    const redirect = createAuthRedirect();

    const response = await redirect(
      createContext({ cookie: "crm_session=abc123; Path=/" }),
      () => Promise.resolve(new Response("no debería renderizar")),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/dashboard");
  });

  test("con cookie sin crm_session redirige a /login", async () => {
    const redirect = createAuthRedirect();

    const response = await redirect(
      createContext({ cookie: "other_cookie=foo" }),
      () => Promise.resolve(new Response("no debería renderizar")),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/login");
  });

  test("el middleware nunca llama a next", async () => {
    const redirect = createAuthRedirect();
    let nextCalled = false;

    await redirect(createContext(), () => {
      nextCalled = true;
      return Promise.resolve(new Response("fallback"));
    });

    expect(nextCalled).toBe(false);
  });
});

describe("createRedirectIfAuthenticated", () => {
  test("sin cookie deja pasar (next)", async () => {
    const middleware = createRedirectIfAuthenticated();
    const next = vi(() => Promise.resolve(new Response("login")));
    const response = await middleware(createContext(), next.fn);
    expect(response.status).toBe(200);
    expect(next.calls).toBe(1);
  });

  test("con cookie crm_session redirige a /dashboard", async () => {
    const middleware = createRedirectIfAuthenticated();
    const response = await middleware(
      createContext({ cookie: "crm_session=abc123; Path=/" }),
      () => Promise.resolve(new Response("no debería renderizar")),
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/dashboard");
  });

  test("con cookie + ?reauth=1 deja pasar (next) — el 401 interceptor del RPC lo usa para forzar re-login", async () => {
    const middleware = createRedirectIfAuthenticated();
    let nextCalled = false;
    const response = await middleware(
      createContext({
        cookie: "crm_session=stale-token; Path=/",
        url: "http://localhost/login?reauth=1",
      }),
      () => {
        nextCalled = true;
        return Promise.resolve(new Response("login form"));
      },
    );
    expect(nextCalled).toBe(true);
    expect(response.status).toBe(200);
  });

  test("con cookie + reauth con valor distinto a 1 sigue redirigiendo", async () => {
    const middleware = createRedirectIfAuthenticated();
    const response = await middleware(
      createContext({
        cookie: "crm_session=abc123",
        url: "http://localhost/login?reauth=0",
      }),
      () => Promise.resolve(new Response("no debería renderizar")),
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/dashboard");
  });
});

describe("redirectResponse", () => {
  test("devuelve 302 con Location", () => {
    const response = redirectResponse("/login");
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/login");
  });
});

/**
 * Mini-helper para `createRedirectIfAuthenticated`: cuenta invocaciones de
 * `next`. Mantenido local al test file para no contaminar otros tests.
 */
function vi<T extends (...args: never[]) => unknown>(fn: T) {
  let calls = 0;
  const wrapped = (...args: Parameters<T>) => {
    calls += 1;
    return fn(...args);
  };
  return {
    fn: wrapped as T,
    get calls() {
      return calls;
    },
  };
}
