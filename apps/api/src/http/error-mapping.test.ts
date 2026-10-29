import { describe, expect, test } from "bun:test";
import { HTTPError } from "h3";
import {
  InvalidKanbanOrder,
  InvalidStateTransition,
  TaskNotFound,
  TaskStateNotFound,
} from "../application/tasks/errors";
import { ClientNotFound, InvalidClientInput } from "../application/clients/errors";
import { InvalidTimerInput, TimerNotFound } from "../application/timers/errors";
import { TimerAlreadyRunningError } from "../domain/timers/errors";
import { Unauthorized } from "../domain/errors";
import { mapDomainErrorToStatus } from "./error-mapping";

describe("mapDomainErrorToStatus", () => {
  test("TaskNotFound → 404 con code TASK_NOT_FOUND", () => {
    const r = mapDomainErrorToStatus(new TaskNotFound());
    expect(r.status).toBe(404);
    expect(r.body.code).toBe("TASK_NOT_FOUND");
  });

  test("TaskStateNotFound → 404", () => {
    const r = mapDomainErrorToStatus(new TaskStateNotFound());
    expect(r.status).toBe(404);
    expect(r.body.code).toBe("TASK_STATE_NOT_FOUND");
  });

  test("InvalidKanbanOrder → 409", () => {
    const r = mapDomainErrorToStatus(new InvalidKanbanOrder());
    expect(r.status).toBe(409);
    expect(r.body.code).toBe("INVALID_KANBAN_ORDER");
  });

  test("InvalidStateTransition → 409", () => {
    const r = mapDomainErrorToStatus(new InvalidStateTransition());
    expect(r.status).toBe(409);
    expect(r.body.code).toBe("INVALID_STATE_TRANSITION");
  });

  test("Unauthorized → 401", () => {
    const r = mapDomainErrorToStatus(new Unauthorized());
    expect(r.status).toBe(401);
    expect(r.body.code).toBe("UNAUTHORIZED");
  });

  test("ClientNotFound → 404 (no cae en el 500 genérico)", () => {
    const r = mapDomainErrorToStatus(new ClientNotFound());
    expect(r.status).toBe(404);
    expect(r.body.code).toBe("CLIENT_NOT_FOUND");
  });

  test("InvalidClientInput → 400", () => {
    const r = mapDomainErrorToStatus(new InvalidClientInput());
    expect(r.status).toBe(400);
    expect(r.body.code).toBe("INVALID_CLIENT_INPUT");
  });

  test("TimerNotFound → 404 y InvalidTimerInput → 400", () => {
    expect(mapDomainErrorToStatus(new TimerNotFound()).status).toBe(404);
    expect(
      mapDomainErrorToStatus(new InvalidTimerInput("título inválido")).status,
    ).toBe(400);
  });

  test("TimerAlreadyRunningError → 409", () => {
    const r = mapDomainErrorToStatus(new TimerAlreadyRunningError());
    expect(r.status).toBe(409);
    expect(r.body.code).toBe("TIMER_ALREADY_RUNNING");
  });

  test("validación de zod (h3) → 400 VALIDATION_ERROR", () => {
    const r = mapDomainErrorToStatus(
      new HTTPError({ status: 400, statusMessage: "Bad Request" }),
    );
    expect(r.status).toBe(400);
    expect(r.body.code).toBe("VALIDATION_ERROR");
  });

  test("Unknown error → 500 INTERNAL_ERROR", () => {
    const r = mapDomainErrorToStatus(new Error("boom"));
    expect(r.status).toBe(500);
    expect(r.body.code).toBe("INTERNAL_ERROR");
  });
});
