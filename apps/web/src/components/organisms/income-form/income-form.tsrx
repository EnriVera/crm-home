import { useState } from "octane";
import { t } from "../../vendor/i18n/core";
import { Button } from "../../atoms/button.tsrx";
import { TextInput } from "../../atoms/text-input.tsrx";
import { StatusMessage } from "../../atoms/status-message.tsrx";
import { Drawer } from "../../atoms/drawer.tsrx";
import {
  applyIncomeFormAction,
  firstIncomeFormError,
  incomeFormToApiPayload,
  initialIncomeFormState,
  isIncomeFormReadyToSubmit,
  type IncomeFormState,
} from "./income-form.logic";

/**
 * Income form organism (drawer right-side).
 *
 * MVP: accountId y currencyId son TEXT inputs (UUIDs) porque no tenemos un
 * endpoint público para listar accounts/currencies del user todavía. Cuando
 * esos endpoints existan, reemplazar por `<select>` populated.
 *
 * Campos (todos i18n):
 * - Account ID (required, UUID)
 * - Currency ID (required, UUID)
 * - Amount (required, decimal > 0)
 * - Date (required, YYYY-MM-DD; default = hoy)
 * - Description (opcional, max 500)
 * - Category (opcional, max 100)
 */
export interface IncomeFormProps {
  mode?: "create" | "edit";
  initial?: Partial<IncomeFormState>;
  onSubmit: (payload: {
    inco_account_id: string;
    inco_amount: string;
    inco_currency_id: string;
    inco_description: string | null;
    inco_category: string | null;
    inco_date: string;
  }) => Promise<void> | void;
  onClose: () => void;
  isSubmitting?: boolean;
}

export function IncomeForm(props: IncomeFormProps) @{
  const mode = props.mode ?? "create";
  const [state, setState] = useState<IncomeFormState>(() =>
    initialIncomeFormState(props.initial),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isSubmitting = props.isSubmitting ?? false;
  const ready = isIncomeFormReadyToSubmit(state);

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    const firstError = firstIncomeFormError(state);
    if (firstError !== null) {
      setErrorMessage(firstError.message);
      return;
    }
    setErrorMessage(null);
    try {
      await props.onSubmit(incomeFormToApiPayload(state));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Submit failed");
    }
  };

  <Drawer
    open
    onClose={props.onClose}
    title={mode === "create" ? t("incomes.create.title") : t("incomes.edit.title")}
  >
    <form onSubmit={handleSubmit} class="flex flex-col gap-5">
      <div class="flex flex-col gap-1.5">
        <label for="income-account" class="text-xs font-medium text-text-secondary">
          {t("incomes.fields.account")}
        </label>
        <TextInput
          id="income-account"
          value={state.accountId}
          onInput={(event) => {
            const next = event.currentTarget.value;
            setState((prev) => applyIncomeFormAction(prev, { type: "set_account_id", value: next }));
          }}
          placeholder="00000000-0000-0000-0000-000000000000"
          autoComplete="off"
          disabled={isSubmitting}
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="income-currency" class="text-xs font-medium text-text-secondary">
          {t("incomes.fields.currency")}
        </label>
        <TextInput
          id="income-currency"
          value={state.currencyId}
          onInput={(event) => {
            const next = event.currentTarget.value;
            setState((prev) => applyIncomeFormAction(prev, { type: "set_currency_id", value: next }));
          }}
          placeholder="00000000-0000-0000-0000-000000000000"
          autoComplete="off"
          disabled={isSubmitting}
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="income-amount" class="text-xs font-medium text-text-secondary">
          {t("incomes.fields.amount")} *
        </label>
        <TextInput
          id="income-amount"
          type="text"
          inputMode="decimal"
          value={state.amount}
          onInput={(event) => {
            const next = event.currentTarget.value;
            setState((prev) => applyIncomeFormAction(prev, { type: "set_amount", value: next }));
          }}
          placeholder="1000.00"
          autoComplete="off"
          disabled={isSubmitting}
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="income-date" class="text-xs font-medium text-text-secondary">
          {t("incomes.fields.date")} *
        </label>
        <input
          id="income-date"
          type="date"
          value={state.date}
          onInput={(event: Event) => {
            const next = (event.currentTarget as HTMLInputElement).value;
            setState((prev) => applyIncomeFormAction(prev, { type: "set_date", value: next }));
          }}
          disabled={isSubmitting}
          class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="income-description" class="text-xs font-medium text-text-secondary">
          {t("incomes.fields.description")}
        </label>
        <TextInput
          id="income-description"
          value={state.description ?? ""}
          onInput={(event) => {
            const next = event.currentTarget.value;
            setState((prev) => applyIncomeFormAction(prev, { type: "set_description", value: next }));
          }}
          placeholder="Pago de cliente X"
          autoComplete="off"
          disabled={isSubmitting}
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="income-category" class="text-xs font-medium text-text-secondary">
          {t("incomes.fields.category")}
        </label>
        <TextInput
          id="income-category"
          value={state.category ?? ""}
          onInput={(event) => {
            const next = event.currentTarget.value;
            setState((prev) => applyIncomeFormAction(prev, { type: "set_category", value: next }));
          }}
          placeholder="Servicios"
          autoComplete="off"
          disabled={isSubmitting}
        />
      </div>

      {errorMessage !== null ? (
        <StatusMessage variant="error">{errorMessage}</StatusMessage>
      ) : null}

      <div class="flex items-center justify-end gap-2 pt-2">
        <Button variant="ghost" type="button" onClick={props.onClose} disabled={isSubmitting}>
          {t("incomes.form.cancel")}
        </Button>
        <Button variant="primary" type="submit" disabled={ready === false || isSubmitting}>
          {mode === "create" ? t("incomes.create.submit") : t("incomes.edit.submit")}
        </Button>
      </div>
    </form>
  </Drawer>
}
