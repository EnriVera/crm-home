/**
 * Errores de dominio del módulo /config → currencies.
 */

export class InvalidCurrencyInput extends Error {
  readonly code = "INVALID_CURRENCY_INPUT" as const;

  constructor(message: string) {
    super(message);
    this.name = "InvalidCurrencyInput";
  }
}
