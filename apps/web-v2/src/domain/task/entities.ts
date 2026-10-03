import {
 Task,
 TaskState,
 TaskInput,
 TaskPatch,
 TaskPage,
 TaskMoved,
} from "@crm/contract/task";
import { domainError, type DomainError } from "../shared/errors";
import { err, ok, type Result } from "../shared/result";

export type { Task, TaskState, TaskInput, TaskPatch, TaskPage, TaskMoved };

/**
 * Invariant: a task with a category must also have a type (PRD-v2 §8.3).
 * Returns a DomainError if violated; callers should map it to a form
 * validation error before persisting.
 */
export const validateCategoryRequiresType = (
 input: Pick<TaskInput, "typeId" | "categoryId">,
): Result<true, DomainError> => {
 if (input.categoryId && !input.typeId) {
  return err(
   domainError("validation", "A category requires a type.", {
    field: "categoryId",
   }),
  );
 }
 return ok(true);
};
