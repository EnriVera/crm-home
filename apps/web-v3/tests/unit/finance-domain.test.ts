import { describe, expect, it } from "vitest";
import {
  accountColor,
  averageAmount,
  countOfMonth,
  distinctCategories,
  formatAmount,
  formatDateShort,
  formatMoney,
  todayWireDate,
  totalOfMonth,
  type Income,
} from "~/domain/finance/entities";

function income(overrides: Partial<Income> = {}): Income {
  return {
    id: "inc-1",
    accountId: "acco-1",
    amount: 100,
    currencyId: "curr-1",
    description: "Factura #1",
    category: null,
    date: "2026-06-28",
    createdAt: new Date("2026-06-28T12:00:00Z"),
    ...overrides,
  };
}

describe("finance domain", () => {
  it("formatea el monto sin decimales (el formato del catálogo)", () => {
    expect(formatAmount(1840000)).toBe("1.840.000");
    expect(formatMoney(250, "$")).toBe("$ 250");
  });

  it("formatea la fecha corta de las tablas", () => {
    expect(formatDateShort("2026-06-28")).toBe("28 jun");
  });

  it("no tira con una fecha vacía", () => {
    expect(() => formatDateShort("")).not.toThrow();
  });

  it("devuelve el día de hoy en el formato del wire", () => {
    expect(todayWireDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("suma y cuenta sólo los ingresos del mes corriente", () => {
    const thisMonth = todayWireDate();
    const incomes = [
      income({ id: "a", amount: 100, date: thisMonth }),
      income({ id: "b", amount: 50, date: thisMonth }),
      income({ id: "c", amount: 999, date: "2020-01-15" }),
    ];
    expect(totalOfMonth(incomes)).toBe(150);
    expect(countOfMonth(incomes)).toBe(2);
  });

  it("calcula el ticket promedio y devuelve 0 sin ingresos", () => {
    expect(averageAmount([income({ amount: 100 }), income({ amount: 300 })])).toBe(200);
    expect(averageAmount([])).toBe(0);
  });

  it("lista las categorías distintas sin repetidos", () => {
    const incomes = [
      income({ id: "a", category: "Software" }),
      income({ id: "b", category: "Software" }),
      income({ id: "c", category: null }),
      income({ id: "d", category: "Marketing" }),
    ];
    expect(distinctCategories(incomes)).toEqual(["Marketing", "Software"]);
  });

  it("usa el gris de la paleta cuando la cuenta no tiene color", () => {
    const account = {
      id: "a",
      name: "Efectivo",
      icon: null,
      color: null,
      currencyId: "c",
      initialAmount: 0,
      balance: 0,
      createdAt: new Date(),
    };
    expect(accountColor(account)).toBe("#64748b");
    expect(accountColor({ ...account, color: "#3b82f6" })).toBe("#3b82f6");
  });
});
