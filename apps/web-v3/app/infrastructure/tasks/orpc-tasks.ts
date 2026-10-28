/**
 * Task adapter: the only place that talks to the API about tasks.
 *
 * The API speaks snake_case on the wire (the `task` / `task_state` tables) and
 * the domain speaks camelCase, so the mapping lives here and nowhere else
 * (PRD-v4 §11.4). The UI never sees a wire shape.
 */
import type { TaskStateWire, TaskWire } from "@crm/contract/task";
import type { TaskState, TaskSummary } from "~/domain/task/dashboard";
import { callTasks } from "~/shared/vendor/orpc";

function toTaskState(wire: TaskStateWire): TaskState {
  return {
    id: wire.tast_id,
    name: wire.tast_name,
    order: wire.tast_order,
  };
}

function toTaskSummary(wire: TaskWire): TaskSummary {
  return {
    id: wire.task_id,
    title: wire.task_title,
    stateId: wire.task_tast_id,
    updatedAt: new Date(wire.task_updated_at),
  };
}

/** Every task of the authenticated user, ordered by kanban position. */
export async function listTasks(): Promise<TaskSummary[]> {
  const wire = await callTasks("list", {});
  return wire.map(toTaskSummary);
}

/** The task columns of the authenticated user. */
export async function listTaskStates(): Promise<TaskState[]> {
  const wire = await callTasks("states.list", undefined);
  return wire.map(toTaskState);
}
