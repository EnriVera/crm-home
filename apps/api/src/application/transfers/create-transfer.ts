import type { TransferRepository } from "../../domain/ports/transfer-repository";
import type { AccountRepository } from "../../domain/ports/account-repository";
import type { CurrencyRepository } from "../../domain/ports/currency-repository";
import type { TransferRow } from "../../domain/types";
import {
  assertCurrencyExists,
  assertOwnedAccount,
} from "../shared/finance-validation";
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
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      throw new InvalidTransferInput("amount must be a positive number");
    }
    if (input.fromAccountId === input.toAccountId) {
      throw new InvalidTransferInput("from and to accounts must differ");
    }
    if (input.description !== null && input.description.length > 500) {
      throw new InvalidTransferInput("description exceeds 500 chars");
    }

    // Las dos cuentas tienen que ser del usuario: la FK sólo garantiza
    // que existan, y una transferencia entre cuentas ajenas movería plata
    // de un usuario a otro.
    await assertOwnedAccount(
      this.deps,
      { userId: input.userId, accountId: input.fromAccountId },
      (message) => new InvalidTransferInput(message),
    );
    await assertOwnedAccount(
      this.deps,
      { userId: input.userId, accountId: input.toAccountId },
      (message) => new InvalidTransferInput(message),
    );
    await assertCurrencyExists(this.deps, input.currencyId, (message) =>
      new InvalidTransferInput(message),
    );

    return this.deps.transferRepository.insert({
      userId: input.userId,
      fromAccountId: input.fromAccountId,
      toAccountId: input.toAccountId,
      amount: numAmount.toFixed(4),
      currencyId: input.currencyId,
      description: input.description,
      date: input.date,
    });
  }
}
