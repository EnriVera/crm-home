import type { EventHandler } from "h3";
import type { GetHealth } from "../application/health/get-health";

// Ruta h3 GET /health (D5): delega en el caso de uso GetHealth del
// composition root. Devolver un objeto serializa a JSON con status 200.
export function createHealthRoute(getHealth: GetHealth): EventHandler {
  return async () => getHealth.execute();
}
