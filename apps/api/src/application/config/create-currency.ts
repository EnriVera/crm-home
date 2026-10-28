import type {
  Currency,
  CurrencyRepository,
} from "../../domain/ports/currency-repository";
import { InvalidCurrencyInput } from "./errors";

export interface CreateCurrencyInput {
  name: string;
  symbol: string;
  decimals: number;
}

export interface CreateCurrencyDependencies {
  currencyRepository: CurrencyRepository;
}

/**
 * Caso de uso: crear una moneda nueva en la tabla global.
 *
 * `currency` es seed global: no tiene `user_id`, lo que un usuario crea
 * lo ven todos (decisión del pedido de creación desde `/config`).
 *
 * Validaciones (defensa en profundidad, el contract Zod ya valida):
 * - `name` 1-255 chars tras trim.
 * - `symbol` 1-4 chars tras trim (ej. "$", "US$", "€").
 * - `decimals` entero 0-6.
 */
export class CreateCurrency {
  constructor(private readonly deps: CreateCurrencyDependencies) {}

  execute(input: CreateCurrencyInput): Promise<Currency> {
    const name = input.name.trim();
    const symbol = input.symbol.trim();

    if (name.length === 0 || name.length > 255) {
      throw new InvalidCurrencyInput("currency name must be 1-255 chars");
    }
    if (symbol.length === 0 || symbol.length > 4) {
      throw new InvalidCurrencyInput("currency symbol must be 1-4 chars");
    }
    if (
      !Number.isInteger(input.decimals) ||
      input.decimals < 0 ||
      input.decimals > 6
    ) {
      throw new InvalidCurrencyInput("currency decimals must be an int 0-6");
    }

    return this.deps.currencyRepository.insert({ name, symbol, decimals: input.decimals });
  }
}
