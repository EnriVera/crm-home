import { describe, expect, test } from "bun:test";
import { createRequireSession } from "./session-guard";

function createContext(opts: { cookie?: string } = {}) {
  const headers = new Headers();
  if (opts.cookie) headers.set("cookie", opts.cookie);
  return {
    request: new Request("http://localhost/dashboard", { headers }),
    params: {},
    url: new URL("http://localhost/dashboard"),
    state: new Map<string, unknown>(),
  };
}

describe("createRequireSession", () => {
  test("sin cookie redirige a /login", async () => {
    const guard = createRequireSession();

    const response = await guard(createContext(), () =>
      Promise.resolve(new Response("shell")),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/login");
  });

  test("con cookie crm_session continúa al render", async () => {
    const guard = createRequireSession();

    const next = await guard(
      createContext({ cookie: "crm_session=abc123; Path=/" }),
      () => Promise.resolve(new Response("shell")),
    );

    expect(next.status).toBe(200);
  });

  test("con cookie sin crm_session redirige a /login", async () => {
    const guard = createRequireSession();

    const response = await guard(
      createContext({ cookie: "other_cookie=foo" }),
      () => Promise.resolve(new Response("shell")),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/login");
  });

  test("header Location es exactamente /login", async () => {
    const guard = createRequireSession();

    const response = await guard(createContext(), () =>
      Promise.resolve(new Response("shell")),
    );

    expect(response.headers.get("Location")).toBe("/login");
  });
});
