import { describe, expect, test } from "bun:test";
import {
  mapTaskEntityToFormInput,
  mapFormInputToTaskEntity,
  resetCategoryIfIncompatible,
  type TaskEntity,
  type TaskFormInput,
} from "./tasks-form";

const baseEntity: TaskEntity = {
  task_id: "t-1",
  task_title: "Mi tarea",
  task_description: "Detalle",
  task_clie_id: "client-1",
  task_type_id: "type-1",
  task_cate_id: "cat-1",
  task_tast_id: "state-1",
};

describe("mapTaskEntityToFormInput", () => {
  test("convierte snake_case → camelCase", () => {
    const form = mapTaskEntityToFormInput(baseEntity);
    expect(form).toEqual({
      title: "Mi tarea",
      description: "Detalle",
      clientId: "client-1",
      typeId: "type-1",
      categoryId: "cat-1",
      stateId: "state-1",
    });
  });

  test("preserva nulls", () => {
    const form = mapTaskEntityToFormInput({
      ...baseEntity,
      task_description: null,
      task_clie_id: null,
      task_cate_id: null,
    });
    expect(form.description).toBeNull();
    expect(form.clientId).toBeNull();
    expect(form.categoryId).toBeNull();
  });
});

describe("mapFormInputToTaskEntity (round-trip)", () => {
  test("round-trip entity → form → entity preserva todos los campos", () => {
    const form = mapTaskEntityToFormInput(baseEntity);
    const back = mapFormInputToTaskEntity(form);
    expect(back).toEqual({
      task_title: baseEntity.task_title,
      task_description: baseEntity.task_description,
      task_clie_id: baseEntity.task_clie_id,
      task_type_id: baseEntity.task_type_id,
      task_cate_id: baseEntity.task_cate_id,
      task_tast_id: baseEntity.task_tast_id,
    });
  });
});

describe("resetCategoryIfIncompatible", () => {
  const availableFor = (params: { clientId: string | null; typeId: string }) =>
    params.clientId === "client-1" && params.typeId === "type-1"
      ? ["cat-1", "cat-2"]
      : ["cat-99"]; // otro par → categorías distintas

  test("preserva la categoría si el par (cliente, tipo) no cambió y la categoría sigue siendo válida", () => {
    const form: TaskFormInput = {
      title: "T",
      description: null,
      clientId: "client-1",
      typeId: "type-1",
      categoryId: "cat-1",
      stateId: "state-1",
    };
    const next = resetCategoryIfIncompatible(
      form,
      "client-1",
      "type-1",
      availableFor,
    );
    expect(next.categoryId).toBe("cat-1");
  });

  test("resetea la categoría a null cuando el cliente cambió", () => {
    const form: TaskFormInput = {
      title: "T",
      description: null,
      clientId: "client-1",
      typeId: "type-1",
      categoryId: "cat-1",
      stateId: "state-1",
    };
    const next = resetCategoryIfIncompatible(
      form,
      "client-2",
      "type-1",
      availableFor,
    );
    expect(next.categoryId).toBeNull();
  });

  test("resetea la categoría a null cuando el tipo cambió", () => {
    const form: TaskFormInput = {
      title: "T",
      description: null,
      clientId: "client-1",
      typeId: "type-1",
      categoryId: "cat-1",
      stateId: "state-1",
    };
    const next = resetCategoryIfIncompatible(
      form,
      "client-1",
      "type-2",
      availableFor,
    );
    expect(next.categoryId).toBeNull();
  });

  test("no-op si categoryId ya es null", () => {
    const form: TaskFormInput = {
      title: "T",
      description: null,
      clientId: null,
      typeId: "type-1",
      categoryId: null,
      stateId: "state-1",
    };
    const next = resetCategoryIfIncompatible(
      form,
      "client-99",
      "type-99",
      availableFor,
    );
    expect(next).toBe(form);
  });
});
