import { describe, expect, test } from "bun:test";
import {
  applyClientFormAction,
  clientFormToApiPayload,
  firstClientFormError,
  initialClientFormState,
  isClientFormReadyToSubmit,
  validateClientForm,
} from "./client-form.logic";

describe("client-form.logic", () => {
  describe("initialClientFormState", () => {
    test("returns defaults when no initial provided", () => {
      expect(initialClientFormState()).toEqual({
        name: "",
        email: null,
        phone: null,
      });
    });

    test("hydrates from partial initial", () => {
      expect(
        initialClientFormState({
          name: "Acme",
          email: "info@acme.test",
        }),
      ).toEqual({
        name: "Acme",
        email: "info@acme.test",
        phone: null,
      });
    });
  });

  describe("applyClientFormAction", () => {
    test("set_name updates name", () => {
      const next = applyClientFormAction(initialClientFormState(), {
        type: "set_name",
        value: "Acme",
      });
      expect(next.name).toBe("Acme");
    });

    test("set_email trims and sets null on empty", () => {
      const state = initialClientFormState();
      const a = applyClientFormAction(state, {
        type: "set_email",
        value: "  info@acme.test  ",
      });
      expect(a.email).toBe("info@acme.test");
      const b = applyClientFormAction(state, { type: "set_email", value: "   " });
      expect(b.email).toBeNull();
    });

    test("clear_email sets email to null", () => {
      const state = initialClientFormState({ email: "x@y.com" });
      const next = applyClientFormAction(state, { type: "clear_email" });
      expect(next.email).toBeNull();
    });

    test("reset replaces full state", () => {
      const next = applyClientFormAction(
        initialClientFormState({ name: "Acme" }),
        { type: "reset", initial: initialClientFormState({ name: "Globex" }) },
      );
      expect(next.name).toBe("Globex");
    });
  });

  describe("validateClientForm", () => {
    test("happy path", () => {
      const state = initialClientFormState({
        name: "Acme",
        email: "info@acme.test",
        phone: "+54-11-4000-0000",
      });
      expect(validateClientForm(state)).toEqual([]);
    });

    test("rejects empty name", () => {
      const errors = validateClientForm(initialClientFormState());
      expect(errors[0]?.code).toBe("CLIENT_NAME_REQUIRED");
      expect(errors[0]?.field).toBe("name");
    });

    test("rejects whitespace-only name", () => {
      const errors = validateClientForm(
        initialClientFormState({ name: "   " }),
      );
      expect(errors[0]?.code).toBe("CLIENT_NAME_REQUIRED");
    });

    test("rejects name longer than 100 chars", () => {
      const errors = validateClientForm(
        initialClientFormState({ name: "a".repeat(101) }),
      );
      expect(errors[0]?.code).toBe("CLIENT_NAME_TOO_LONG");
    });

    test("rejects invalid email format", () => {
      const errors = validateClientForm(
        initialClientFormState({ name: "Acme", email: "not-an-email" }),
      );
      expect(errors[0]?.code).toBe("CLIENT_EMAIL_INVALID");
      expect(errors[0]?.field).toBe("email");
    });

    test("rejects email longer than 254 chars", () => {
      const errors = validateClientForm(
        initialClientFormState({
          name: "Acme",
          email: "a".repeat(250) + "@x.com",
        }),
      );
      expect(errors[0]?.code).toBe("CLIENT_EMAIL_TOO_LONG");
    });

    test("rejects phone longer than 40 chars", () => {
      const errors = validateClientForm(
        initialClientFormState({ name: "Acme", phone: "+".repeat(41) }),
      );
      expect(errors[0]?.code).toBe("CLIENT_PHONE_TOO_LONG");
    });

    test("accepts null email and null phone", () => {
      expect(
        validateClientForm(initialClientFormState({ name: "Acme" })),
      ).toEqual([]);
    });
  });

  describe("isClientFormReadyToSubmit", () => {
    test("true for valid state", () => {
      expect(
        isClientFormReadyToSubmit(
          initialClientFormState({ name: "Acme" }),
        ),
      ).toBe(true);
    });

    test("false for invalid state", () => {
      expect(isClientFormReadyToSubmit(initialClientFormState())).toBe(false);
    });
  });

  describe("firstClientFormError", () => {
    test("returns null when valid", () => {
      expect(
        firstClientFormError(initialClientFormState({ name: "Acme" })),
      ).toBeNull();
    });

    test("returns first error when invalid", () => {
      expect(
        firstClientFormError(initialClientFormState())?.code,
      ).toBe("CLIENT_NAME_REQUIRED");
    });
  });

  describe("clientFormToApiPayload", () => {
    test("trims name", () => {
      const payload = clientFormToApiPayload(
        initialClientFormState({ name: "  Acme  " }),
      );
      expect(payload.client_name).toBe("Acme");
    });

    test("preserves null email and phone", () => {
      const payload = clientFormToApiPayload(
        initialClientFormState({ name: "Acme" }),
      );
      expect(payload.client_email).toBeNull();
      expect(payload.client_phone).toBeNull();
    });
  });
});
