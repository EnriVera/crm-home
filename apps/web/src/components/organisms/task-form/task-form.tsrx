import { useState } from "octane";
import { t } from "../../vendor/i18n/core";
import { Button } from "../../atoms/button.tsrx";
import { TextInput } from "../../atoms/text-input.tsrx";
import { StatusMessage } from "../../atoms/status-message.tsrx";
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
 * Styling: usa el mismo lenguaje visual del resto del sistema
 * (impeccable Operate / design.md):
 * - surface + border 1px + rounded-md en cada campo
 * - spacing generoso entre campos (space-y-5)
 * - labels pequeñas (text-xs font-medium text-text-secondary)
 * - una sola acción primaria por drawer ("Crear tarea" o "Guardar cambios")
 * - errores inline con `StatusMessage variant="error"` (mismo token AA)
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

const FIELD_CLASS =
  "block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

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
    class="flex flex-col gap-5"
  >
    <label class="flex flex-col gap-1.5">
      <span class="text-xs font-medium text-text-secondary">
        {t("tasks.form.titleLabel")}
      </span>
      <TextInput
        id="task-form-title"
        name="title"
        value={state.title}
        required
        placeholder={t("tasks.form.titlePlaceholder")}
        invalid={Boolean(validationError)}
        onInput={(value) => dispatch({ type: "set-title", value })}
      />
    </label>

    <label class="flex flex-col gap-1.5">
      <span class="text-xs font-medium text-text-secondary">
        {t("tasks.form.descriptionLabel")}
      </span>
      <textarea
        name="description"
        value={state.description ?? ""}
        maxLength={50_000}
        rows={4}
        onInput={(e: Event) => {
          const target = e.currentTarget as HTMLTextAreaElement;
          dispatch({
            type: "set-description",
            value: target.value || null,
          });
        }}
        placeholder={t("tasks.form.descriptionPlaceholder")}
        class={`${FIELD_CLASS} resize-y`}
      />
    </label>

    <label class="flex flex-col gap-1.5">
      <span class="text-xs font-medium text-text-secondary">
        {t("tasks.form.clientLabel")}
      </span>
      <select
        name="clientId"
        onChange={(e: Event) => {
          const target = e.currentTarget as HTMLSelectElement;
          dispatch({
            type: "set-client-id",
            value: target.value || null,
          });
        }}
        class={FIELD_CLASS}
      >
        <option value="">{t("tasks.form.clientNone")}</option>
        {/* Phase 2: options via rpc.tasks.clients.search */}
      </select>
    </label>

    <label class="flex flex-col gap-1.5">
      <span class="text-xs font-medium text-text-secondary">
        {t("tasks.form.typeLabel")}
      </span>
      <select
        name="typeId"
        required
        onChange={(e: Event) => {
          const target = e.currentTarget as HTMLSelectElement;
          dispatch({ type: "set-type-id", value: target.value });
        }}
        class={FIELD_CLASS}
      >
        <option value="">—</option>
      </select>
    </label>

    <label class="flex flex-col gap-1.5">
      <span class="text-xs font-medium text-text-secondary">
        {t("tasks.form.categoryLabel")}
      </span>
      <select
        name="categoryId"
        onChange={(e: Event) => {
          const target = e.currentTarget as HTMLSelectElement;
          dispatch({
            type: "set-category-id",
            value: target.value || null,
          });
        }}
        class={FIELD_CLASS}
      >
        <option value="">—</option>
        {/* Phase 2: options via rpc.tasks.categoriesByType(typeId) */}
      </select>
    </label>

    <label class="flex flex-col gap-1.5">
      <span class="text-xs font-medium text-text-secondary">
        {t("tasks.form.stateLabel") ?? "Estado"}
      </span>
      <select
        name="stateId"
        required
        onChange={(e: Event) => {
          const target = e.currentTarget as HTMLSelectElement;
          dispatch({ type: "set-state-id", value: target.value });
        }}
        class={FIELD_CLASS}
      >
        <option value="">—</option>
      </select>
    </label>

    <fieldset
      disabled
      class="rounded-md border border-dashed border-border bg-surface px-4 py-3"
    >
      <legend class="px-1 text-xs font-medium text-text-secondary">
        {t("tasks.form.attachmentsLabel")}
      </legend>
      <p class="m-0 text-sm text-text-secondary">
        {t("tasks.form.attachmentsDisabled")}
      </p>
    </fieldset>

    {validationError && (
      <StatusMessage variant="error" id="task-form-validation">
        {t(validationError)}
      </StatusMessage>
    )}
    {submitError && (
      <StatusMessage variant="error" id="task-form-submit">
        {submitError}
      </StatusMessage>
    )}

    <div data-slot="form-actions" class="flex items-center justify-end gap-2 pt-2">
      <Button variant="ghost" onClick={() => props.onCancel()}>
        {t("tasks.form.cancel")}
      </Button>
      <Button
        variant="primary"
        type="submit"
        disabled={Boolean(validationError) || !readyToSubmit || submitting}
      >
        {submitting
          ? t("tasks.form.submitting")
          : props.mode === "create"
          ? t("tasks.form.submit")
          : t("tasks.form.submitUpdate")}
      </Button>
    </div>
  </form>
}
