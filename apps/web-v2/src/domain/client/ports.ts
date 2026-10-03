import type { Client, ClientInput, ClientPatch } from "@crm/contract/client";
import type { Result } from "../shared/result";
import type { DomainError } from "../shared/errors";

export interface ClientRepository {
  list(): Promise<Result<Client[], DomainError>>;
  get(id: Client["id"]): Promise<Result<Client, DomainError>>;
  create(input: ClientInput): Promise<Result<Client, DomainError>>;
  patch(
    id: Client["id"],
    input: ClientPatch,
  ): Promise<Result<Client, DomainError>>;
  remove(id: Client["id"]): Promise<Result<null, DomainError>>;
}

export type { Client, ClientInput, ClientPatch };
