import { describe, expect, test } from "bun:test";
import { moveItem, sortByOrder } from "./tasks-kanban";

describe("sortByOrder", () => {
  test("ordena ascendente por order", () => {
    const rows = [
      { id: "c", order: 4096 },
      { id: "a", order: 1024 },
      { id: "b", order: 2048 },
    ];
    const sorted = sortByOrder(rows);
    expect(sorted.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  test("no muta el array original", () => {
    const original = [
      { id: "b", order: 2048 },
      { id: "a", order: 1024 },
    ];
    const sorted = sortByOrder(original);
    expect(original.map((r) => r.id)).toEqual(["b", "a"]);
    expect(sorted.map((r) => r.id)).toEqual(["a", "b"]);
  });
});

describe("moveItem", () => {
  test("reordena y reasigna order con gaps de 1024", () => {
    const rows = [
      { id: "a", order: 1024 },
      { id: "b", order: 2048 },
      { id: "c", order: 3072 },
      { id: "d", order: 4096 },
    ];
    const next = moveItem(rows, "a", 3);
    expect(next.map((r) => r.id)).toEqual(["b", "c", "d", "a"]);
    expect(next.map((r) => r.order)).toEqual([1024, 2048, 3072, 4096]);
  });

  test("mover al inicio", () => {
    const rows = [
      { id: "a", order: 1024 },
      { id: "b", order: 2048 },
      { id: "c", order: 3072 },
    ];
    const next = moveItem(rows, "c", 0);
    expect(next.map((r) => r.id)).toEqual(["c", "a", "b"]);
  });

  test("no muta si fromId no existe", () => {
    const rows = [
      { id: "a", order: 1024 },
      { id: "b", order: 2048 },
    ];
    const next = moveItem(rows, "ghost", 0);
    expect(next).toBe(rows);
  });
});
