import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createAppFetch } from "./composition-root";
import { createDatabase } from "../infrastructure/kysely/database";
import { cleanupAuthTables } from "../infrastructure/kysely/test-cleanup";

const databaseUrl = process.env.TEST_DATABASE_URL;

const fixedOtpGenerator = {
  generate(): string {
    return "041283";
  },
};

describe.skipIf(!databaseUrl)("auth HTTP endpoints (integration)", () => {
  let handler: ReturnType<typeof createAppFetch>;

  beforeAll(async () => {
    if (!databaseUrl) return;
    handler = createAppFetch(
      {
        DATABASE_URL: databaseUrl,
        SESSION_COOKIE_SECURE: "false",
      },
      { otpGenerator: fixedOtpGenerator },
    );
  });

  afterAll(async () => {
    if (!databaseUrl) return;
    const db = createDatabase(databaseUrl);
    await cleanupAuthTables(db);
    await db.destroy();
  });

  test("requestOtp devuelve 200 y encola email", async () => {
    const email = `http-${Date.now()}@example.com`;
    const response = await handler(
      new Request("http://localhost/rpc/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: true };
    expect(body.ok).toBe(true);
  });

  test("4.º envío de requestOtp devuelve 429", async () => {
    const email = `rate-http-${Date.now()}@example.com`;
    const makeRequest = () =>
      handler(
        new Request("http://localhost/rpc/auth/request-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
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
      new Request("http://localhost/rpc/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }),
    );
    expect(otpResponse.status).toBe(200);

    const response = await handler(
      new Request("http://localhost/rpc/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: "041283" }),
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { verdict: string };
    expect(body.verdict).toBe("valid");

    const setCookie = response.headers.get("Set-Cookie");
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toMatch(/Max-Age=2592000/);
  });

  test("session devuelve 401 sin cookie y 200 con cookie", async () => {
    const noCookieResponse = await handler(
      new Request("http://localhost/rpc/auth/session"),
    );
    expect(noCookieResponse.status).toBe(401);

    const email = `session-${Date.now()}@example.com`;
    await handler(
      new Request("http://localhost/rpc/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }),
    );
    const verifyResponse = await handler(
      new Request("http://localhost/rpc/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: "041283" }),
      }),
    );
    const setCookie = verifyResponse.headers.get("Set-Cookie") ?? "";
    const cookieMatch = /crm_session=([^;]+)/.exec(setCookie);
    expect(cookieMatch).toBeDefined();
    const cookie = cookieMatch![0];

    const withCookieResponse = await handler(
      new Request("http://localhost/rpc/auth/session", {
        headers: { Cookie: cookie },
      }),
    );
    expect(withCookieResponse.status).toBe(200);
    const body = (await withCookieResponse.json()) as {
      user: { email: string };
    };
    expect(body.user.email).toBe(email);
  });

  test("logout borra la cookie y deja session en 401", async () => {
    const email = `logout-${Date.now()}@example.com`;
    await handler(
      new Request("http://localhost/rpc/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }),
    );
    const verifyResponse = await handler(
      new Request("http://localhost/rpc/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: "041283" }),
      }),
    );
    const setCookie = verifyResponse.headers.get("Set-Cookie") ?? "";
    const cookieMatch = /crm_session=([^;]+)/.exec(setCookie);
    const cookie = cookieMatch![0];

    const logoutResponse = await handler(
      new Request("http://localhost/rpc/auth/logout", {
        method: "POST",
        headers: { Cookie: cookie },
      }),
    );
    expect(logoutResponse.status).toBe(200);
    const logoutCookie = logoutResponse.headers.get("Set-Cookie") ?? "";
    expect(logoutCookie).toContain("crm_session=");
    expect(logoutCookie).toContain("Max-Age=0");

    const sessionResponse = await handler(
      new Request("http://localhost/rpc/auth/session", {
        headers: { Cookie: cookie },
      }),
    );
    expect(sessionResponse.status).toBe(401);
  });
});
