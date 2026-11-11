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
 * El movimiento se registró en una moneda que no es la de su cuenta: el
 * balance de la cuenta sumaría dos monedas y quedaría reportado en la
 * moneda de la cuenta.
 */
const CURRENCY_MISMATCH =
  "the movement currency must match the account currency";

/**
 * Una transferencia mueve plata entre dos cuentas: si está en una moneda
 * que no es la de sus cuentas, el balance de cada una sumaría dos
 * monedas.
 */
const TRANSFER_CURRENCY_MISMATCH =
  "the transfer currency must match the currency of both accounts";

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

/**
 * Valida que la moneda del movimiento sea la de su cuenta.
 *
 * El balance de una cuenta se calcula sumando sus movimientos: un
 * movimiento en otra moneda lo dejaría en una suma sin sentido, reportada
 * en la moneda de la cuenta.
 */
function assertCurrencyMatchesAccount(
  account: AccountRow,
  currencyId: string,
  invalid: (message: string) => Error,
): void {
  if (account.currencyId !== currencyId) {
    throw invalid(CURRENCY_MISMATCH);
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
  assertCurrencyMatchesAccount(account, input.currencyId, invalid);
  return account;
}

/**
 * Valida cuenta y moneda de una transferencia: las DOS cuentas tienen que
 * ser del usuario y estar en la moneda de la transferencia.
 */
export async function validateTransferAccountAndCurrency(
  deps: FinanceValidationDependencies,
  input: {
    userId: string;
    fromAccountId: string;
    toAccountId: string;
    currencyId: string;
  },
  invalid: (message: string) => Error,
): Promise<void> {
  const from = await assertOwnedAccount(
    deps,
    { userId: input.userId, accountId: input.fromAccountId },
    invalid,
  );
  const to = await assertOwnedAccount(
    deps,
    { userId: input.userId, accountId: input.toAccountId },
    invalid,
  );
  await assertCurrencyExists(deps, input.currencyId, invalid);
  if (
    from.currencyId !== input.currencyId ||
    to.currencyId !== input.currencyId
  ) {
    throw invalid(TRANSFER_CURRENCY_MISMATCH);
  }
}

/**
 * La cuenta y la moneda que quedan después de actualizar un movimiento.
 *
 * Lo que el update no toca queda como estaba: un movimiento que cambia
 * de cuenta conserva su moneda, y al revés.
 */
export interface MovementCurrencyChange {
  userId: string;
  /** La cuenta del movimiento antes del update. */
  currentAccountId: string;
  /** La moneda del movimiento antes del update. */
  currentCurrencyId: string;
  /** La cuenta nueva, si el update la cambia. */
  accountId?: string;
  /** La moneda nueva, si el update la cambia. */
  currencyId?: string;
}

/**
 * Valida la moneda de un movimiento que se está actualizando.
 *
 * Un update que no toca la cuenta ni la moneda no se valida: las filas
 * viejas que ya venían con otra moneda no se bloquean, sólo no se
 * amplifica el problema.
 */
export async function validateMovementCurrencyChange(
  deps: FinanceValidationDependencies,
  change: MovementCurrencyChange,
  invalid: (message: string) => Error,
): Promise<void> {
  if (change.accountId === undefined && change.currencyId === undefined) {
    return;
  }
  await validateAccountAndCurrency(
    deps,
    {
      userId: change.userId,
      accountId: change.accountId ?? change.currentAccountId,
      currencyId: change.currencyId ?? change.currentCurrencyId,
    },
    invalid,
  );
}

/**
 * Las dos cuentas y la moneda que quedan después de actualizar una
 * transferencia.
 */
export interface TransferCurrencyChange {
  userId: string;
  currentFromAccountId: string;
  currentToAccountId: string;
  currentCurrencyId: string;
  fromAccountId?: string;
  toAccountId?: string;
  currencyId?: string;
}

/**
 * Valida la moneda de una transferencia que se está actualizando.
 */
export async function validateTransferCurrencyChange(
  deps: FinanceValidationDependencies,
  change: TransferCurrencyChange,
  invalid: (message: string) => Error,
): Promise<void> {
  if (
    change.fromAccountId === undefined &&
    change.toAccountId === undefined &&
    change.currencyId === undefined
  ) {
    return;
  }
  await validateTransferAccountAndCurrency(
    deps,
    {
      userId: change.userId,
      fromAccountId: change.fromAccountId ?? change.currentFromAccountId,
      toAccountId: change.toAccountId ?? change.currentToAccountId,
      currencyId: change.currencyId ?? change.currentCurrencyId,
    },
    invalid,
  );
}
