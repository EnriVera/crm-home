import { describe, expect, test } from "bun:test";
import {
  createTaskInputSchema,
  taskDueDateSchema,
  updateTaskInputSchema,
} from "./contracts";

/**
 * El vencimiento es un instante O `null`. El `null` tiene que sobrevivir
 * el contrato: con `z.union([z.coerce.date(), z.null()])` el `null` se
 * perdía dentro del `coerce` (que lo volvía el epoch) y quitar el
 * vencimiento desde el frontend dejaba la tarea fechada en 1970 —o sea,
 * vencida.
 */
describe("vencimiento de tarea", () => {
  test("null se mantiene null (no se convierte en epoch)", () => {
    expect(taskDueDateSchema.parse(null)).toBeNull();
  });

  test("una fecha ISO se convierte a Date", () => {
    const parsed = taskDueDateSchema.parse("2026-12-25T10:00:00.000Z");
    expect(parsed).toBeInstanceOf(Date);
    expect(parsed!.getTime()).toBe(
      new Date("2026-12-25T10:00:00.000Z").getTime(),
    );
  });

  test("create acepta null para dejar la tarea sin fecha", () => {
    const parsed = createTaskInputSchema.parse({
      task_title: "Sin fecha",
      task_due_date: null,
    });
    expect(parsed.task_due_date).toBeNull();
  });

  test("update acepta null para QUITAR el vencimiento", () => {
    const parsed = updateTaskInputSchema.parse({
      task_id: "11111111-1111-4111-8111-111111111111",
      task_due_date: null,
    });
    expect(parsed.task_due_date).toBeNull();
  });

  test("update sin task_due_date lo deja ausente (no lo inventa)", () => {
    const parsed = updateTaskInputSchema.parse({
      task_id: "11111111-1111-4111-8111-111111111111",
    });
    expect(parsed.task_due_date).toBeUndefined();
  });
});
