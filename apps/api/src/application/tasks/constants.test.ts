import { describe, expect, test } from "bun:test";
import {
  KANBAN_DEFAULT_STEP,
  KANBAN_GAP_REBALANCE_THRESHOLD,
  TASK_DESCRIPTION_MAX,
  TASK_TITLE_MAX,
} from "./constants";

describe("tasks constants", () => {
  test("KANBAN_DEFAULT_STEP es 1024", () => {
    expect(KANBAN_DEFAULT_STEP).toBe(1024);
  });

  test("KANBAN_GAP_REBALANCE_THRESHOLD es 1e-6", () => {
    expect(KANBAN_GAP_REBALANCE_THRESHOLD).toBe(1e-6);
  });

  test("TASK_TITLE_MAX es 200", () => {
    expect(TASK_TITLE_MAX).toBe(200);
  });

  test("TASK_DESCRIPTION_MAX es 50_000", () => {
    expect(TASK_DESCRIPTION_MAX).toBe(50_000);
  });
});
