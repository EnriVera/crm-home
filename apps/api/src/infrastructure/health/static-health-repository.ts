import type {
  HealthRepository,
  HealthStatus,
} from "../../domain/ports/health-repository";

// Adapter trivial (D4): responde sin tocar la BD, de modo que GET /health
// devuelve 200 aunque postgres no esté levantado.
export class StaticHealthRepository implements HealthRepository {
  check(): Promise<HealthStatus> {
    return Promise.resolve({ status: "ok" });
  }
}
