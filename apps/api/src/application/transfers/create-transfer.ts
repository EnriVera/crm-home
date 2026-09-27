import type {
  TransferRepository,
} from "../../domain/ports/transfer-repository";
import type { TransferRow } from "../../domain/tasks/types";
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
