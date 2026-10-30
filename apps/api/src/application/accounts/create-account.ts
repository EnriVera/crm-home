import type { AccountRepository } from "../../domain/ports/account-repository";
import type { CurrencyRepository } from "../../domain/ports/currency-repository";
import { InvalidAccountInput } from "./errors";

export interface CreateAccountInput {
  userId: string;
  name: string;
  icon: string | null;
  color: string | null;
  currencyId: string;
  initialAmount: string;
}

export interface CreateAccountDependencies {
  accountRepository: AccountRepository;
  currencyRepository: CurrencyRepository;
}

/**
 * Caso de uso: crear una cuenta del user.
 *
 * Validaciones de negocio (la forma del input ya la valida el zod del
 * contrato):
 * - Nombre no vacío (trim).
 * - La moneda existe (la FK de la DB lo garantiza a nivel de filas, pero
 *   un 23503 del driver es un 500: se valida acá para responder 400 con
 *   un code de dominio).
 * - El saldo inicial es un decimal ≥ 0 (la DB lo acepta negativo vía
 *   NUMERIC sin CHECK; el contrato solo valida el formato, así que el
 *   signo se valida acá).
 */
export class CreateAccount {
  constructor(private readonly deps: CreateAccountDependencies) {}

  async execute(input: CreateAccountInput): Promise<{
    id: string;
    userId: string;
    name: string;
    icon: string | null;
    color: string | null;
    currencyId: string;
    initialAmount: string;
    balance: string;
    createdAt: Date;
  }> {
    const name = input.name.trim();
    if (name.length === 0) {
      throw new InvalidAccountInput("account name must not be empty");
    }
    if (!/^\d+(\.\d{1,4})?$/.test(input.initialAmount)) {
      throw new InvalidAccountInput(
        "initial amount must be a decimal with up to 4 fraction digits",
      );
    }
    if (Number(input.initialAmount) < 0) {
      throw new InvalidAccountInput("initial amount must be >= 0");
    }
    const currency = await this.deps.currencyRepository.findById(
      input.currencyId,
    );
    if (!currency) {
      throw new InvalidAccountInput("currency does not exist");
    }
    return this.deps.accountRepository.insert({
      userId: input.userId,
      name,
      icon: input.icon,
      color: input.color,
      currencyId: input.currencyId,
      initialAmount: input.initialAmount,
    });
  }
}
