import { useState, type OctaneNode } from "octane";
import { t } from "../../vendor/i18n/core";
import { Button } from "../../atoms/button.tsrx";
import { TextInput } from "../../atoms/text-input.tsrx";
import { StatusMessage } from "../../atoms/status-message.tsrx";
import { Drawer } from "../../atoms/drawer.tsrx";
import {
  applyExpenseFormAction,
  firstExpenseFormError,
  expenseFormToApiPayload,
  initialExpenseFormState,
  isExpenseFormReadyToSubmit,
  type ExpenseFormState,
} from "./expense-form.logic";

/**
 * Expense form organism (drawer right-side).
 *
 * Mismo patrón que `IncomeForm` + un campo extra `receiptUrl` (URL al
 * comprobante, opcional).
 */
export interface ExpenseFormProps {
  mode?: "create" | "edit";
  initial?: Partial<ExpenseFormState>;
  onSubmit: (payload: {
    expe_account_id: string;
    expe_amount: string;
    expe_currency_id: string;
    expe_description: string | null;
    expe_category: string | null;
    expe_date: string;
    expe_receipt_url: string | null;
  }) => Promise<void> | void;
  onClose: () => void;
  isSubmitting?: boolean;
}

export function ExpenseForm(props: ExpenseFormProps) @{
  const mode = props.mode ?? "create";
  const [state, setState] = useState<ExpenseFormState>(() =>
    initialExpenseFormState(props.initial),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isSubmitting = props.isSubmitting ?? false;
  const ready = isExpenseFormReadyToSubmit(state);

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    const firstError = firstExpenseFormError(state);
    if (firstError !== null) {
      setErrorMessage(firstError.message);
      return;
    }
    setErrorMessage(null);
    try {
      await props.onSubmit(expenseFormToApiPayload(state));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Submit failed");
    }
  };

  <Drawer
    open
    onClose={props.onClose}
    title={mode === "create" ? t("expenses.create.title") : t("expenses.edit.title")}
  >
    <form onSubmit={handleSubmit} class="flex flex-col gap-5">
      <div class="flex flex-col gap-1.5">
        <label for="expense-account" class="text-xs font-medium text-text-secondary">
          {t("expenses.fields.account")}
        </label>
        <TextInput
          id="expense-account"
          value={state.accountId}
          onInput={(event) => {
            const next = event.currentTarget.value;
            setState((prev) => applyExpenseFormAction(prev, { type: "set_account_id", value: next }));
          }}
          placeholder="00000000-0000-0000-0000-000000000000"
          autoComplete="off"
          disabled={isSubmitting}
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="expense-currency" class="text-xs font-medium text-text-secondary">
          {t("expenses.fields.currency")}
        </label>
        <TextInput
          id="expense-currency"
          value={state.currencyId}
          onInput={(event) => {
            const next = event.currentTarget.value;
            setState((prev) => applyExpenseFormAction(prev, { type: "set_currency_id", value: next }));
          }}
          placeholder="00000000-0000-0000-0000-000000000000"
          autoComplete="off"
          disabled={isSubmitting}
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="expense-amount" class="text-xs font-medium text-text-secondary">
          {t("expenses.fields.amount")} *
        </label>
        <TextInput
          id="expense-amount"
          type="text"
          inputMode="decimal"
          value={state.amount}
          onInput={(event) => {
            const next = event.currentTarget.value;
            setState((prev) => applyExpenseFormAction(prev, { type: "set_amount", value: next }));
          }}
          placeholder="500.00"
          autoComplete="off"
          disabled={isSubmitting}
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="expense-date" class="text-xs font-medium text-text-secondary">
          {t("expenses.fields.date")} *
        </label>
        <input
          id="expense-date"
          type="date"
          value={state.date}
          onInput={(event: Event) => {
            const next = (event.currentTarget as HTMLInputElement).value;
            setState((prev) => applyExpenseFormAction(prev, { type: "set_date", value: next }));
          }}
          disabled={isSubmitting}
          class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="expense-description" class="text-xs font-medium text-text-secondary">
          {t("expenses.fields.description")}
        </label>
        <TextInput
          id="expense-description"
          value={state.description ?? ""}
          onInput={(event) => {
            const next = event.currentTarget.value;
            setState((prev) => applyExpenseFormAction(prev, { type: "set_description", value: next }));
          }}
          placeholder="Pago a proveedor Y"
          autoComplete="off"
          disabled={isSubmitting}
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="expense-category" class="text-xs font-medium text-text-secondary">
          {t("expenses.fields.category")}
        </label>
        <TextInput
          id="expense-category"
          value={state.category ?? ""}
          onInput={(event) => {
            const next = event.currentTarget.value;
            setState((prev) => applyExpenseFormAction(prev, { type: "set_category", value: next }));
          }}
          placeholder="Servicios"
          autoComplete="off"
          disabled={isSubmitting}
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="expense-receipt-url" class="text-xs font-medium text-text-secondary">
          {t("expenses.fields.receiptUrl")}
        </label>
        <TextInput
          id="expense-receipt-url"
          type="url"
          value={state.receiptUrl ?? ""}
          onInput={(event) => {
            const next = event.currentTarget.value;
            setState((prev) => applyExpenseFormAction(prev, { type: "set_receipt_url", value: next }));
          }}
          placeholder="https://example.com/receipt.pdf"
          autoComplete="off"
          disabled={isSubmitting}
        />
      </div>

      {errorMessage !== null ? (
        <StatusMessage variant="error">{errorMessage}</StatusMessage>
      ) : null}

      <div class="flex items-center justify-end gap-2 pt-2">
        <Button variant="ghost" type="button" onClick={props.onClose} disabled={isSubmitting}>
          {t("expenses.form.cancel")}
        </Button>
        <Button variant="primary" type="submit" disabled={ready === false || isSubmitting}>
          {mode === "create" ? t("expenses.create.submit") : t("expenses.edit.submit")}
        </Button>
      </div>
    </form>
  </Drawer>
}
