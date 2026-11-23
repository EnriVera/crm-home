import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createAppFetch } from "./composition-root";
import { cleanupAuthTables } from "../infrastructure/kysely/test-cleanup";
import { resolveTestDatabaseUrl } from "../infrastructure/kysely/test-db";
import { describeIntegration, openTestDatabase } from "../infrastructure/kysely/test-db.helper";

// Resuelve y valida la URL al importar el archivo: si falta o apunta a la
// base de desarrollo, el archivo falla de inmediato (no se saltea en silencio).
const databaseUrl = resolveTestDatabaseUrl();

const fixedOtpGenerator = {
  generate(): string {
    return "041283";
  },
};

describeIntegration("auth HTTP endpoints (integration)", () => {
  let handler: ReturnType<typeof createAppFetch>;

  beforeAll(async () => {
    handler = createAppFetch(
      {
        DATABASE_URL: databaseUrl,
        SESSION_COOKIE_SECURE: "false",
      },
      { otpGenerator: fixedOtpGenerator },
    );
  });

  afterAll(async () => {
    const db = await openTestDatabase();
    await cleanupAuthTables(db);
    await db.destroy();
  });

  test("requestOtp devuelve 200 y encola email", async () => {
    const email = `http-${Date.now()}@example.com`;
    const response = await handler(
      new Request("http://localhost/rpc/auth/requestOtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: { email } }),
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { json: { ok: boolean } };
    expect(body.json.ok).toBe(true);
  });

  test("4.º envío de requestOtp devuelve 429", async () => {
    const email = `rate-http-${Date.now()}@example.com`;
    const makeRequest = () =>
      handler(
        new Request("http://localhost/rpc/auth/requestOtp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ json: { email } }),
        }),
      );

    await makeRequest();
    await makeRequest();
    await makeRequest();
    const response = await makeRequest();

    expect(response.status).toBe(429);
  });

  test("verifyOtp con código 041283 devuelve valid y setea cookie httpOnly", async () => {
    const email = `verify-${Date.now()}@example.com`;
    const otpResponse = await handler(
      new Request("http://localhost/rpc/auth/requestOtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: { email } }),
      }),
    );
    expect(otpResponse.status).toBe(200);

    const response = await handler(
      new Request("http://localhost/rpc/auth/verifyOtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: { email, code: "041283" } }),
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { json: { verdict: string } };
    expect(body.json.verdict).toBe("valid");

    const setCookie = response.headers.get("Set-Cookie");
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toMatch(/Max-Age=2592000/);
  });

  test("session devuelve 401 sin cookie y 200 con cookie", async () => {
    const noCookieResponse = await handler(
      new Request("http://localhost/rpc/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: undefined }),
      }),
    );
    expect(noCookieResponse.status).toBe(401);

    const email = `session-${Date.now()}@example.com`;
    await handler(
      new Request("http://localhost/rpc/auth/requestOtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: { email } }),
      }),
    );
    const verifyResponse = await handler(
      new Request("http://localhost/rpc/auth/verifyOtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: { email, code: "041283" } }),
      }),
    );
    const setCookie = verifyResponse.headers.get("Set-Cookie") ?? "";
    const cookieMatch = /crm_session=([^;]+)/.exec(setCookie);
    expect(cookieMatch).toBeDefined();
    const cookie = cookieMatch![0];

    const withCookieResponse = await handler(
      new Request("http://localhost/rpc/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ json: undefined }),
      }),
    );
    expect(withCookieResponse.status).toBe(200);
    const body = (await withCookieResponse.json()) as {
      json: { user: { email: string } };
    };
    expect(body.json.user.email).toBe(email);
  });

  test("logout borra la cookie y deja session en 401", async () => {
    const email = `logout-${Date.now()}@example.com`;
    await handler(
      new Request("http://localhost/rpc/auth/requestOtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: { email } }),
      }),
    );
    const verifyResponse = await handler(
      new Request("http://localhost/rpc/auth/verifyOtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: { email, code: "041283" } }),
      }),
    );
    const setCookie = verifyResponse.headers.get("Set-Cookie") ?? "";
    const cookieMatch = /crm_session=([^;]+)/.exec(setCookie);
    const cookie = cookieMatch![0];

    const logoutResponse = await handler(
      new Request("http://localhost/rpc/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ json: undefined }),
      }),
    );
    expect(logoutResponse.status).toBe(200);
    const logoutCookie = logoutResponse.headers.get("Set-Cookie") ?? "";
    expect(logoutCookie).toContain("crm_session=");
    expect(logoutCookie).toContain("Max-Age=0");

    const sessionResponse = await handler(
      new Request("http://localhost/rpc/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ json: undefined }),
      }),
    );
    expect(sessionResponse.status).toBe(401);
  });
});
