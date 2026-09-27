import type { ClientRepository } from "../../domain/ports/client-repository";
import type { ClientRow } from "../../domain/tasks/types";
import { ClientNotFound, InvalidClientInput } from "./errors";

export interface UpdateClientInput {
  userId: string;
  clientId: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
}

export interface UpdateClientDependencies {
  clientRepository: ClientRepository;
}

/**
 * Caso de uso: actualizar parcialmente un client.
 *
 * Solo se actualizan los campos provistos (los `undefined` se omiten en el
 * repo). El repo ya filtra por `userId` + `clientId` + `clie_deleted_at`,
 * por lo que un client que no existe o pertenece a otro user hace que
 * `update` retorne "no row" — lo traducimos a `ClientNotFound`.
 *
 * Validaciones de longitud (mismas que CreateClient) se aplican acá también
 * para defensa en profundidad (el Zod del contract ya las hace, pero un
 * caller directo — un seeder, un job — podría saltárselas).
 */
export class UpdateClient {
  constructor(private readonly deps: UpdateClientDependencies) {}

  async execute(input: UpdateClientInput): Promise<ClientRow> {
    if (input.name !== undefined) {
      const trimmed = input.name.trim();
      if (trimmed.length === 0 || trimmed.length > 100) {
        throw new InvalidClientInput("client name must be 1-100 chars");
      }
      input = { ...input, name: trimmed };
    }
    if (input.email !== undefined && input.email !== null && input.email.length > 254) {
      throw new InvalidClientInput("client email too long");
    }
    if (input.phone !== undefined && input.phone !== null && input.phone.length > 40) {
      throw new InvalidClientInput("client phone too long");
    }

    try {
      return await this.deps.clientRepository.update(input);
    } catch (err) {
      // executeTakeFirstOrThrow → ClientNotFound cuando no hay match
      if (
        err instanceof Error &&
        (err.message.includes("no result") || err.message.includes("not found"))
      ) {
        throw new ClientNotFound();
      }
      throw err;
    }
  }
}
