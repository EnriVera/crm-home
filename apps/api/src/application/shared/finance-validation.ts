import type {
  AccountRepository,
  AccountRow,
} from "../../domain/ports/account-repository";
import type { CurrencyRepository } from "../../domain/ports/currency-repository";

export interface FinanceValidationDependencies {
  accountRepository: AccountRepository;
  currencyRepository: CurrencyRepository;
}

/**
 * Valida que la cuenta sea DEL USUARIO.
 *
 * La FK de la base sólo garantiza que la cuenta exista: sin esta
 * validación un ingreso podía colarse en la cuenta de otro usuario (y
 * alterar su balance, que la API calcula sobre sus movimientos).
 *
 * El error lo arma el caller: cada módulo tiene su propio error de
 * dominio (`InvalidIncomeInput`, `InvalidExpenseInput`…).
 */
export async function assertOwnedAccount(
  deps: FinanceValidationDependencies,
  input: { userId: string; accountId: string },
  invalid: (message: string) => Error,
): Promise<AccountRow> {
  const account = await deps.accountRepository.findById({
    userId: input.userId,
    accountId: input.accountId,
  });
  if (!account) {
    throw invalid("account does not belong to the user");
  }
  return account;
}

/**
 * Valida que la moneda exista: su FK también da un 23503 (500) si no.
 */
export async function assertCurrencyExists(
  deps: FinanceValidationDependencies,
  currencyId: string,
  invalid: (message: string) => Error,
): Promise<void> {
  const currency = await deps.currencyRepository.findById(currencyId);
  if (!currency) {
    throw invalid("currency does not exist");
  }
}

/** Valida cuenta y moneda de un movimiento (alta). */
export async function validateAccountAndCurrency(
  deps: FinanceValidationDependencies,
  input: { userId: string; accountId: string; currencyId: string },
  invalid: (message: string) => Error,
): Promise<AccountRow> {
  const account = await assertOwnedAccount(
    deps,
    { userId: input.userId, accountId: input.accountId },
    invalid,
  );
  await assertCurrencyExists(deps, input.currencyId, invalid);
  return account;
}
