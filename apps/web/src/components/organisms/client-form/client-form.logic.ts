/**
 * Reducer puro + factories para el form de client.
 *
 * Mismo patrón que `task-form.logic.ts`: estado con reducer + helpers de
 * validación. El componente `.tsrx` (no testeable por el plugin Octane)
 * solo orquesta UI + invoca este reducer.
 *
 * Estado:
 * - `name`: string (required, 1-100 chars)
 * - `email`: string | null (opcional, formato email si presente, max 254)
 * - `phone`: string | null (opcional, max 40 chars)
 *
 * El `mode` (create vs edit) NO vive en el state — el componente lo
 * recibe como prop y elige a qué RPC llamar en el submit.
 */

export type ClientFormMode = "create" | "edit";

export interface ClientFormState {
  name: string;
  email: string | null;
  phone: string | null;
}

export type ClientFormAction =
  | { type: "set_name"; value: string }
  | { type: "set_email"; value: string }
  | { type: "set_phone"; value: string }
  | { type: "clear_email" }
  | { type: "clear_phone" }
  | { type: "reset"; initial: ClientFormState };

export function initialClientFormState(
  initial: Partial<ClientFormState> = {},
): ClientFormState {
  return {
    name: initial.name ?? "",
    email: initial.email ?? null,
    phone: initial.phone ?? null,
  };
}

export function applyClientFormAction(
  state: ClientFormState,
  action: ClientFormAction,
): ClientFormState {
  switch (action.type) {
    case "set_name":
      return { ...state, name: action.value };
    case "set_email":
      return {
        ...state,
        email: action.value.trim().length === 0 ? null : action.value.trim(),
      };
    case "set_phone":
      return {
        ...state,
        phone: action.value.trim().length === 0 ? null : action.value.trim(),
      };
    case "clear_email":
      return { ...state, email: null };
    case "clear_phone":
      return { ...state, phone: null };
    case "reset":
      return action.initial;
  }
}

export type ClientValidationCode =
  | "CLIENT_NAME_REQUIRED"
  | "CLIENT_NAME_TOO_LONG"
  | "CLIENT_EMAIL_INVALID"
  | "CLIENT_EMAIL_TOO_LONG"
  | "CLIENT_PHONE_TOO_LONG";

export interface ClientValidationError {
  code: ClientValidationCode;
  field: "name" | "email" | "phone";
  message: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateClientForm(
  state: ClientFormState,
): ClientValidationError[] {
  const errors: ClientValidationError[] = [];
  const name = state.name.trim();
  if (name.length === 0) {
    errors.push({
      code: "CLIENT_NAME_REQUIRED",
      field: "name",
      message: "clientName is required",
    });
  } else if (name.length > 100) {
    errors.push({
      code: "CLIENT_NAME_TOO_LONG",
      field: "name",
      message: "clientName exceeds 100 chars",
    });
  }
  if (state.email !== null) {
    if (state.email.length > 254) {
      errors.push({
        code: "CLIENT_EMAIL_TOO_LONG",
        field: "email",
        message: "email too long",
      });
    } else if (!EMAIL_RE.test(state.email)) {
      errors.push({
        code: "CLIENT_EMAIL_INVALID",
        field: "email",
        message: "invalid email format",
      });
    }
  }
  if (state.phone !== null && state.phone.length > 40) {
    errors.push({
      code: "CLIENT_PHONE_TOO_LONG",
      field: "phone",
      message: "phone exceeds 40 chars",
    });
  }
  return errors;
}

export function firstClientFormError(
  state: ClientFormState,
): ClientValidationError | null {
  return validateClientForm(state)[0] ?? null;
}

export function isClientFormReadyToSubmit(state: ClientFormState): boolean {
  return validateClientForm(state).length === 0;
}

/** Convierte el form state al payload que espera el contract del API. */
export function clientFormToApiPayload(state: ClientFormState): {
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
} {
  return {
    client_name: state.name.trim(),
    client_email: state.email,
    client_phone: state.phone,
  };
}
