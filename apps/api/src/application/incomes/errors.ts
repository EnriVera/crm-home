/**
 * Base común para errores del módulo incomes. El handler HTTP mapea
 * `code` → status HTTP; nunca se filtra la instancia al cliente — solo el
 * `code` y un mensaje genérico.
 */
export abstract class IncomeDomainError extends Error {
  abstract readonly code: string;
}

export class IncomeNotFound extends IncomeDomainError {
  readonly code = "INCOME_NOT_FOUND";

  constructor(message = "Income not found") {
    super(message);
    this.name = "IncomeNotFound";
  }
}

export class InvalidIncomeInput extends IncomeDomainError {
  readonly code = "INVALID_INCOME_INPUT";

  constructor(message = "Invalid income input") {
    super(message);
    this.name = "InvalidIncomeInput";
  }
}
