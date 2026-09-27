import type { H3Event } from "h3";
import { readValidatedBody } from "h3";
import { z } from "zod";
import { ListClients } from "../../application/clients/list-clients";
import { CreateClient } from "../../application/clients/create-client";
import { UpdateClient } from "../../application/clients/update-client";
import { DeleteClient } from "../../application/clients/delete-client";
import {
  ClientNotFound,
  InvalidClientInput,
} from "../../application/clients/errors";
import { mapTaskErrorToStatus } from "../tasks/error-mapping";
import { readUserId } from "../tasks/tasks-routes";

/**
 * Entry HTTP del módulo `clients`.
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
  createClient: CreateClient;
  updateClient: UpdateClient;
  deleteClient: DeleteClient;
}

const listClientsInputSchema = z.object({
  search: z.string().max(100).default(""),
  limit: z.number().int().min(1).max(100).default(50),
});

const getClientInputSchema = z.object({
  client_id: z.string().uuid(),
});

const createClientInputSchema = z.object({
  client_name: z.string().min(1).max(100),
  client_email: z.union([z.string().email(), z.null()]).default(null),
  client_phone: z.union([z.string().max(40), z.null()]).default(null),
});

const updateClientInputSchema = z.object({
  client_id: z.string().uuid(),
  client_name: z.string().min(1).max(100).optional(),
  client_email: z.union([z.string().email(), z.null()]).optional(),
  client_phone: z.union([z.string().max(40), z.null()]).optional(),
});

const removeClientInputSchema = z.object({
  client_id: z.string().uuid(),
});

function mapClientRowToContract(row: {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    client_id: row.id,
    client_name: row.name,
    client_email: row.email,
    client_phone: row.phone,
    client_created_at: row.createdAt,
    client_updated_at: row.updatedAt,
  };
}

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
      return Response.json(rows.map(mapClientRowToContract));
    } catch (err) {
      const { status, body } = mapTaskErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function createGetClientHandler(deps: ClientsRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(event, getClientInputSchema.parse);
      const result = await deps.listClients.execute({
        userId,
        search: "",
        limit: 100,
      });
      const found = result.find((row) => row.id === body.client_id);
      if (!found) {
        return Response.json(
          {
            defined: true,
            code: "CLIENT_NOT_FOUND",
            message: "Client not found",
          },
          { status: 404 },
        );
      }
      return Response.json(mapClientRowToContract(found));
    } catch (err) {
      const { status, body } = mapTaskErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function createClientHandler(deps: ClientsRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(
        event,
        createClientInputSchema.parse,
      );
      const row = await deps.createClient.execute({
        userId,
        name: body.client_name,
        email: body.client_email ?? null,
        phone: body.client_phone ?? null,
      });
      return Response.json(mapClientRowToContract(row), { status: 201 });
    } catch (err) {
      if (err instanceof InvalidClientInput) {
        return Response.json(
          { defined: true, code: "INVALID_CLIENT_INPUT", message: err.message },
          { status: 400 },
        );
      }
      const { status, body } = mapTaskErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function updateClientHandler(deps: ClientsRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(
        event,
        updateClientInputSchema.parse,
      );
      const row = await deps.updateClient.execute({
        userId,
        clientId: body.client_id,
        name: body.client_name,
        email: body.client_email,
        phone: body.client_phone,
      });
      return Response.json(mapClientRowToContract(row));
    } catch (err) {
      if (err instanceof InvalidClientInput) {
        return Response.json(
          { defined: true, code: "INVALID_CLIENT_INPUT", message: err.message },
          { status: 400 },
        );
      }
      if (err instanceof ClientNotFound) {
        return Response.json(
          { defined: true, code: "CLIENT_NOT_FOUND", message: err.message },
          { status: 404 },
        );
      }
      const { status, body } = mapTaskErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function deleteClientHandler(deps: ClientsRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(
        event,
        removeClientInputSchema.parse,
      );
      await deps.deleteClient.execute({
        userId,
        clientId: body.client_id,
      });
      return Response.json({ ok: true });
    } catch (err) {
      if (err instanceof ClientNotFound) {
        return Response.json(
          { defined: true, code: "CLIENT_NOT_FOUND", message: err.message },
          { status: 404 },
        );
      }
      const { status, body } = mapTaskErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}
