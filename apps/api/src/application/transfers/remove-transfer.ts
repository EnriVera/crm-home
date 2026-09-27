import type { TransferRepository } from "../../domain/ports/transfer-repository";
import type { TransferRow } from "../../domain/tasks/types";
import { TransferNotFound } from "./errors";

export interface RemoveTransferInput {
  userId: string;
  transferId: string;
}

export interface RemoveTransferDependencies {
  transferRepository: TransferRepository;
}

export class RemoveTransfer {
  constructor(private readonly deps: RemoveTransferDependencies) {}

  async execute(input: RemoveTransferInput): Promise<TransferRow> {
    try {
      return await this.deps.transferRepository.softDelete(input);
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
