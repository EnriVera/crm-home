import type { Telemetry } from "../../domain/ports/telemetry";
import { NoopTelemetry } from "./noop-telemetry";
import { OtelTelemetry } from "./otel-telemetry";

export interface TelemetryEnv {
  OTEL_EXPORTER_OTLP_ENDPOINT?: string | undefined;
  // compatible con process.env (NodeJS.ProcessEnv)
  [key: string]: string | undefined;
}

// Factory (D4): sin endpoint OTLP (vacío/ausente) devuelve el adapter no-op
// SIN inicializar el SDK de OpenTelemetry.
export function createTelemetry(env: TelemetryEnv): Telemetry {
  const endpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();
  if (!endpoint) {
    return new NoopTelemetry();
  }
  return new OtelTelemetry(endpoint);
}
