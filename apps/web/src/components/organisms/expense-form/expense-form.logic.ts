/**
 * Reducer puro + factories para el form de expense. Mismo patrón que
 * `income-form.logic.ts` + campo extra `receiptUrl` (URL opcional al comprobante).
 */

export interface ExpenseFormState {
  accountId: string;
  amount: string;
  currencyId: string;
  date: string;
  description: string | null;
  category: string | null;
  receiptUrl: string | null;
}

export type ExpenseFormAction =
  | { type: "set_account_id"; value: string }
  | { type: "set_amount"; value: string }
  | { type: "set_currency_id"; value: string }
  | { type: "set_date"; value: string }
  | { type: "set_description"; value: string }
  | { type: "clear_description" }
  | { type: "set_category"; value: string }
  | { type: "clear_category" }
  | { type: "set_receipt_url"; value: string }
  | { type: "clear_receipt_url" }
  | { type: "reset"; initial: ExpenseFormState };

export function initialExpenseFormState(
  initial: Partial<ExpenseFormState> = {},
): ExpenseFormState {
  return {
    accountId: initial.accountId ?? "",
    amount: initial.amount ?? "",
    currencyId: initial.currencyId ?? "",
    date: initial.date ?? new Date().toISOString().slice(0, 10),
    description: initial.description ?? null,
    category: initial.category ?? null,
    receiptUrl: initial.receiptUrl ?? null,
  };
}

export function applyExpenseFormAction(
  state: ExpenseFormState,
  action: ExpenseFormAction,
): ExpenseFormState {
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
    case "set_receipt_url":
      return {
        ...state,
        receiptUrl: action.value.trim().length === 0 ? null : action.value.trim(),
      };
    case "clear_receipt_url":
      return { ...state, receiptUrl: null };
    case "reset":
      return action.initial;
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AMOUNT_RE = /^\d+(\.\d{1,4})?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const URL_RE = /^https?:\/\/.+/;

export type ExpenseValidationCode =
  | "EXPENSE_ACCOUNT_REQUIRED"
  | "EXPENSE_CURRENCY_REQUIRED"
  | "EXPENSE_AMOUNT_INVALID"
  | "EXPENSE_AMOUNT_NON_POSITIVE"
  | "EXPENSE_DATE_INVALID"
  | "EXPENSE_DESCRIPTION_TOO_LONG"
  | "EXPENSE_CATEGORY_TOO_LONG"
  | "EXPENSE_RECEIPT_URL_INVALID";

export interface ExpenseValidationError {
  code: ExpenseValidationCode;
  field: keyof ExpenseFormState;
  message: string;
}

export function validateExpenseForm(state: ExpenseFormState): ExpenseValidationError[] {
  const errors: ExpenseValidationError[] = [];
  if (state.accountId.length === 0 || !UUID_RE.test(state.accountId)) {
    errors.push({
      code: "EXPENSE_ACCOUNT_REQUIRED",
      field: "accountId",
      message: "account is required",
    });
  }
  if (state.currencyId.length === 0 || !UUID_RE.test(state.currencyId)) {
    errors.push({
      code: "EXPENSE_CURRENCY_REQUIRED",
      field: "currencyId",
      message: "currency is required",
    });
  }
  if (!AMOUNT_RE.test(state.amount)) {
    errors.push({
      code: "EXPENSE_AMOUNT_INVALID",
      field: "amount",
      message: "amount must be a decimal number (e.g. 1000.00)",
    });
  } else if (Number(state.amount) <= 0) {
    errors.push({
      code: "EXPENSE_AMOUNT_NON_POSITIVE",
      field: "amount",
      message: "amount must be > 0",
    });
  }
  if (!DATE_RE.test(state.date)) {
    errors.push({
      code: "EXPENSE_DATE_INVALID",
      field: "date",
      message: "date must be YYYY-MM-DD",
    });
  }
  if (state.description !== null && state.description.length > 500) {
    errors.push({
      code: "EXPENSE_DESCRIPTION_TOO_LONG",
      field: "description",
      message: "description exceeds 500 chars",
    });
  }
  if (state.category !== null && state.category.length > 100) {
    errors.push({
      code: "EXPENSE_CATEGORY_TOO_LONG",
      field: "category",
      message: "category exceeds 100 chars",
    });
  }
  if (state.receiptUrl !== null && !URL_RE.test(state.receiptUrl)) {
    errors.push({
      code: "EXPENSE_RECEIPT_URL_INVALID",
      field: "receiptUrl",
      message: "receipt_url must be a valid http(s) URL",
    });
  }
  return errors;
}

export function firstExpenseFormError(state: ExpenseFormState): ExpenseValidationError | null {
  return validateExpenseForm(state)[0] ?? null;
}

export function isExpenseFormReadyToSubmit(state: ExpenseFormState): boolean {
  return validateExpenseForm(state).length === 0;
}

export function expenseFormToApiPayload(state: ExpenseFormState): {
  expe_account_id: string;
  expe_amount: string;
  expe_currency_id: string;
  expe_description: string | null;
  expe_category: string | null;
  expe_date: string;
  expe_receipt_url: string | null;
} {
  const amountNum = Number(state.amount);
  return {
    expe_account_id: state.accountId,
    expe_amount: amountNum.toFixed(4),
    expe_currency_id: state.currencyId,
    expe_description: state.description,
    expe_category: state.category,
    expe_date: state.date,
    expe_receipt_url: state.receiptUrl,
  };
}
