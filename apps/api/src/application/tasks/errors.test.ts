import { describe, expect, test } from "bun:test";
import {
  InvalidKanbanOrder,
  InvalidStateTransition,
  TaskDomainError,
  TaskNotFound,
  TaskStateNotFound,
  Unauthorized,
} from "./errors";

describe("tasks errors", () => {
  test("TaskNotFound es Error, TaskDomainError y expone code 'TASK_NOT_FOUND'", () => {
    const err = new TaskNotFound();
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(TaskDomainError);
    expect(err.code).toBe("TASK_NOT_FOUND");
    expect(err.name).toBe("TaskNotFound");
  });

  test("TaskStateNotFound expone code 'TASK_STATE_NOT_FOUND'", () => {
    const err = new TaskStateNotFound();
    expect(err).toBeInstanceOf(TaskDomainError);
    expect(err.code).toBe("TASK_STATE_NOT_FOUND");
  });

  test("InvalidKanbanOrder expone code 'INVALID_KANBAN_ORDER'", () => {
    const err = new InvalidKanbanOrder("gap negativo");
    expect(err).toBeInstanceOf(TaskDomainError);
    expect(err.code).toBe("INVALID_KANBAN_ORDER");
    expect(err.message).toBe("gap negativo");
  });

  test("InvalidStateTransition expone code 'INVALID_STATE_TRANSITION'", () => {
    const err = new InvalidStateTransition();
    expect(err).toBeInstanceOf(TaskDomainError);
    expect(err.code).toBe("INVALID_STATE_TRANSITION");
  });

  test("Unauthorized expone code 'UNAUTHORIZED'", () => {
    const err = new Unauthorized();
    expect(err).toBeInstanceOf(TaskDomainError);
    expect(err.code).toBe("UNAUTHORIZED");
  });
});
