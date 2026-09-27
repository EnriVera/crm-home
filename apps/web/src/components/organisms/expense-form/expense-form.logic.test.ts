import { describe, expect, test } from "bun:test";
import {
  applyExpenseFormAction,
  expenseFormToApiPayload,
  firstExpenseFormError,
  initialExpenseFormState,
  isExpenseFormReadyToSubmit,
  validateExpenseForm,
} from "./expense-form.logic";

const UUID = "11111111-1111-1111-1111-111111111111";

describe("expense-form.logic", () => {
  describe("initialExpenseFormState", () => {
    test("returns sensible defaults (date = today)", () => {
      const state = initialExpenseFormState();
      expect(state.accountId).toBe("");
      expect(state.amount).toBe("");
      expect(state.receiptUrl).toBeNull();
    });
  });

  describe("validateExpenseForm", () => {
    test("happy path", () => {
      const state = initialExpenseFormState({
        accountId: UUID,
        amount: "500.00",
        currencyId: UUID,
        date: "2026-03-15",
        description: "Compra X",
        category: "Servicios",
        receiptUrl: "https://example.com/receipt.pdf",
      });
      expect(validateExpenseForm(state)).toEqual([]);
    });

    test("rejects empty accountId", () => {
      const errors = validateExpenseForm(
        initialExpenseFormState({
          amount: "100",
          currencyId: UUID,
          date: "2026-01-01",
        }),
      );
      expect(errors[0]?.code).toBe("EXPENSE_ACCOUNT_REQUIRED");
    });

    test("rejects invalid amount", () => {
      const errors = validateExpenseForm(
        initialExpenseFormState({
          accountId: UUID,
          currencyId: UUID,
          amount: "abc",
          date: "2026-01-01",
        }),
      );
      expect(errors[0]?.code).toBe("EXPENSE_AMOUNT_INVALID");
    });

    test("rejects non-positive amount", () => {
      const errors = validateExpenseForm(
        initialExpenseFormState({
          accountId: UUID,
          currencyId: UUID,
          amount: "0",
          date: "2026-01-01",
        }),
      );
      expect(errors[0]?.code).toBe("EXPENSE_AMOUNT_NON_POSITIVE");
    });

    test("rejects invalid receipt URL", () => {
      const errors = validateExpenseForm(
        initialExpenseFormState({
          accountId: UUID,
          currencyId: UUID,
          amount: "100",
          date: "2026-01-01",
          receiptUrl: "not-a-url",
        }),
      );
      expect(errors[0]?.code).toBe("EXPENSE_RECEIPT_URL_INVALID");
    });

    test("accepts empty receipt URL (null)", () => {
      const state = initialExpenseFormState({
        accountId: UUID,
        currencyId: UUID,
        amount: "100",
        date: "2026-01-01",
        receiptUrl: null,
      });
      expect(validateExpenseForm(state).length).toBe(0);
    });
  });

  describe("expenseFormToApiPayload", () => {
    test("normalizes amount to 4 decimals", () => {
      const payload = expenseFormToApiPayload(
        initialExpenseFormState({
          accountId: UUID,
          currencyId: UUID,
          amount: "100",
          date: "2026-01-01",
        }),
      );
      expect(payload.expe_amount).toBe("100.0000");
    });

    test("includes receiptUrl when provided", () => {
      const payload = expenseFormToApiPayload(
        initialExpenseFormState({
          accountId: UUID,
          currencyId: UUID,
          amount: "100",
          date: "2026-01-01",
          receiptUrl: "https://example.com/r.pdf",
        }),
      );
      expect(payload.expe_receipt_url).toBe("https://example.com/r.pdf");
    });
  });

  describe("isExpenseFormReadyToSubmit", () => {
    test("true for valid state", () => {
      expect(
        isExpenseFormReadyToSubmit(
          initialExpenseFormState({
            accountId: UUID,
            currencyId: UUID,
            amount: "100",
            date: "2026-01-01",
          }),
        ),
      ).toBe(true);
    });

    test("false for invalid state", () => {
      expect(isExpenseFormReadyToSubmit(initialExpenseFormState())).toBe(false);
    });
  });

  describe("firstExpenseFormError", () => {
    test("returns first error when invalid", () => {
      expect(firstExpenseFormError(initialExpenseFormState())?.code).toBe(
        "EXPENSE_ACCOUNT_REQUIRED",
      );
    });
  });

  describe("applyExpenseFormAction", () => {
    test("set_receipt_url updates receiptUrl", () => {
      const next = applyExpenseFormAction(initialExpenseFormState(), {
        type: "set_receipt_url",
        value: "https://example.com/r.pdf",
      });
      expect(next.receiptUrl).toBe("https://example.com/r.pdf");
    });

    test("clear_receipt_url sets to null", () => {
      const state = initialExpenseFormState({
        receiptUrl: "https://example.com/r.pdf",
      });
      const next = applyExpenseFormAction(state, { type: "clear_receipt_url" });
      expect(next.receiptUrl).toBeNull();
    });
  });
});
