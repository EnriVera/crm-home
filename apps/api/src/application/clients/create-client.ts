import type { ClientRepository } from "../../domain/ports/client-repository";
import type { ClientRow } from "../../domain/tasks/types";
import { InvalidClientInput } from "./errors";

export interface CreateClientInput {
  userId: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface CreateClientDependencies {
  clientRepository: ClientRepository;
}

/**
 * Caso de uso: crear un client nuevo.
 *
 * Pasos:
 * 1. Validar `name` (mismo criterio que `clientNameSchema`: min 1, max 100).
 *    Las validaciones de `email` y `phone` ya las hace el Zod del contract,
 *    pero re-validamos acá para defensa en profundidad (un día alguien
 *    puede invocar este use case directo desde un seeder sin pasar por
 *    el contract).
 * 2. Insertar.
 *
 * El repo aplica `userId` para multi-tenant isolation (no se filtra por
 * user acá — el repo siempre filtra).
 */
export class CreateClient {
  constructor(private readonly deps: CreateClientDependencies) {}

  async execute(input: CreateClientInput): Promise<ClientRow> {
    const trimmed = input.name.trim();
    if (trimmed.length === 0 || trimmed.length > 100) {
      throw new InvalidClientInput("client name must be 1-100 chars");
    }
    if (input.email !== null && input.email.length > 254) {
      throw new InvalidClientInput("client email too long");
    }
    if (input.phone !== null && input.phone.length > 40) {
      throw new InvalidClientInput("client phone too long");
    }

    return this.deps.clientRepository.insert({
      userId: input.userId,
      name: trimmed,
      email: input.email,
      phone: input.phone,
    });
  }
}
