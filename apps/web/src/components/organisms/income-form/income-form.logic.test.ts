import { describe, expect, test } from "bun:test";
import {
  applyIncomeFormAction,
  firstIncomeFormError,
  incomeFormToApiPayload,
  initialIncomeFormState,
  isIncomeFormReadyToSubmit,
  validateIncomeForm,
} from "./income-form.logic";

const UUID = "11111111-1111-1111-1111-111111111111";

describe("income-form.logic", () => {
  describe("initialIncomeFormState", () => {
    test("returns sensible defaults (date = today)", () => {
      const state = initialIncomeFormState();
      expect(state.accountId).toBe("");
      expect(state.amount).toBe("");
      expect(state.currencyId).toBe("");
      expect(state.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(state.description).toBeNull();
      expect(state.category).toBeNull();
    });

    test("hydrates from partial initial", () => {
      const state = initialIncomeFormState({
        accountId: UUID,
        amount: "1500.00",
      });
      expect(state.accountId).toBe(UUID);
      expect(state.amount).toBe("1500.00");
    });
  });

  describe("applyIncomeFormAction", () => {
    test("set_amount updates amount", () => {
      const next = applyIncomeFormAction(initialIncomeFormState(), {
        type: "set_amount",
        value: "100",
      });
      expect(next.amount).toBe("100");
    });

    test("set_description trims and sets null on empty", () => {
      const state = initialIncomeFormState();
      const a = applyIncomeFormAction(state, {
        type: "set_description",
        value: "  test  ",
      });
      expect(a.description).toBe("test");
      const b = applyIncomeFormAction(state, {
        type: "set_description",
        value: "   ",
      });
      expect(b.description).toBeNull();
    });
  });

  describe("validateIncomeForm", () => {
    test("happy path", () => {
      const state = initialIncomeFormState({
        accountId: UUID,
        amount: "1000.00",
        currencyId: UUID,
        date: "2026-03-15",
        description: "Pago de Acme",
        category: "Servicios",
      });
      expect(validateIncomeForm(state)).toEqual([]);
    });

    test("rejects empty accountId", () => {
      const errors = validateIncomeForm(
        initialIncomeFormState({
          amount: "100",
          currencyId: UUID,
          date: "2026-01-01",
        }),
      );
      expect(errors[0]?.code).toBe("INCOME_ACCOUNT_REQUIRED");
    });

    test("rejects empty currencyId", () => {
      const errors = validateIncomeForm(
        initialIncomeFormState({
          accountId: UUID,
          amount: "100",
          date: "2026-01-01",
        }),
      );
      expect(errors[0]?.code).toBe("INCOME_CURRENCY_REQUIRED");
    });

    test("rejects amount with letters", () => {
      const errors = validateIncomeForm(
        initialIncomeFormState({
          accountId: UUID,
          currencyId: UUID,
          amount: "abc",
          date: "2026-01-01",
        }),
      );
      expect(errors[0]?.code).toBe("INCOME_AMOUNT_INVALID");
    });

    test("rejects amount <= 0", () => {
      const errors = validateIncomeForm(
        initialIncomeFormState({
          accountId: UUID,
          currencyId: UUID,
          amount: "0",
          date: "2026-01-01",
        }),
      );
      expect(errors[0]?.code).toBe("INCOME_AMOUNT_NON_POSITIVE");
    });

    test("rejects negative amount", () => {
      const errors = validateIncomeForm(
        initialIncomeFormState({
          accountId: UUID,
          currencyId: UUID,
          amount: "-5",
          date: "2026-01-01",
        }),
      );
      expect(
        errors.some(
          (e) =>
            e.code === "INCOME_AMOUNT_NON_POSITIVE" ||
            e.code === "INCOME_AMOUNT_INVALID",
        ),
      ).toBe(true);
    });

    test("rejects bad date", () => {
      const errors = validateIncomeForm(
        initialIncomeFormState({
          accountId: UUID,
          currencyId: UUID,
          amount: "100",
          date: "not-a-date",
        }),
      );
      expect(errors[0]?.code).toBe("INCOME_DATE_INVALID");
    });

    test("rejects description > 500", () => {
      const errors = validateIncomeForm(
        initialIncomeFormState({
          accountId: UUID,
          currencyId: UUID,
          amount: "100",
          date: "2026-01-01",
          description: "a".repeat(501),
        }),
      );
      expect(errors[0]?.code).toBe("INCOME_DESCRIPTION_TOO_LONG");
    });

    test("rejects category > 100", () => {
      const errors = validateIncomeForm(
        initialIncomeFormState({
          accountId: UUID,
          currencyId: UUID,
          amount: "100",
          date: "2026-01-01",
          category: "a".repeat(101),
        }),
      );
      expect(errors[0]?.code).toBe("INCOME_CATEGORY_TOO_LONG");
    });
  });

  describe("isIncomeFormReadyToSubmit", () => {
    test("true for valid state", () => {
      expect(
        isIncomeFormReadyToSubmit(
          initialIncomeFormState({
            accountId: UUID,
            currencyId: UUID,
            amount: "100",
            date: "2026-01-01",
          }),
        ),
      ).toBe(true);
    });

    test("false for invalid state", () => {
      expect(isIncomeFormReadyToSubmit(initialIncomeFormState())).toBe(false);
    });
  });

  describe("firstIncomeFormError", () => {
    test("returns null when valid", () => {
      expect(
        firstIncomeFormError(
          initialIncomeFormState({
            accountId: UUID,
            currencyId: UUID,
            amount: "100",
            date: "2026-01-01",
          }),
        ),
      ).toBeNull();
    });

    test("returns first error when invalid", () => {
      expect(firstIncomeFormError(initialIncomeFormState())?.code).toBe(
        "INCOME_ACCOUNT_REQUIRED",
      );
    });
  });

  describe("incomeFormToApiPayload", () => {
    test("normalizes amount to 4 decimals", () => {
      const payload = incomeFormToApiPayload(
        initialIncomeFormState({
          accountId: UUID,
          currencyId: UUID,
          amount: "100",
          date: "2026-01-01",
        }),
      );
      expect(payload.inco_amount).toBe("100.0000");
    });

    test("preserves null fields", () => {
      const payload = incomeFormToApiPayload(
        initialIncomeFormState({
          accountId: UUID,
          currencyId: UUID,
          amount: "100",
          date: "2026-01-01",
        }),
      );
      expect(payload.inco_description).toBeNull();
      expect(payload.inco_category).toBeNull();
    });
  });
});
