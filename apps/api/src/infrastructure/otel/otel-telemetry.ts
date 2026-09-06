import { trace, type Span, type Tracer } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import type {
  Attributes,
  SpanHandle,
  Telemetry,
} from "../../domain/ports/telemetry";

class OtelSpanHandle implements SpanHandle {
  constructor(private readonly span: Span) {}

  setAttribute(key: string, value: string | number | boolean): void {
    this.span.setAttribute(key, value);
  }

  recordException(error: unknown): void {
    this.span.recordException(
      error instanceof Error ? error : new Error(String(error)),
    );
  }

  end(): void {
    this.span.end();
  }
}

// Adapter OTel (D4): ÚNICO archivo que importa el SDK de OpenTelemetry.
// Solo se instancia cuando OTEL_EXPORTER_OTLP_ENDPOINT está definida
// (la selección ocurre en createTelemetry).
export class OtelTelemetry implements Telemetry {
  private readonly sdk: NodeSDK;
  private readonly tracer: Tracer;

  constructor(endpoint: string) {
    this.sdk = new NodeSDK({
      resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: "@crm/api",
      }),
      traceExporter: new OTLPTraceExporter({
        url: `${endpoint.replace(/\/$/, "")}/v1/traces`,
      }),
    });
    this.sdk.start();
    this.tracer = trace.getTracer("@crm/api");
  }

  startSpan(name: string, attributes?: Attributes): SpanHandle {
    return new OtelSpanHandle(this.tracer.startSpan(name, { attributes }));
  }

  async shutdown(): Promise<void> {
    await this.sdk.shutdown();
  }
}
