import { useState } from "octane";
import { t } from "../../../vendor/i18n/core";
import {
  buildStateSubmitParams,
  initialTaskStateFormState,
  taskStateNameError,
  taskStateOrderError,
  validateTaskStateForm,
  type TaskStateFormInput,
  type TaskStateFormMode,
  type TaskStateFormState,
} from "./task-state-form.logic";

/**
 * Task state form organism. Crea/edita estados con:
 *   - tast_name (1..50 chars, validated)
 *   - tast_order (int >= 0, validated)
 *
 * Sin color picker (PRD §D6 — color autogenerado/Fase 2 con @octanejs/colorful).
 * El componente .tsrx no se testea en bun:test (plugin Octane); la lógica
 * vive en task-state-form.logic.ts (testeable).
 */

export interface TaskStateFormProps {
  mode: TaskStateFormMode;
  existingStateId?: string;
  initial?: Partial<TaskStateFormInput>;
  onSubmit: (
    params: ReturnType<typeof buildStateSubmitParams>,
  ) => void | Promise<void>;
  onCancel: () => void;
}

export function TaskStateForm(props: TaskStateFormProps) @{
  const [state, setState] = useState<TaskStateFormState>(() =>
    initialTaskStateFormState(props.initial),
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const nameError = taskStateNameError(state.tast_name);
  const orderError = taskStateOrderError(state.tast_order);
  const validationError = validateTaskStateForm(state);

  const handleSubmit = async (event: Event): Promise<void> => {
    event.preventDefault();
    if (validationError || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const params = buildStateSubmitParams(
        props.mode,
        state,
        props.existingStateId ?? null,
      );
      await props.onSubmit(params);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Submit failed",
      );
      setSubmitting(false);
    }
  };

  <form
    data-component="task-state-form"
    data-mode={props.mode}
    onSubmit={(e: Event) => {
      void handleSubmit(e);
    }}
  >
    <label>
      <span>{t("tasks.statuses.nameLabel")}</span>
      <input
        type="text"
        name="tast_name"
        maxLength={50}
        required
        minLength={1}
        value={state.tast_name}
        disabled={submitting}
        onInput={(e: Event) => {
          const target = e.currentTarget as HTMLInputElement;
          setState((prev) => ({ ...prev, tast_name: target.value }));
        }}
        placeholder={t("tasks.statuses.namePlaceholder")}
      />
      {nameError && (
        <small data-slot="name-error">{t(nameError)}</small>
      )}
    </label>

    <label>
      <span>{t("tasks.statuses.orderLabel")}</span>
      <input
        type="number"
        name="tast_order"
        min="0"
        step="1"
        required
        value={String(state.tast_order)}
        disabled={submitting}
        onInput={(e: Event) => {
          const target = e.currentTarget as HTMLInputElement;
          const next = Number(target.value);
          setState((prev) => ({
            ...prev,
            tast_order: Number.isFinite(next) ? next : 0,
          }));
        }}
      />
      {orderError && (
        <small data-slot="order-error">{t(orderError)}</small>
      )}
    </label>

    {submitError && (
      <p data-slot="submit-error" role="alert">
        {submitError}
      </p>
    )}

    <div data-slot="actions">
      <button type="submit" data-action="submit" disabled={Boolean(validationError) || submitting}>
        {submitting
          ? t("tasks.form.submitting")
          : props.mode === "create"
          ? t("tasks.statuses.add")
          : t("tasks.statuses.edit")}
      </button>
      <button
        type="button"
        data-action="cancel"
        disabled={submitting}
        onClick={() => props.onCancel()}
      >
        {t("tasks.form.cancel")}
      </button>
    </div>
  </form>
}
