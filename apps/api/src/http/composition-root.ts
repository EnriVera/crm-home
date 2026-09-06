import { fromWebHandler, H3 } from "h3";
import { GetHealth } from "../application/health/get-health";
import type { Telemetry } from "../domain/ports/telemetry";
import { StaticHealthRepository } from "../infrastructure/health/static-health-repository";
import {
  createTelemetry,
  type TelemetryEnv,
} from "../infrastructure/otel/create-telemetry";
import { createHealthRoute } from "./routes";
import { createRpcFetchHandler } from "./router";

export interface CompositionRoot {
  telemetry: Telemetry;
  getHealth: GetHealth;
  app: H3;
}

// Composition root (D4): ÚNICO wiring del scaffold. Construye la telemetría
// (factory no-op/OTel), el repositorio de salud y el caso de uso, y monta la
// ruta h3 GET /health y el router orpc en /rpc/* (D5).
export function createCompositionRoot(
  env: TelemetryEnv = process.env,
): CompositionRoot {
  const telemetry = createTelemetry(env);
  const healthRepository = new StaticHealthRepository();
  const getHealth = new GetHealth(healthRepository, telemetry);

  const app = new H3();
  app.get("/health", createHealthRoute(getHealth));
  const rpcFetchHandler = createRpcFetchHandler(getHealth);
  app.all("/rpc/**", (event) => rpcFetchHandler(event.req));

  return { telemetry, getHealth, app };
}

// Handler fetch de la app completa (usado por el smoke test y por nitro).
export function createAppFetch(
  env: TelemetryEnv = process.env,
): (request: Request) => Promise<Response> {
  const { app } = createCompositionRoot(env);
  return (request: Request) =>
    Promise.resolve(app.fetch(request as never)) as Promise<Response>;
}

// Entry para nitro (nitro.config.ts apunta aquí con route "/**").
export default fromWebHandler(createAppFetch());
