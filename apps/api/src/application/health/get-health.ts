import type { HealthRepository } from "../../domain/ports/health-repository";
import type { Telemetry } from "../../domain/ports/telemetry";

export interface HealthPayload {
  status: "ok";
  timestamp: string;
}

// Caso de uso GetHealth (D4): depende solo de domain/; recibe los puertos
// por inyección desde el composition root.
export class GetHealth {
  constructor(
    private readonly healthRepository: HealthRepository,
    private readonly telemetry: Telemetry,
  ) {}

  async execute(): Promise<HealthPayload> {
    const span = this.telemetry.startSpan("http.health");
    try {
      const { status } = await this.healthRepository.check();
      return { status, timestamp: new Date().toISOString() };
    } catch (error) {
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }
}
