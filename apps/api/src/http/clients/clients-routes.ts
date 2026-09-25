import type { H3Event } from "h3";
import { readValidatedBody } from "h3";
import { z } from "zod";
import { ListClients } from "../../application/clients/list-clients";
import { mapTaskErrorToStatus } from "../tasks/error-mapping";
import { readUserId } from "../tasks/tasks-routes";

/**
 * Entry HTTP del módulo `clients` (read-only MVP).
 *
 * Sigue el patrón de `tasks-routes.ts`: lee `userId` desde el header
 * `X-User-Id` (inyectado por el dispatch wrapper) y devuelve el output
 * envuelto en un Response JSON. Los errores ORPC se mapean vía
 * `mapTaskErrorToStatus` (compartido con tasks).
 *
 * TODO: extraer `readUserId` y `mapTaskErrorToStatus` a un módulo
 * `http/helpers.ts` para evitar que clients dependa de tasks.
 */

export interface ClientsRouteDependencies {
  listClients: ListClients;
}

const listClientsInputSchema = z.object({
  search: z.string().max(100).default(""),
  limit: z.number().int().min(1).max(100).default(50),
});

export function createListClientsHandler(deps: ClientsRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(event, listClientsInputSchema.parse);
      const rows = await deps.listClients.execute({
        userId,
        search: body.search,
        limit: body.limit,
      });
      return Response.json(
        rows.map((row) => ({
          client_id: row.id,
          client_name: row.name,
          client_email: row.email,
          client_phone: row.phone,
          client_created_at: row.createdAt,
          client_updated_at: row.updatedAt,
        })),
      );
    } catch (err) {
      const { status, body } = mapTaskErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}
