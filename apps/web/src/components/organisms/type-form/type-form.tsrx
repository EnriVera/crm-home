import { useState } from "octane";
import { t } from "../../vendor/i18n/core";
import { Button } from "../../atoms/button.tsrx";
import { TextInput } from "../../atoms/text-input.tsrx";
import { StatusMessage } from "../../atoms/status-message.tsrx";
import { Drawer } from "../../atoms/drawer.tsrx";
import {
  TYPE_MODULE_NAMES,
  type TypeModuleName,
  type TypeModules,
} from "@crm/types";
import {
  applyTypeFormAction,
  firstTypeFormError,
  initialTypeFormState,
  isTypeFormReadyToSubmit,
  typeFormToApiPayload,
  type TypeFormState,
} from "./type-form.logic";

/**
 * Type form organism (drawer right-side) — tab `tipos` de /config.
 *
 * Campos (todos i18n):
 *   - Nombre (obligatorio, 1-100 chars, trim)
 *   - Módulos (checkboxes N-modulos; vacío = "all modules")
 *
 * Modos:
 *   - `create` → submit llama `rpc.types.create(...)`.
 *   - `edit`   → submit llama `rpc.types.update({ type_id, ...payload })`.
 *
 * Estado del drawer: controlado por el padre (TypesTab) via la URL
 * (\`?tab=types&new\` o \`?tab=types&edit=<id>\`). Este componente
 * sólo recibe los handlers y el estado inicial.
 */

const MODULE_LABEL_KEYS: Record<TypeModuleName, string> = {
  tasks: "types.module.tasks",
  incomes: "types.module.incomes",
  expenses: "types.module.expenses",
  schedules: "types.module.schedules",
};

export interface TypeFormProps {
  mode: "create" | "edit";
  initial?: Partial<TypeFormState>;
  /** Requerido en `mode="edit"` para armar el payload del update. */
  editingId?: string;
  onSubmit: (payload: {
    type_name: string;
    type_modules: TypeModules;
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

      <fieldset class="flex flex-col gap-2">
        <legend class="text-xs font-medium text-text-secondary">
          {t("types.fields.modules")}
        </legend>
        <p class="text-xs text-text-secondary">{t("types.fields.modulesHint")}</p>
        <div class="flex flex-col gap-1.5">
          {TYPE_MODULE_NAMES.map((moduleValue) => {
            const checked = state.modules.includes(moduleValue);
            return (
              <label
                key={moduleValue}
                class="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary hover:bg-surface"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={isSubmitting}
                  onChange={() => {
                    setState((prev) =>
                      applyTypeFormAction(prev, {
                        type: "toggle_module",
                        value: moduleValue,
                      }),
                    );
                  }}
                  class="h-4 w-4 rounded border-border text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                />
                <span>{t(MODULE_LABEL_KEYS[moduleValue])}</span>
              </label>
            );
          })}
        </div>
        {state.modules.length === 0 && (
          <p class="text-xs text-text-secondary">
            {t("types.fields.modulesEmptyHint")}
          </p>
        )}
      </fieldset>

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
