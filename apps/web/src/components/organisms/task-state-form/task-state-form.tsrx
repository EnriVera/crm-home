import { useState } from "octane";
import { t } from "../../vendor/i18n/core";
import { Button } from "../../atoms/button.tsrx";
import { TextInput } from "../../atoms/text-input.tsrx";
import { StatusMessage } from "../../atoms/status-message.tsrx";
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
 *
 * Estilo: usa el mismo lenguaje visual del task-form (impeccable Operate):
 * surface + border 1px + rounded-md, labels pequeñas, gap-5 entre campos,
 * StatusMessage para errores, una sola acción primaria por drawer.
 *
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

const FIELD_CLASS =
  "block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

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
    class="flex flex-col gap-5"
  >
    <label class="flex flex-col gap-1.5">
      <span class="text-xs font-medium text-text-secondary">
        {t("tasks.statuses.nameLabel")}
      </span>
      <TextInput
        id="task-state-form-name"
        name="tast_name"
        value={state.tast_name}
        placeholder={t("tasks.statuses.namePlaceholder")}
        required
        invalid={Boolean(nameError)}
        onInput={(value) =>
          setState((prev) => ({ ...prev, tast_name: value }))
        }
      />
    </label>

    <label class="flex flex-col gap-1.5">
      <span class="text-xs font-medium text-text-secondary">
        {t("tasks.statuses.orderLabel")}
      </span>
      <input
        type="number"
        name="tast_order"
        min={0}
        step={1}
        required
        value={state.tast_order}
        onInput={(e: Event) => {
          const target = e.currentTarget as HTMLInputElement;
          const next = Number.parseInt(target.value, 10);
          setState((prev) => ({
            ...prev,
            tast_order: Number.isNaN(next) ? 0 : next,
          }));
        }}
        class={`${FIELD_CLASS} ${orderError ? "border-error" : ""}`}
      />
    </label>

    {validationError && (
      <StatusMessage variant="error" id="task-state-form-validation">
        {t(validationError)}
      </StatusMessage>
    )}
    {submitError && (
      <StatusMessage variant="error" id="task-state-form-submit">
        {submitError}
      </StatusMessage>
    )}

    <div
      data-slot="form-actions"
      class="flex items-center justify-end gap-2 pt-2"
    >
      <Button variant="ghost" onClick={() => props.onCancel()}>
        {t("tasks.form.cancel")}
      </Button>
      <Button
        variant="primary"
        type="submit"
        disabled={Boolean(validationError) || submitting}
      >
        {submitting
          ? t("tasks.form.submitting")
          : props.mode === "create"
          ? t("tasks.statuses.add")
          : t("tasks.statuses.edit")}
      </Button>
    </div>
  </form>
}
