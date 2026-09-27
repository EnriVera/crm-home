import type { ClientRepository } from "../../domain/ports/client-repository";
import type { ClientRow } from "../../domain/tasks/types";
import { ClientNotFound } from "./errors";

export interface DeleteClientInput {
 userId: string;
 clientId: string;
}

export interface DeleteClientDependencies {
 clientRepository: ClientRepository;
}

/**
 * Caso de uso: soft-delete de un client.
 *
 * El repo setea `clie_deleted_at = NOW()`. Si el client no existe o ya
 * estaba borrado, `softDelete` no encuentra la fila y tira — lo
 * traducimos a `ClientNotFound` (404 en el handler).
 *
 * Nota: idempotencia NO se garantiza a nivel del repo (segundo softDelete
 * sobre el mismo id tira). Si el caller necesita idempotencia (ej. una
 * retry de un job), debería checkear primero con `findById`.
 */
export class DeleteClient {
 constructor(private readonly deps: DeleteClientDependencies) {}

 async execute(input: DeleteClientInput): Promise<ClientRow> {
  try {
   return await this.deps.clientRepository.softDelete(input);
  } catch (err) {
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
