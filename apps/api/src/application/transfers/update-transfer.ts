import type { TransferRepository } from "../../domain/ports/transfer-repository";
import type { AccountRepository } from "../../domain/ports/account-repository";
import type { CurrencyRepository } from "../../domain/ports/currency-repository";
import type { TransferRow } from "../../domain/types";
import {
  assertCurrencyExists,
  assertOwnedAccount,
} from "../shared/finance-validation";
import { InvalidTransferInput, TransferNotFound } from "./errors";

export interface UpdateTransferInput {
  userId: string;
  transferId: string;
  fromAccountId?: string;
  toAccountId?: string;
  amount?: string;
  currencyId?: string;
  description?: string | null;
  date?: string;
}

export interface UpdateTransferDependencies {
  transferRepository: TransferRepository;
  accountRepository: AccountRepository;
  currencyRepository: CurrencyRepository;
}

export class UpdateTransfer {
  constructor(private readonly deps: UpdateTransferDependencies) {}

  async execute(input: UpdateTransferInput): Promise<TransferRow> {
    if (input.amount !== undefined) {
      const trimmed = input.amount.trim();
      const numAmount = Number(trimmed);
      if (!Number.isFinite(numAmount) || numAmount <= 0) {
        throw new InvalidTransferInput("amount must be a positive number");
      }
      input = { ...input, amount: numAmount.toFixed(4) };
    }
    if (
      input.description !== undefined &&
      input.description !== null &&
      input.description.length > 500
    ) {
      throw new InvalidTransferInput("description exceeds 500 chars");
    }

    for (const accountId of [input.fromAccountId, input.toAccountId]) {
      if (accountId === undefined) continue;
      await assertOwnedAccount(
        this.deps,
        { userId: input.userId, accountId },
        (message) => new InvalidTransferInput(message),
      );
    }
    if (input.currencyId !== undefined) {
      await assertCurrencyExists(this.deps, input.currencyId, (message) =>
        new InvalidTransferInput(message),
      );
    }

    try {
      return await this.deps.transferRepository.update(input);
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes("no result") || err.message.includes("not found"))
      ) {
        throw new TransferNotFound();
      }
      throw err;
    }
  }
}
