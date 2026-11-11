import type { TransferRepository } from "../../domain/ports/transfer-repository";
import type { AccountRepository } from "../../domain/ports/account-repository";
import type { CurrencyRepository } from "../../domain/ports/currency-repository";
import type { TransferRow } from "../../domain/types";
import { validateTransferCurrencyChange } from "../shared/finance-validation";
import { normalizeAmount } from "../shared/money";
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
      input = { ...input, amount: normalizeAmount(input.amount.trim()) };
    }
    if (
      input.description !== undefined &&
      input.description !== null &&
      input.description.length > 500
    ) {
      throw new InvalidTransferInput("description exceeds 500 chars");
    }

    // La transferencia tiene que quedar en la moneda de SUS DOS cuentas:
    // el balance de cada una suma sus movimientos, así que una
    // transferencia en otra moneda lo dejaría en una suma sin sentido.
    if (
      input.fromAccountId !== undefined ||
      input.toAccountId !== undefined ||
      input.currencyId !== undefined
    ) {
      const current = await this.deps.transferRepository.findById({
        userId: input.userId,
        transferId: input.transferId,
      });
      if (!current) {
        throw new TransferNotFound();
      }
      await validateTransferCurrencyChange(
        this.deps,
        {
          userId: input.userId,
          currentFromAccountId: current.fromAccountId,
          currentToAccountId: current.toAccountId,
          currentCurrencyId: current.currencyId,
          fromAccountId: input.fromAccountId,
          toAccountId: input.toAccountId,
          currencyId: input.currencyId,
        },
        (message) => new InvalidTransferInput(message),
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
