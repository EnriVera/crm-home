import type { CurrencyRepository } from "../../domain/ports/currency-repository";

export interface ListCurrenciesDependencies {
 currencyRepository: CurrencyRepository;
}

/**
 * Caso de uso: listar todas las monedas (seed global).
 *
 * Sin paginación (seed chico). El handler exige sesión vía `requireSession`
 * aunque el dato no sea per-user — `/config` es página autenticada.
 */
export class ListCurrencies {
 constructor(private readonly deps: ListCurrenciesDependencies) {}

 async execute(): Promise<
  Array<{ id: string; name: string; symbol: string; decimals: number }>
 > {
  return this.deps.currencyRepository.list();
 }
}
