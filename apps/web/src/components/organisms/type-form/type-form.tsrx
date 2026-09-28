import { useState } from "octane";
import { t } from "../../vendor/i18n/core";
import { Button } from "../../atoms/button.tsrx";
import { TextInput } from "../../atoms/text-input.tsrx";
import { StatusMessage } from "../../atoms/status-message.tsrx";
import { Drawer } from "../../atoms/drawer.tsrx";
import type { TypeModule } from "@crm/types";
import {
  applyTypeFormAction,
  firstTypeFormError,
  initialTypeFormState,
  isTypeFormReadyToSubmit,
  TYPE_FORM_MODULES,
  typeFormToApiPayload,
  type TypeFormState,
} from "./type-form.logic";

/**
 * Type form organism (drawer right-side) — tab `tipos` de /config.
 *
 * Campos (todos i18n):
 *   - Nombre (obligatorio, 1-100 chars, trim)
 *   - Módulo (select cerrado: tasks / incomes / expenses / schedules)
 *
 * Modos:
 *   - `create` → submit llama `rpc.types.create(...)`.
 *   - `edit`   → submit llama `rpc.types.update({ type_id, type_name, type_module })`.
 *
 * El form NO usa `useQueryState` para "edit open" porque el estado de
 * "qué type se está editando" vive en `types-tab.tsrx` (vía
 * `editingType` local + handler). Sólo el `tab` activo está en URL;
 * el sub-estado de UI (qué fila está expandida) sigue siendo local
 * por ahora. Si en el futuro se quiere deep-link a
 * `/config?tab=types&edit=<type_id>`, este drawer se conecta a
 * `useQueryStates({ tab, edit })` (work-unit aparte).
 */

const MODULE_LABEL_KEYS = {
  tasks: "types.module.tasks",
  incomes: "types.module.incomes",
  expenses: "types.module.expenses",
  schedules: "types.module.schedules",
} as const satisfies Record<TypeModule, string>;

export interface TypeFormProps {
  mode: "create" | "edit";
  initial?: Partial<TypeFormState>;
  /** Requerido en `mode="edit"` para armar el payload del update. */
  editingId?: string;
  onSubmit: (payload: {
    type_name: string;
    type_module: TypeModule;
  }) => Promise<void> | void;
  onClose: () => void;
  isSubmitting?: boolean;
}

export function TypeForm(props: TypeFormProps) @{
  const [state, setState] = useState<TypeFormState>(() =>
    initialTypeFormState(props.initial),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isSubmitting = props.isSubmitting ?? false;
  const ready = isTypeFormReadyToSubmit(state);

  const handleSubmit = async (event: Event): Promise<void> => {
    event.preventDefault();
    const firstError = firstTypeFormError(state);
    if (firstError !== null) {
      setErrorMessage(firstError.message);
      return;
    }
    setErrorMessage(null);
    try {
      await props.onSubmit(typeFormToApiPayload(state));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Submit failed");
    }
  };

  <Drawer
    open
    onClose={props.onClose}
    title={
      props.mode === "create" ? t("types.create.title") : t("types.edit.title")
    }
  >
    <form onSubmit={handleSubmit} class="flex flex-col gap-5">
      <div class="flex flex-col gap-1.5">
        <label for="type-name" class="text-xs font-medium text-text-secondary">
          {t("types.fields.name")} *
        </label>
        <TextInput
          id="type-name"
          value={state.name}
          onInput={(value) => {
            setState((prev) => applyTypeFormAction(prev, { type: "set_name", value }));
          }}
          placeholder="Desarrollo"
          autoComplete="off"
          disabled={isSubmitting}
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="type-module" class="text-xs font-medium text-text-secondary">
          {t("types.fields.module")} *
        </label>
        <select
          id="type-module"
          value={state.module}
          onInput={(e: Event) => {
            const target = e.currentTarget as HTMLSelectElement;
            setState((prev) =>
              applyTypeFormAction(prev, {
                type: "set_module",
                value: target.value as TypeModule,
              }),
            );
          }}
          disabled={isSubmitting}
          class="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {TYPE_FORM_MODULES.map((moduleValue) => (
            <option key={moduleValue} value={moduleValue}>
              {t(MODULE_LABEL_KEYS[moduleValue])}
            </option>
          ))}
        </select>
      </div>

      {errorMessage !== null ? (
        <StatusMessage variant="error">{errorMessage}</StatusMessage>
      ) : null}

      <div class="flex items-center justify-end gap-2 pt-2">
        <Button
          variant="ghost"
          type="button"
          onClick={props.onClose}
          disabled={isSubmitting}
        >
          {t("types.form.cancel")}
        </Button>
        <Button
          variant="primary"
          type="submit"
          disabled={ready === false || isSubmitting}
        >
          {props.mode === "create"
            ? t("types.create.submit")
            : t("types.edit.submit")}
        </Button>
      </div>
    </form>
  </Drawer>
}
