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
    expect(
      createTelemetry({ OTEL_EXPORTER_OTLP_ENDPOINT: "" }),
    ).toBeInstanceOf(NoopTelemetry);
  });
});
