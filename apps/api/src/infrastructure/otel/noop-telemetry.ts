import type {
  Attributes,
  SpanHandle,
  Telemetry,
} from "../../domain/ports/telemetry";

class NoopSpanHandle implements SpanHandle {
  setAttribute(_key: string, _value: string | number | boolean): void {}
  recordException(_error: unknown): void {}
  end(): void {}
}

// Degradación por defecto (D4): sin OTEL_EXPORTER_OTLP_ENDPOINT la telemetría
// es no-op y el SDK de OpenTelemetry no se inicializa.
export class NoopTelemetry implements Telemetry {
  startSpan(_name: string, _attributes?: Attributes): SpanHandle {
    return new NoopSpanHandle();
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}
