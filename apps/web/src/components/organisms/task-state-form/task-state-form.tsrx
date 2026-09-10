import { t } from "../../../vendor/i18n/core";
import {
  buildStateSubmitParams,
  initialTaskStateFormState,
  taskStateNameError,
  taskStateOrderError,
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
  initial?: Partial<import("./task-state-form.logic").TaskStateFormInput>;
  onSubmit: (
    params: ReturnType<typeof buildStateSubmitParams>,
  ) => void | Promise<void>;
  onCancel: () => void;
}

export function TaskStateForm(props: TaskStateFormProps) @{
  // Stubs — la implementación real conecta useState del wrapper octane.
  const state: TaskStateFormState = initialTaskStateFormState(props.initial);

  void state;
  void buildStateSubmitParams;
  void taskStateNameError;
  void taskStateOrderError;

  <form data-component="task-state-form" data-mode={props.mode}>
    <label>
      <span>{t("tasks.statuses.nameLabel")}</span>
      <input
        type="text"
        name="tast_name"
        maxLength={50}
        required
        minLength={1}
      />
    </label>

    <label>
      <span>{t("tasks.statuses.orderLabel")}</span>
      <input type="number" name="tast_order" min="0" step="1" required />
    </label>

    {/* No color picker — PRD §D6 Fase 2 */}

    <div data-slot="actions">
      <button
        type="submit"
        data-action="submit"
      >
        {props.mode === "create"
          ? t("tasks.statuses.add")
          : t("tasks.statuses.edit")}
      </button>
      <button type="button" data-action="cancel" onClick={() => props.onCancel()}>
        {t("tasks.form.cancel")}
      </button>
    </div>
  </form>
}
