import type { TransferRepository } from "../../domain/ports/transfer-repository";
import type { AccountRepository } from "../../domain/ports/account-repository";
import type { CurrencyRepository } from "../../domain/ports/currency-repository";
import type { TransferRow } from "../../domain/types";
import { validateTransferAccountAndCurrency } from "../shared/finance-validation";
import { normalizeAmount } from "../shared/money";
import { InvalidTransferInput } from "./errors";

export interface CreateTransferInput {
  userId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  currencyId: string;
  description: string | null;
  date: string;
}

export interface CreateTransferDependencies {
  transferRepository: TransferRepository;
  accountRepository: AccountRepository;
  currencyRepository: CurrencyRepository;
}

export class CreateTransfer {
  constructor(private readonly deps: CreateTransferDependencies) {}

  async execute(input: CreateTransferInput): Promise<TransferRow> {
    const amount = input.amount.trim();
    if (input.fromAccountId === input.toAccountId) {
      throw new InvalidTransferInput("from and to accounts must differ");
    }
    if (input.description !== null && input.description.length > 500) {
      throw new InvalidTransferInput("description exceeds 500 chars");
    }

    // Las dos cuentas tienen que ser del usuario: la FK sólo garantiza
    // que existan, y una transferencia entre cuentas ajenas movería plata
    // de un usuario a otro. Además la transferencia tiene que estar en la
    // moneda de las dos cuentas: el balance de cada una suma sus
    // movimientos, y una transferencia en otra moneda lo dejaría en una
    // suma sin sentido.
    await validateTransferAccountAndCurrency(
      this.deps,
      {
        userId: input.userId,
        fromAccountId: input.fromAccountId,
        toAccountId: input.toAccountId,
        currencyId: input.currencyId,
      },
      (message) => new InvalidTransferInput(message),
    );

    return this.deps.transferRepository.insert({
      userId: input.userId,
      fromAccountId: input.fromAccountId,
      toAccountId: input.toAccountId,
      amount: normalizeAmount(amount),
      currencyId: input.currencyId,
      description: input.description,
      date: input.date,
    });
  }
}
