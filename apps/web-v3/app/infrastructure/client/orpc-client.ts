/**
 * Client adapter: the only place that talks to the API about clients.
 *
 * The API speaks snake_case on the wire and the domain speaks camelCase,
 * so the mapping lives here and nowhere else (PRD-v4 §11.4).
 */
import type { Client } from "~/domain/client/entities";
import { callClients, type ClientWire } from "~/shared/vendor/orpc";

function toClient(wire: ClientWire): Client {
  return {
    id: wire.client_id,
    name: wire.client_name,
    email: wire.client_email,
    phone: wire.client_phone,
    createdAt: new Date(wire.client_created_at),
    updatedAt: new Date(wire.client_updated_at),
  };
}

/** Every client of the user, optionally filtered by the API. */
export async function listClients(search = ""): Promise<Client[]> {
  const wire = await callClients("list", { search, limit: 100 });
  return wire.map(toClient);
}

export interface ClientInput {
  name: string;
  email: string | null;
  phone: string | null;
}

export async function createClient(input: ClientInput): Promise<Client> {
  const wire = await callClients("create", {
    client_name: input.name,
    client_email: input.email,
    client_phone: input.phone,
  });
  return toClient(wire);
}

export async function updateClient(
  input: Partial<ClientInput> & { id: string },
): Promise<Client> {
  const wire = await callClients("update", {
    client_id: input.id,
    ...(input.name !== undefined ? { client_name: input.name } : {}),
    ...(input.email !== undefined ? { client_email: input.email } : {}),
    ...(input.phone !== undefined ? { client_phone: input.phone } : {}),
  });
  return toClient(wire);
}

export async function removeClient(id: string): Promise<void> {
  await callClients("remove", { client_id: id });
}

/**
 * What the client has attached (PRD-v2 §8.5): the UI asks for this
 * before deleting, to confirm with the dependencies listed.
 */
export async function listClientDependencies(id: string): Promise<{
  dependencies: { taskId: string; taskTitle: string }[];
  total: number;
}> {
  const wire = await callClients("dependencies", { client_id: id });
  return {
    dependencies: wire.dependencies.map((dependency) => ({
      taskId: dependency.task_id,
      taskTitle: dependency.task_title,
    })),
    total: wire.total,
  };
}
