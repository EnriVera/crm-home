/**
 * Base común para errores del módulo transfers.
 */
export abstract class TransferDomainError extends Error {
  abstract readonly code: string;
}

export class TransferNotFound extends TransferDomainError {
  readonly code = "TRANSFER_NOT_FOUND";
  constructor(message = "Transfer not found") {
    super(message);
    this.name = "TransferNotFound";
  }
}

export class InvalidTransferInput extends TransferDomainError {
  readonly code = "INVALID_TRANSFER_INPUT";
  constructor(message = "Invalid transfer input") {
    super(message);
    this.name = "InvalidTransferInput";
  }
}
