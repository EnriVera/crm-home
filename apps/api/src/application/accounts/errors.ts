/**
 * Base común para errores del módulo accounts. El handler HTTP mapea
 * `code` → status HTTP (ver http/error-mapping.ts); nunca se filtra la
 * instancia al cliente — solo el `code` y un mensaje genérico.
 */
export abstract class AccountDomainError extends Error {
  abstract readonly code: string;
}

export class AccountNotFound extends AccountDomainError {
  readonly code = "ACCOUNT_NOT_FOUND";

  constructor(message = "Account not found") {
    super(message);
    this.name = "AccountNotFound";
  }
}

export class InvalidAccountInput extends AccountDomainError {
  readonly code = "INVALID_ACCOUNT_INPUT";

  constructor(message = "Invalid account input") {
    super(message);
    this.name = "InvalidAccountInput";
  }
}
