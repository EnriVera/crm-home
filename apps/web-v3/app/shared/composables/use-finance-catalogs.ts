import { ref } from "vue";
import { listCurrencies } from "~/infrastructure/config/orpc-config";
import {
  listAccounts,
  type AccountInput,
} from "~/infrastructure/finance/orpc-finance";
import { createAccount } from "~/infrastructure/finance/orpc-finance";
import type { Currency } from "~/domain/config/entities";
import type { Account } from "~/domain/finance/entities";

/**
 * useFinanceCatalogs: las cuentas y las monedas que comparten las tres
 * pantallas de finanzas (PRD-v4 §8.7).
 *
 * Las cuentas traen su balance calculado por la API (PRD-v2 §8.6), así que
 * acá no hay cuentas que sumar: sólo se leen.
 */
export function useFinanceCatalogs() {
  const accounts = ref<Account[]>([]);
  const currencies = ref<Currency[]>([]);
  const error = ref<string | null>(null);

  async function loadCatalogs() {
    error.value = null;
    try {
      [accounts.value, currencies.value] = await Promise.all([
        listAccounts(),
        listCurrencies(),
      ]);
    } catch {
      error.value = "finance.loadError";
    }
  }

  /** La cuenta (con su balance) o null si no existe. */
  function accountOf(accountId: string): Account | null {
    return accounts.value.find((account) => account.id === accountId) ?? null;
  }

  function accountName(accountId: string): string | null {
    return accountOf(accountId)?.name ?? null;
  }

  function accountIconOf(accountId: string): string | null {
    return accountOf(accountId)?.icon ?? null;
  }

  function accountColorOf(accountId: string): string | null {
    return accountOf(accountId)?.color ?? null;
  }

  /** El símbolo de una moneda (cada movimiento tiene la suya). */
  function symbolOf(currencyId: string): string {
    return currencies.value.find((currency) => currency.id === currencyId)
      ?.symbol ?? "";
  }

  /** Crea una cuenta y la deja en la lista (para que la use el drawer). */
  async function addAccount(input: AccountInput): Promise<Account> {
    const created = await createAccount(input);
    accounts.value = [...accounts.value, created];
    return created;
  }

  return {
    accounts,
    currencies,
    error,
    loadCatalogs,
    accountOf,
    accountName,
    accountIconOf,
    accountColorOf,
    symbolOf,
    addAccount,
  };
}
