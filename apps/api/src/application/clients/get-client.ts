import type { ClientRepository } from "../../domain/ports/client-repository";
import type { ClientRow } from "../../domain/tasks/types";

export interface GetClientInput {
  userId: string;
  clientId: string;
}

export interface GetClientDependencies {
  clientRepository: ClientRepository;
}

/**
 * Caso de uso: leer un client por id.
 *
 * Lee la fila por id (con filtro por user) en vez de listar y filtrar en
 * memoria: el listado tiene un tope de página, así que un `get` implementado
 * sobre la lista devolvía "no encontrado" para cualquier client fuera de
 * esa ventana.
 *
 * Devuelve `null` si el client no existe o es de otro usuario.
 */
export class GetClient {
  constructor(private readonly deps: GetClientDependencies) {}

  async execute(input: GetClientInput): Promise<ClientRow | null> {
    return this.deps.clientRepository.findById({
      userId: input.userId,
      clientId: input.clientId,
    });
  }
}
