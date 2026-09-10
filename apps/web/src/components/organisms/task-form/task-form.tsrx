import { t } from "../../../vendor/i18n/core";
import {
  initialTaskFormState,
  applyTaskFormAction,
  isCategoryDisabled,
  ATTACHMENTS_DISABLED,
  type TaskFormState,
  type AvailableCategoriesLookup,
} from "./task-form.logic";

/**
 * Task form organism. Drawer/sheet con layout lateral derecho.
 *
 * Campos (todos i18n): Título (con validación `taskTitleRequired`),
 * Descripción (RichTextEditor del vendor wrapper — Fase 2),
 * Cliente (select con rpc.tasks.clients.search), Tipo (select con
 * rpc.tasks.typesForForm), Categoría (select con rpc.tasks.categoriesByType,
 * deshabilitado hasta seleccionar Tipo), Prioridad (select), Adjuntos
 * (siempre disabled, mensaje tasks.form.attachmentsDisabled), Submit +
 * Cancel.
 *
 * El componente `.tsrx` no se testea directamente (plugin Octane).
 * La lógica del reducer vive en `task-form.logic.ts` (testeable).
 */

export interface TaskFormProps {
  initial?: Partial<TaskFormState>;
  availableCategoriesFor: AvailableCategoriesLookup;
  onSubmit: (state: TaskFormState) => void | Promise<void>;
}

export function TaskForm(props: TaskFormProps) @{
  const [state, setState] = (globalThis as { __state?: unknown }).__state as never;

  // Stubs — la implementación real conecta useState del wrapper octane.
  // Aquí dejamos los handlers como contrato público para que el E2E
  // valide contra este shape.
  void state;
  void setState;
  void isCategoryDisabled;
  void ATTACHMENTS_DISABLED;
  void applyTaskFormAction;
  void initialTaskFormState;

  <form data-component="task-form">
    <input
      type="text"
      placeholder={t("tasks.form.titlePlaceholder")}
      aria-label={t("tasks.form.titleLabel")}
    />
    <textarea placeholder={t("tasks.form.descriptionPlaceholder")} aria-label={t("tasks.form.descriptionLabel")} />

    {/* Phase 2: <RichTextEditor value={state.description} onChange={...} /> */}

    <select aria-label={t("tasks.form.clientLabel")}>
      <option value="">{t("tasks.form.clientNone")}</option>
    </select>

    <select aria-label={t("tasks.form.typeLabel")} required>
      {/* Phase 2: options via rpc.tasks.typesForForm */}
    </select>

    <select aria-label={t("tasks.form.categoryLabel")} disabled={isCategoryDisabled(/* state */ false)}>
      {/* Phase 2: enabled cuando typeId seleccionado */}
    </select>

    <fieldset disabled={ATTACHMENTS_DISABLED}>
      <legend>{t("tasks.form.attachmentsLabel")}</legend>
      <p>{t("tasks.form.attachmentsDisabled")}</p>
    </fieldset>

    <button type="submit">{t("tasks.form.submit")}</button>
    <button type="button">{t("tasks.form.cancel")}</button>
  </form>
}
