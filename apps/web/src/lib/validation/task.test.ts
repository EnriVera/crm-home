import { describe, expect, test } from "bun:test";
import {
  taskTitleRequired,
  taskDescriptionLength,
  TASK_TITLE_MAX,
  TASK_DESCRIPTION_MAX,
} from "./task";

describe("taskTitleRequired", () => {
  test("devuelve null cuando el título es válido", () => {
    expect(taskTitleRequired("Mi tarea")).toBeNull();
  });

  test('devuelve "tasks.form.titleRequired" cuando el título está vacío', () => {
    expect(taskTitleRequired("")).toBe("tasks.form.titleRequired");
  });

  test('devuelve "tasks.form.titleRequired" cuando el título es solo espacios', () => {
    expect(taskTitleRequired("   ")).toBe("tasks.form.titleRequired");
  });

  test("devuelve null cuando el título tiene exactamente 200 caracteres", () => {
    const title = "x".repeat(TASK_TITLE_MAX);
    expect(taskTitleRequired(title)).toBeNull();
  });

  test('devuelve "tasks.form.titleTooLong" cuando excede 200 caracteres', () => {
    const title = "x".repeat(TASK_TITLE_MAX + 1);
    expect(taskTitleRequired(title)).toBe("tasks.form.titleTooLong");
  });
});

describe("taskDescriptionLength", () => {
  test("devuelve null cuando la descripción es null", () => {
    expect(taskDescriptionLength(null)).toBeNull();
  });

  test("devuelve null cuando la descripción es válida", () => {
    expect(taskDescriptionLength("Algún detalle")).toBeNull();
  });

  test("devuelve null cuando la descripción tiene exactamente 50_000 caracteres", () => {
    expect(taskDescriptionLength("x".repeat(TASK_DESCRIPTION_MAX))).toBeNull();
  });

  test('devuelve "tasks.form.descriptionTooLong" cuando excede 50_000 caracteres', () => {
    expect(taskDescriptionLength("x".repeat(TASK_DESCRIPTION_MAX + 1))).toBe(
      "tasks.form.descriptionTooLong",
    );
  });
});
