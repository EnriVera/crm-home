import { describe, expect, test } from "bun:test";

/**
 * Test puro del middleware de redirect `/` (D2): dado un Context de request
 * a `/`, devuelve `Response` 302 con `Location: /login` (Response es
 * construible sin DOM en bun). RED: `lib/nav/redirect.ts` no existe aún.
 */
describe("lib/nav/redirect", () => {
  test("GET / → 302 Location: /login", async () => {
    const { rootRedirect } = await import("./redirect");
    const context = {
      request: new Request("http://localhost/"),
      params: {},
      url: new URL("http://localhost/"),
      state: new Map<string, unknown>(),
    };
    const response = await rootRedirect(context, () =>
      Promise.resolve(new Response("no debería renderizar")),
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/login");
  });

  test("el middleware nunca llama a next (no renderiza el fallback)", async () => {
    const { rootRedirect } = await import("./redirect");
    let nextCalled = false;
    const context = {
      request: new Request("http://localhost/"),
      params: {},
      url: new URL("http://localhost/"),
      state: new Map<string, unknown>(),
    };
    await rootRedirect(context, () => {
      nextCalled = true;
      return Promise.resolve(new Response("fallback"));
    });
    expect(nextCalled).toBe(false);
  });
});
