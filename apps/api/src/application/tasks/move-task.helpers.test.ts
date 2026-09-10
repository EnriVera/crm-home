import { describe, expect, test } from "bun:test";
import { KANBAN_DEFAULT_STEP } from "./constants";
import {
  appendOrder,
  computeInsertOrder,
  prependOrder,
  rebalanceColumn,
  shouldRebalance,
} from "./move-task.helpers";

describe("computeInsertOrder", () => {
  test("devuelve el midpoint entre dos órdenes", () => {
    expect(computeInsertOrder(1024, 2048)).toBe(1536);
  });

  test("devuelve el midpoint con gap decimal", () => {
    expect(computeInsertOrder(1024, 1024.5)).toBeCloseTo(1024.25, 10);
  });
});

describe("shouldRebalance", () => {
  test("gap menor al umbral dispara rebalance", () => {
    expect(shouldRebalance(5e-7)).toBe(true);
  });

  test("gap mayor o igual al umbral NO dispara rebalance", () => {
    expect(shouldRebalance(1e-5)).toBe(false);
    expect(shouldRebalance(0.5)).toBe(false);
  });
});

describe("rebalanceColumn", () => {
  test("re-asigna órdenes a múltiplos de KANBAN_DEFAULT_STEP preservando orden relativo", () => {
    const result = rebalanceColumn([
      { id: "a", order: 1024 },
      { id: "b", order: 1024.0000005 },
    ]);
    expect(result).toEqual([
      { id: "a", order: 1024 },
      { id: "b", order: 1024 + KANBAN_DEFAULT_STEP },
    ]);
  });

  test("lista vacía devuelve lista vacía", () => {
    expect(rebalanceColumn([])).toEqual([]);
  });
});

describe("appendOrder", () => {
  test("lista vacía devuelve KANBAN_DEFAULT_STEP", () => {
    expect(appendOrder([])).toBe(KANBAN_DEFAULT_STEP);
  });

  test("lista no-vacía devuelve max + KANBAN_DEFAULT_STEP", () => {
    expect(appendOrder([{ order: 4096 }])).toBe(5120);
  });

  test("toma el máximo cuando hay gaps negativos por rebalance", () => {
    expect(appendOrder([{ order: 100 }, { order: 500 }, { order: 200 }])).toBe(
      500 + KANBAN_DEFAULT_STEP,
    );
  });
});

describe("prependOrder", () => {
  test("lista vacía devuelve KANBAN_DEFAULT_STEP", () => {
    expect(prependOrder([])).toBe(KANBAN_DEFAULT_STEP);
  });

  test("lista no-vacía devuelve (min - KANBAN_DEFAULT_STEP) / 2 para preservar gap positivo", () => {
    // Spec: prepend deja (min - step) / 2 para mantener siempre gap positivo.
    expect(prependOrder([{ order: 1024 }])).toBe(512);
  });

  test("mínimo estable con múltiples entradas", () => {
    expect(prependOrder([{ order: 5000 }, { order: 3000 }, { order: 8000 }]))
      .toBe(3000 / 2);
  });
});
