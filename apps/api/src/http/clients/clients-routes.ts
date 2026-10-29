import type { H3Event } from "h3";
import { readValidatedBody } from "h3";
import { z } from "zod";
import {
  clientEmailSchema,
  clientLimitSchema,
  clientNameSchema,
  clientPhoneSchema,
  clientSearchSchema,
} from "@crm/contract/client";
import { uuidSchema } from "@crm/contract/shared/identifiers";
import { ListClients } from "../../application/clients/list-clients";
import { GetClient } from "../../application/clients/get-client";
import { CreateClient } from "../../application/clients/create-client";
import { UpdateClient } from "../../application/clients/update-client";
import { DeleteClient } from "../../application/clients/delete-client";
import { ListClientDependencies } from "../../application/clients/list-client-dependencies";
import type { ClientRow } from "../../domain/types";
import { mapDomainErrorToStatus } from "../error-mapping";
import { readUserId } from "../request-user";

/**
 * Entry HTTP del módulo `clients`.
 *
 * Sigue el patrón de `tasks-routes.ts`: lee `userId` desde el header
 * `X-User-Id` (inyectado por el dispatch wrapper) y devuelve el output
 * envuelto en un Response JSON. Los errores se mapean con el helper
 * compartido `mapDomainErrorToStatus`.
 */

export interface ClientsRouteDependencies {
  listClients: ListClients;
  getClient: GetClient;
  createClient: CreateClient;
  updateClient: UpdateClient;
  deleteClient: DeleteClient;
  listClientDependencies: ListClientDependencies;
}

// Los schemas de entrada vienen del contrato (`@crm/contract/client`): la
// API no re-declara lo que el contrato ya define.
const listClientsInputSchema = z.object({
  search: clientSearchSchema,
  limit: clientLimitSchema,
});

const getClientInputSchema = z.object({ client_id: uuidSchema });

const createClientInputSchema = z.object({
  client_name: clientNameSchema,
  client_email: clientEmailSchema,
  client_phone: clientPhoneSchema,
});

const updateClientInputSchema = z.object({
  client_id: uuidSchema,
  client_name: clientNameSchema.optional(),
  client_email: clientEmailSchema.optional(),
  client_phone: clientPhoneSchema.optional(),
});

const removeClientInputSchema = z.object({ client_id: uuidSchema });

function mapClientRowToContract(row: ClientRow) {
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
      const { status, body } = mapDomainErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function createGetClientHandler(deps: ClientsRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(event, getClientInputSchema.parse);
      // `get` lee por id, no por listado: el lookup de búsqueda tiene un
      // tope de página, así que filtrar la lista en memoria devolvía 404
      // para cualquier client fuera de esa ventana.
      const found = await deps.getClient.execute({
        userId,
        clientId: body.client_id,
      });
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
      const { status, body } = mapDomainErrorToStatus(err);
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
      const { status, body } = mapDomainErrorToStatus(err);
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
      const { status, body } = mapDomainErrorToStatus(err);
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
      const { status, body } = mapDomainErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

/**
 * Qué tiene enganchado un cliente (PRD-v2 §8.5): la UI lo consulta antes
 * de borrar para pedir una confirmación explícita que liste las
 * dependencias.
 */
export function listClientDependenciesHandler(
  deps: ClientsRouteDependencies,
) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(
        event,
        getClientInputSchema.parse,
      );
      const result = await deps.listClientDependencies.execute({
        userId,
        clientId: body.client_id,
      });
      return Response.json({
        dependencies: result.dependencies.map((dependency) => ({
          task_id: dependency.taskId,
          task_title: dependency.taskTitle,
        })),
        total: result.total,
      });
    } catch (err) {
      const { status, body } = mapDomainErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}
