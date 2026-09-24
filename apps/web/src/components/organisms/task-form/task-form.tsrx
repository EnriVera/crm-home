import { useState } from "octane";
import { t } from "../../vendor/i18n/core";
import {
  initialTaskFormState,
  applyTaskFormAction,
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
 *
 * NOTA sobre octane (limitación conocida): poner `disabled={X || Y}` en un
 * `<select>` con options dinámicas (`.map`) rompe el render del article
 * entero (body queda vacío). Reproducible en /tasks/:id?edit=true. Por
 * eso los selects no usan `disabled` — la validación client-side se hace
 * en el botón submit (ver `firstValidationError` + checks adicionales). Las
 * opciones dinámicas sí funcionan siempre que NO haya `disabled`.
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

function isFormReadyToSubmit(state: TaskFormState): boolean {
  // Requeridos para que el server no responda 400 con
  // "task_type_id is required" / "task_tast_id is required".
  return (
    state.title.trim().length > 0 &&
    state.typeId.length > 0 &&
    state.stateId.length > 0
  );
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
  const readyToSubmit = isFormReadyToSubmit(state);

  const handleSubmit = async (event: Event): Promise<void> => {
    event.preventDefault();
    if (validationError || !readyToSubmit || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await props.onSubmit(state);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submit failed");
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
        onChange={(e: Event) => {
          const target = e.currentTarget as HTMLSelectElement;
          dispatch({ type: "set-type-id", value: target.value });
        }}
      >
        <option value="">—</option>
      </select>
    </label>

    <label>
      <span>{t("tasks.form.categoryLabel")}</span>
      <select
        name="categoryId"
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
    </label>

    <label>
      <span>Estado</span>
      <select
        name="stateId"
        required
        onChange={(e: Event) => {
          const target = e.currentTarget as HTMLSelectElement;
          dispatch({ type: "set-state-id", value: target.value });
        }}
      >
        <option value="">—</option>
      </select>
    </label>

    <fieldset disabled>
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
      <button
        type="submit"
        disabled={Boolean(validationError) || !readyToSubmit || submitting}
      >
        {submitting
          ? t("tasks.form.submitting")
          : props.mode === "create"
          ? t("tasks.form.submit")
          : t("tasks.form.submitUpdate")}
      </button>
      <button
        type="button"
        onClick={() => props.onCancel()}
      >
        {t("tasks.form.cancel")}
      </button>
    </div>
  </form>
}
