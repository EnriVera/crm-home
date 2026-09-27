import { useState } from "octane";
import { t } from "../../vendor/i18n/core";
import { Button } from "../../atoms/button.tsrx";
import { TextInput } from "../../atoms/text-input.tsrx";
import { StatusMessage } from "../../atoms/status-message.tsrx";
import { Drawer } from "../../atoms/drawer.tsrx";
import {
  applyClientFormAction,
  clientFormToApiPayload,
  firstClientFormError,
  initialClientFormState,
  isClientFormReadyToSubmit,
  type ClientFormState,
} from "./client-form.logic";

/**
 * Client form organism. Drawer/sheet con layout lateral derecho.
 *
 * Campos (todos i18n):
 * - Nombre (required, validación inline)
 * - Email (opcional, formato email si presente)
 * - Teléfono (opcional, max 40 chars)
 *
 * El componente `.tsrx` no se testea directamente (plugin Octane). La
 * lógica del reducer vive en `client-form.logic.ts` (testeable).
 *
 * Estado MVP:
 * - `state`: useState real con reducer `applyClientFormAction`.
 * - `onSubmit(state)`: callback al parent, que decide si llama
 *   `RPC.clients.create(...)` o `RPC.clients.update(...)` según el modo.
 *
 * Styling: usa el mismo lenguaje visual del resto del sistema
 * (impeccable Operate / design.md):
 * - surface + border 1px + rounded-md en cada campo
 * - spacing generoso entre campos (space-y-5)
 * - labels pequeñas (text-xs font-medium text-text-secondary)
 * - una sola acción primaria por drawer ("Crear cliente" o "Guardar cambios")
 * - errores inline con `StatusMessage variant="error"`
 */
export interface ClientFormProps {
  /** Modo: 'create' (default) o 'edit'. Determina copy + label del botón. */
  mode?: "create" | "edit";
  /** Estado inicial (útil para modo edit). */
  initial?: Partial<ClientFormState>;
  /** Handler de submit. Recibe el payload listo para el RPC. */
  onSubmit: (payload: {
    client_name: string;
    client_email: string | null;
    client_phone: string | null;
  }) => Promise<void> | void;
  /** Handler para cerrar el drawer. */
  onClose: () => void;
  /** Si el parent está en medio de un submit (optimistic), deshabilita inputs. */
  isSubmitting?: boolean;
}

export function ClientForm(props: ClientFormProps) @{
  const mode = props.mode ?? "create";
  const [state, setState] = useState<ClientFormState>(() =>
    initialClientFormState(props.initial),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isSubmitting = props.isSubmitting ?? false;
  const ready = isClientFormReadyToSubmit(state);

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    const firstError = firstClientFormError(state);
    if (firstError !== null) {
      setErrorMessage(firstError.message);
      return;
    }
    setErrorMessage(null);
    try {
      await props.onSubmit(clientFormToApiPayload(state));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Submit failed");
    }
  };

  <Drawer open onClose={props.onClose} title={mode === "create" ? t("clients.create.title") : t("clients.edit.title")}>
    <form onSubmit={handleSubmit} class="flex flex-col gap-5">
      <div class="flex flex-col gap-1.5">
        <label
          for="client-name"
          class="text-xs font-medium text-text-secondary"
        >
          {t("clients.fields.name")} *
        </label>
        <TextInput
          id="client-name"
          value={state.name}
          onInput={(event) => {
            const next = event.currentTarget.value;
            setState((prev) => applyClientFormAction(prev, { type: "set_name", value: next }));
          }}
          placeholder="Acme Corp"
          autoComplete="off"
          disabled={isSubmitting}
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label
          for="client-email"
          class="text-xs font-medium text-text-secondary"
        >
          {t("clients.fields.email")}
        </label>
        <TextInput
          id="client-email"
          type="email"
          value={state.email ?? ""}
          onInput={(event) => {
            const next = event.currentTarget.value;
            setState((prev) => applyClientFormAction(prev, { type: "set_email", value: next }));
          }}
          placeholder="info@acme.test"
          autoComplete="off"
          disabled={isSubmitting}
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label
          for="client-phone"
          class="text-xs font-medium text-text-secondary"
        >
          {t("clients.fields.phone")}
        </label>
        <TextInput
          id="client-phone"
          value={state.phone ?? ""}
          onInput={(event) => {
            const next = event.currentTarget.value;
            setState((prev) => applyClientFormAction(prev, { type: "set_phone", value: next }));
          }}
          placeholder="+54-11-4000-0000"
          autoComplete="off"
          disabled={isSubmitting}
        />
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
          {t("clients.form.cancel")}
        </Button>
        <Button
          variant="primary"
          type="submit"
          disabled={ready === false || isSubmitting}
        >
          {mode === "create"
            ? t("clients.create.submit")
            : t("clients.edit.submit")}
        </Button>
      </div>
    </form>
  </Drawer>
}
