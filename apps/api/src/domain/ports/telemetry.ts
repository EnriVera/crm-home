// Puerto Telemetry — superficie mínima; métricas/contadores se amplían
// en el change de telemetría (PRD §10).
export type Attributes = Record<string, string | number | boolean>;

export interface SpanHandle {
  setAttribute(key: string, value: string | number | boolean): void;
  recordException(error: unknown): void;
  end(): void;
}

export interface Telemetry {
  startSpan(name: string, attributes?: Attributes): SpanHandle;
  shutdown(): Promise<void>;
}
