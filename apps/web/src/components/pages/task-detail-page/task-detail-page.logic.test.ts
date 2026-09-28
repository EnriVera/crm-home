import { describe, expect, test } from "bun:test";
import {
  buildRemoveParams,
  closeDeleteConfirmation,
  editUrl,
  initialDeleteConfirmationState,
  openDeleteConfirmation,
  TASKS_LIST_PATH,
} from "./task-detail-page.logic";

describe("editUrl", () => {
  test("construye URL con ?edit=true", () => {
    expect(editUrl("t-1")).toBe("/tasks/t-1?edit=true");
  });
});

describe("TASKS_LIST_PATH", () => {
  test("constante apunta a /tasks", () => {
    expect(TASKS_LIST_PATH).toBe("/tasks");
  });
});

describe("delete confirmation state machine", () => {
  test("initial: visible=false, taskId=null", () => {
    const s = initialDeleteConfirmationState();
    expect(s.visible).toBe(false);
    expect(s.taskId).toBeNull();
  });

  test("open(taskId) → visible=true, taskId=taskId", () => {
    const s = openDeleteConfirmation("t-42");
    expect(s.visible).toBe(true);
    expect(s.taskId).toBe("t-42");
  });

  test("close() → visible=false, taskId=null", () => {
    const closed = closeDeleteConfirmation();
    expect(closed.visible).toBe(false);
    expect(closed.taskId).toBeNull();
  });
});

describe("buildRemoveParams", () => {
  test("construye params con taskId y userId", () => {
    expect(buildRemoveParams("t-1", "u-1")).toEqual({
      taskId: "t-1",
      userId: "u-1",
    });
  });

  test("lanza error si taskId es vacío", () => {
    expect(() => buildRemoveParams("", "u-1")).toThrow();
  });

  test("lanza error si userId es vacío", () => {
    expect(() => buildRemoveParams("t-1", "")).toThrow();
  });
});
