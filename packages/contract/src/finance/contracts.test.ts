import { describe, expect, test } from "bun:test";
import {
  createAccountInputSchema,
  createExpenseInputSchema,
  createIncomeInputSchema,
  createTransferInputSchema,
} from "./contracts";

const CURRENCY_ID = "11111111-1111-4111-8111-111111111111";
const ACCOUNT_ID = "22222222-2222-4222-8222-222222222222";

function incomeInput(amount: string, date = "2024-01-15") {
  return {
    inco_account_id: ACCOUNT_ID,
    inco_amount: amount,
    inco_currency_id: CURRENCY_ID,
    inco_description: null,
    inco_category: null,
    inco_date: date,
  };
}

function expenseInput(amount: string, date = "2024-01-15") {
  return {
    expe_account_id: ACCOUNT_ID,
    expe_amount: amount,
    expe_currency_id: CURRENCY_ID,
    expe_description: null,
    expe_category: null,
    expe_date: date,
    expe_receipt_url: null,
  };
}

function transferInput(amount: string, date = "2024-01-15") {
  return {
    tran_from_account_id: ACCOUNT_ID,
    tran_to_account_id: ACCOUNT_ID,
    tran_amount: amount,
    tran_currency_id: CURRENCY_ID,
    tran_description: null,
    tran_date: date,
  };
}

describe("amount schema", () => {
  test("acepta montos dentro del rango de NUMERIC(19,4)", () => {
    expect(createIncomeInputSchema.safeParse(incomeInput("0.0001")).success).toBe(
      true,
    );
    expect(createIncomeInputSchema.safeParse(incomeInput("1")).success).toBe(true);
    expect(
      createIncomeInputSchema.safeParse(incomeInput("250.5000")).success,
    ).toBe(true);
    expect(
      createIncomeInputSchema.safeParse(
        incomeInput("999999999999999.9999"),
      ).success,
    ).toBe(true);
  });

  test("rechaza montos con más de 15 dígitos enteros", () => {
    const result = createIncomeInputSchema.safeParse(
      incomeInput("99999999999999999999"),
    );
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("integer digits");
  });

  test("rechaza 16 dígitos enteros con decimales", () => {
    expect(
      createIncomeInputSchema.safeParse(
        incomeInput("1000000000000000.0000"),
      ).success,
    ).toBe(false);
    expect(
      createIncomeInputSchema.safeParse(
        incomeInput("9999999999999999"),
      ).success,
    ).toBe(false);
  });

  test("rechaza el cero y los montos con cero en la parte entera", () => {
    for (const amount of ["0", "0.0000", "0.0001"]) {
      const result = createIncomeInputSchema.safeParse(incomeInput(amount));
      if (amount === "0.0001") {
        expect(result.success).toBe(true);
      } else {
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toContain("must be > 0");
      }
    }
  });

  test("rechaza montos con más de 4 decimales o formato inválido", () => {
    expect(createIncomeInputSchema.safeParse(incomeInput("1.23456")).success).toBe(
      false,
    );
    expect(createIncomeInputSchema.safeParse(incomeInput("-1")).success).toBe(
      false,
    );
    expect(createIncomeInputSchema.safeParse(incomeInput("1e3")).success).toBe(
      false,
    );
  });

  test("el mismo rango aplica a gastos y transferencias", () => {
    expect(
      createExpenseInputSchema.safeParse(
        expenseInput("99999999999999999999"),
      ).success,
    ).toBe(false);
    expect(
      createTransferInputSchema.safeParse(
        transferInput("99999999999999999999"),
      ).success,
    ).toBe(false);
    expect(
      createTransferInputSchema.safeParse(
        transferInput("999999999999999.9999"),
      ).success,
    ).toBe(true);
    expect(createTransferInputSchema.safeParse(transferInput("0")).success).toBe(
      false,
    );
  });
});

describe("date schema", () => {
  test("acepta fechas reales del calendario", () => {
    for (const date of [
      "2024-02-29",
      "2024-01-31",
      "2023-12-31",
      "2000-02-29",
      "1900-02-28",
    ]) {
      expect(
        createIncomeInputSchema.safeParse(incomeInput("1", date)).success,
      ).toBe(true);
    }
  });

  test("rechaza fechas imposibles", () => {
    for (const date of [
      "2024-02-31",
      "2023-02-29",
      "1900-02-29",
      "2024-13-01",
      "2024-00-10",
      "2024-01-00",
      "2024-01-32",
    ]) {
      const result = createIncomeInputSchema.safeParse(incomeInput("1", date));
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain(
        "valid calendar date",
      );
    }
  });

  test("rechaza años fuera del rango de Postgres", () => {
    for (const date of ["0000-01-01", "0000-12-31"]) {
      expect(
        createIncomeInputSchema.safeParse(incomeInput("1", date)).success,
      ).toBe(false);
    }
    expect(
      createIncomeInputSchema.safeParse(incomeInput("1", "0001-01-01")).success,
    ).toBe(true);
    expect(
      createIncomeInputSchema.safeParse(incomeInput("1", "9999-12-31")).success,
    ).toBe(true);
  });

  test("rechaza el formato fuera de YYYY-MM-DD", () => {
    for (const date of ["15-01-2024", "2024-1-1", "20240115"]) {
      expect(
        createIncomeInputSchema.safeParse(incomeInput("1", date)).success,
      ).toBe(false);
    }
  });
});

describe("initial amount de cuenta", () => {
  function accountInput(amount: string) {
    return {
      acco_name: "Banco Nación",
      acco_icon: null,
      acco_color: null,
      acco_currency_id: CURRENCY_ID,
      acco_initial_amount: amount,
    };
  }

  test("admite el cero y montos dentro del rango", () => {
    expect(
      createAccountInputSchema.safeParse(accountInput("0")).success,
    ).toBe(true);
    expect(
      createAccountInputSchema.safeParse(accountInput("0.0000")).success,
    ).toBe(true);
    expect(
      createAccountInputSchema.safeParse(
        accountInput("999999999999999.9999"),
      ).success,
    ).toBe(true);
  });

  test("rechaza montos fuera del rango de NUMERIC(19,4)", () => {
    expect(
      createAccountInputSchema.safeParse(
        accountInput("99999999999999999999"),
      ).success,
    ).toBe(false);
    expect(
      createAccountInputSchema.safeParse(
        accountInput("1000000000000000.0000"),
      ).success,
    ).toBe(false);
  });

  test("rechaza el formato inválido", () => {
    expect(
      createAccountInputSchema.safeParse(accountInput("-1")).success,
    ).toBe(false);
    expect(
      createAccountInputSchema.safeParse(accountInput("1.23456")).success,
    ).toBe(false);
  });
});
