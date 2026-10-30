import type {
  AccountRepository,
  AccountRow,
} from "../../domain/ports/account-repository";

export interface ListAccountsInput {
  userId: string;
}

export interface ListAccountsDependencies {
  accountRepository: AccountRepository;
}

/**
 * Caso de uso: las cuentas del user con su balance calculado.
 *
 * El balance viene del repo (una sola query, PRD-v2 §8.6); acá no hay
 * reglas de negocio — es un passthrough con la dependencia inyectada.
 */
export class ListAccounts {
  constructor(private readonly deps: ListAccountsDependencies) {}

  async execute(input: ListAccountsInput): Promise<AccountRow[]> {
    return this.deps.accountRepository.listByUser(input.userId);
  }
}
