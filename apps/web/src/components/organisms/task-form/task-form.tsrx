import { useState } from "octane";
import { t } from "../../vendor/i18n/core";
import {
  initialTaskFormState,
  applyTaskFormAction,
  isCategoryDisabled,
  ATTACHMENTS_DISABLED,
  firstValidationError,
  type TaskFormState,
  type TaskFormAction,
  type AvailableCategoriesLookup,
} from "./task-form.logic";

/**
 * Task form organism. Drawer/sheet con layout lateral derecho.
 *
 * Campos (todos i18n):
 * - Título (con validación `taskTitleRequired`)
 * - Descripción (textarea MVP — RichTextEditor del vendor wrapper llega en Fase 2)
 * - Estado (select poblado por el parent vía `availableStates`)
 * - Cliente / Tipo / Categoría (lookups RPC — Fase 2; por ahora selects vacíos)
 * - Adjuntos (siempre disabled, mensaje tasks.form.attachmentsDisabled)
 *
 * El componente `.tsrx` no se testea directamente (plugin Octane). La lógica
 * del reducer vive en `task-form.logic.ts` (testeable).
 *
 * Estado MVP:
 * - `state`: useState real con reducer `applyTaskFormAction`.
 * - `onSubmit(state)`: callback al parent, que decide si llama
 *   `RPC.tasks.create(...)` o `RPC.tasks.update(...)` según el modo.
 */

export interface TaskFormProps {
  mode: "create" | "update";
  initial?: Partial<TaskFormState>;
  availableStates: { tast_id: string; tast_name: string }[];
  availableTypes: { type_id: string; type_name: string }[];
  availableCategoriesFor: AvailableCategoriesLookup;
  onSubmit: (state: TaskFormState) => void | Promise<void>;
  onCancel: () => void;
}

export function TaskForm(props: TaskFormProps) @{
  const [state, setState] = useState<TaskFormState>(() =>
    initialTaskFormState(props.initial),
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const dispatch = (action: TaskFormAction): void => {
    setState((prev) => applyTaskFormAction(prev, action, props.availableCategoriesFor));
  };

  const validationError = firstValidationError(state);

  const handleSubmit = async (event: Event): Promise<void> => {
    event.preventDefault();
    if (validationError || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await props.onSubmit(state);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Submit failed",
      );
      setSubmitting(false);
    }
  };

  <form
    data-component="task-form"
    data-mode={props.mode}
    onSubmit={(e: Event) => {
      void handleSubmit(e);
    }}
  >
    <label>
      <span>{t("tasks.form.titleLabel")}</span>
      <input
        type="text"
        name="title"
        value={state.title}
        required
        maxLength={200}
        disabled={submitting}
        onInput={(e: Event) => {
          const target = e.currentTarget as HTMLInputElement;
          dispatch({ type: "set-title", value: target.value });
        }}
        placeholder={t("tasks.form.titlePlaceholder")}
      />
    </label>

    <label>
      <span>{t("tasks.form.descriptionLabel")}</span>
      <textarea
        name="description"
        value={state.description ?? ""}
        maxLength={50_000}
        disabled={submitting}
        onInput={(e: Event) => {
          const target = e.currentTarget as HTMLTextAreaElement;
          dispatch({
            type: "set-description",
            value: target.value || null,
          });
        }}
        placeholder={t("tasks.form.descriptionPlaceholder")}
      />
    </label>

    <label>
      <span>{t("tasks.form.clientLabel")}</span>
      <select
        name="clientId"
        disabled={submitting}
        onChange={(e: Event) => {
          const target = e.currentTarget as HTMLSelectElement;
          dispatch({
            type: "set-client-id",
            value: target.value || null,
          });
        }}
      >
        <option value="">{t("tasks.form.clientNone")}</option>
        {/* Phase 2: options via rpc.tasks.clients.search */}
      </select>
    </label>

    <label>
      <span>{t("tasks.form.typeLabel")}</span>
      <select
        name="typeId"
        required
        value={state.typeId}
        disabled={submitting || props.availableTypes.length === 0}
        onChange={(e: Event) => {
          const target = e.currentTarget as HTMLSelectElement;
          dispatch({ type: "set-type-id", value: target.value });
        }}
      >
        <option value="">—</option>
        {props.availableTypes.map((t) => (
          <option key={t.type_id} value={t.type_id}>
            {t.type_name}
          </option>
        ))}
      </select>
    </label>

    <label>
      <span>{t("tasks.form.categoryLabel")}</span>
      <select
        name="categoryId"
        disabled={submitting || isCategoryDisabled(state)}
        onChange={(e: Event) => {
          const target = e.currentTarget as HTMLSelectElement;
          dispatch({
            type: "set-category-id",
            value: target.value || null,
          });
        }}
      >
        <option value="">—</option>
        {/* Phase 2: options via rpc.tasks.categoriesByType(typeId) */}
      </select>
      {isCategoryDisabled(state) && (
        <small>{t("tasks.form.categoryDisabled")}</small>
      )}
    </label>

    <label>
      <span>Estado</span>
      <select
        name="stateId"
        required
        value={state.stateId}
        disabled={submitting || props.availableStates.length === 0}
        onChange={(e: Event) => {
          const target = e.currentTarget as HTMLSelectElement;
          dispatch({ type: "set-state-id", value: target.value });
        }}
      >
        <option value="">—</option>
        {props.availableStates.map((s) => (
          <option key={s.tast_id} value={s.tast_id}>
            {s.tast_name}
          </option>
        ))}
      </select>
    </label>

    <fieldset disabled={ATTACHMENTS_DISABLED}>
      <legend>{t("tasks.form.attachmentsLabel")}</legend>
      <p>{t("tasks.form.attachmentsDisabled")}</p>
    </fieldset>

    {validationError && (
      <p data-slot="validation-error" role="alert">
        {validationError}
      </p>
    )}
    {submitError && (
      <p data-slot="submit-error" role="alert">
        {submitError}
      </p>
    )}

    <div data-slot="form-actions">
      <button type="submit" disabled={Boolean(validationError) || submitting}>
        {submitting
          ? t("tasks.form.submitting")
          : props.mode === "create"
          ? t("tasks.form.submit")
          : t("tasks.form.submitUpdate")}
      </button>
      <button
        type="button"
        disabled={submitting}
        onClick={() => props.onCancel()}
      >
        {t("tasks.form.cancel")}
      </button>
    </div>
  </form>
}
