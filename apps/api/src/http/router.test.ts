import { describe, expect, test } from "bun:test";
import { NoopTelemetry } from "../infrastructure/otel/noop-telemetry";
import { createTelemetry } from "../infrastructure/otel/create-telemetry";
import { createAppFetch } from "./composition-root";

// Smoke test puro (D10): sin DOM, sin red, sin BD y sin endpoint OTLP.
describe("composition root (smoke)", () => {
  test("GET /health responde 200 con status ok", async () => {
    const handler = createAppFetch({});
    const response = await handler(new Request("http://localhost/health"));

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      status: string;
      timestamp: string;
    };
    expect(body.status).toBe("ok");
    expect(typeof body.timestamp).toBe("string");
  });

  test("sin OTEL_EXPORTER_OTLP_ENDPOINT la telemetría degrada a no-op", () => {
    expect(createTelemetry({})).toBeInstanceOf(NoopTelemetry);
    expect(createTelemetry({ OTEL_EXPORTER_OTLP_ENDPOINT: "" })).toBeInstanceOf(
      NoopTelemetry,
    );
  });
});

// Guard de regresión (PRD-v4 §18): el dev CORS debe aceptar los tres
// frontends de desarrollo por default y permitir override vía WEB_ORIGINS.
describe("dev CORS allowlist (PRD-v4 §15.1)", () => {
  const preflight = (origin: string) =>
    new Request("http://localhost/rpc/auth.requestOtp", {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "POST",
      },
    });

  test("por default acepta los tres frontends (5173/5174/5175)", async () => {
    const handler = createAppFetch({});
    for (const port of [5173, 5174, 5175]) {
      const response = await handler(
        preflight(`http://localhost:${port}`),
      );
      expect(response.headers.get("access-control-allow-origin")).toBe(
        `http://localhost:${port}`,
      );
    }
  });

  test("WEB_ORIGINS override reemplaza el default", async () => {
    const handler = createAppFetch({ WEB_ORIGINS: "http://127.0.0.1:5175" });
    const allowed = await handler(preflight("http://127.0.0.1:5175"));
    expect(allowed.headers.get("access-control-allow-origin")).toBe(
      "http://127.0.0.1:5175",
    );
    const rejected = await handler(preflight("http://localhost:5173"));
    expect(rejected.headers.get("access-control-allow-origin")).toBeNull();
  });
});
