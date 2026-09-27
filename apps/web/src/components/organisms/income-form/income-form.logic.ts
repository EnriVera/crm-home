/**
 * Reducer puro + factories para el form de income (entrada de plata).
 *
 * Mismo patrón que `client-form.logic.ts`: estado con reducer + helpers de
 * validación. El componente `.tsrx` orquesta UI + invoca este reducer.
 *
 * Estado:
 * - accountId: string (uuid, required)
 * - amount: string (decimal, required, > 0)
 * - currencyId: string (uuid, required)
 * - date: string YYYY-MM-DD (required)
 * - description: string | null (optional, max 500)
 * - category: string | null (optional, max 100)
 */

export interface IncomeFormState {
  accountId: string;
  amount: string;
  currencyId: string;
  date: string;
  description: string | null;
  category: string | null;
}

export type IncomeFormAction =
  | { type: "set_account_id"; value: string }
  | { type: "set_amount"; value: string }
  | { type: "set_currency_id"; value: string }
  | { type: "set_date"; value: string }
  | { type: "set_description"; value: string }
  | { type: "clear_description" }
  | { type: "set_category"; value: string }
  | { type: "clear_category" }
  | { type: "reset"; initial: IncomeFormState };

export function initialIncomeFormState(
  initial: Partial<IncomeFormState> = {},
): IncomeFormState {
  return {
    accountId: initial.accountId ?? "",
    amount: initial.amount ?? "",
    currencyId: initial.currencyId ?? "",
    date: initial.date ?? new Date().toISOString().slice(0, 10),
    description: initial.description ?? null,
    category: initial.category ?? null,
  };
}

export function applyIncomeFormAction(
  state: IncomeFormState,
  action: IncomeFormAction,
): IncomeFormState {
  switch (action.type) {
    case "set_account_id":
      return { ...state, accountId: action.value };
    case "set_amount":
      return { ...state, amount: action.value };
    case "set_currency_id":
      return { ...state, currencyId: action.value };
    case "set_date":
      return { ...state, date: action.value };
    case "set_description":
      return {
        ...state,
        description: action.value.trim().length === 0 ? null : action.value.trim(),
      };
    case "clear_description":
      return { ...state, description: null };
    case "set_category":
      return {
        ...state,
        category: action.value.trim().length === 0 ? null : action.value.trim(),
      };
    case "clear_category":
      return { ...state, category: null };
    case "reset":
      return action.initial;
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AMOUNT_RE = /^\d+(\.\d{1,4})?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type IncomeValidationCode =
  | "INCOME_ACCOUNT_REQUIRED"
  | "INCOME_CURRENCY_REQUIRED"
  | "INCOME_AMOUNT_INVALID"
  | "INCOME_AMOUNT_NON_POSITIVE"
  | "INCOME_DATE_INVALID"
  | "INCOME_DESCRIPTION_TOO_LONG"
  | "INCOME_CATEGORY_TOO_LONG";

export interface IncomeValidationError {
  code: IncomeValidationCode;
  field: keyof IncomeFormState;
  message: string;
}

export function validateIncomeForm(
  state: IncomeFormState,
): IncomeValidationError[] {
  const errors: IncomeValidationError[] = [];
  if (state.accountId.length === 0 || !UUID_RE.test(state.accountId)) {
    errors.push({
      code: "INCOME_ACCOUNT_REQUIRED",
      field: "accountId",
      message: "account is required",
    });
  }
  if (state.currencyId.length === 0 || !UUID_RE.test(state.currencyId)) {
    errors.push({
      code: "INCOME_CURRENCY_REQUIRED",
      field: "currencyId",
      message: "currency is required",
    });
  }
  if (!AMOUNT_RE.test(state.amount)) {
    errors.push({
      code: "INCOME_AMOUNT_INVALID",
      field: "amount",
      message: "amount must be a decimal number (e.g. 1000.00)",
    });
  } else if (Number(state.amount) <= 0) {
    errors.push({
      code: "INCOME_AMOUNT_NON_POSITIVE",
      field: "amount",
      message: "amount must be > 0",
    });
  }
  if (!DATE_RE.test(state.date)) {
    errors.push({
      code: "INCOME_DATE_INVALID",
      field: "date",
      message: "date must be YYYY-MM-DD",
    });
  }
  if (state.description !== null && state.description.length > 500) {
    errors.push({
      code: "INCOME_DESCRIPTION_TOO_LONG",
      field: "description",
      message: "description exceeds 500 chars",
    });
  }
  if (state.category !== null && state.category.length > 100) {
    errors.push({
      code: "INCOME_CATEGORY_TOO_LONG",
      field: "category",
      message: "category exceeds 100 chars",
    });
  }
  return errors;
}

export function firstIncomeFormError(
  state: IncomeFormState,
): IncomeValidationError | null {
  return validateIncomeForm(state)[0] ?? null;
}

export function isIncomeFormReadyToSubmit(state: IncomeFormState): boolean {
  return validateIncomeForm(state).length === 0;
}

/** Convierte el form state al payload del API (snake_case). */
export function incomeFormToApiPayload(state: IncomeFormState): {
  inco_account_id: string;
  inco_amount: string;
  inco_currency_id: string;
  inco_description: string | null;
  inco_category: string | null;
  inco_date: string;
} {
  // Normalizar amount a 4 decimales (estilo NUMERIC(19,4))
  const amountNum = Number(state.amount);
  const normalizedAmount = amountNum.toFixed(4);
  return {
    inco_account_id: state.accountId,
    inco_amount: normalizedAmount,
    inco_currency_id: state.currencyId,
    inco_description: state.description,
    inco_category: state.category,
    inco_date: state.date,
  };
}
