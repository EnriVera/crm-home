import { describe, expect, test } from "bun:test";
import {
  createTaskInputSchema,
  createTaskOutputSchema,
  createTaskStateInputSchema,
  deleteTaskInputSchema,
  deleteTaskOutputSchema,
  getTaskInputSchema,
  kanbanOrderSchema,
  listClientsSearchInputSchema,
  listClientsSearchOutputSchema,
  listTaskStatesOutputSchema,
  listTasksInputSchema,
  listTasksOutputSchema,
  moveTaskInputSchema,
  moveTaskOutputSchema,
  reorderTaskStatesInputSchema,
  taskDescriptionSchema,
  taskSchema,
  taskStateSchema,
  taskStateTitleSchema,
  tasksContract,
  tastOrderSchema,
  taskTitleSchema,
  updateTaskInputSchema,
  updateTaskOutputSchema,
} from "./tasks";
import {
  categoryForFormSchema,
  listCategoriesByTypeInputSchema,
  listCategoriesByTypeOutputSchema,
  listClientsSearchInputSchema as lookupsListClientsSearchInputSchema,
  listClientsSearchOutputSchema as lookupsListClientsSearchOutputSchema,
  listTypesForFormInputSchema,
  listTypesForFormOutputSchema,
  typeForFormSchema,
} from "./lookups";

describe("taskTitleSchema", () => {
  test("rechaza string vacío", () => {
    expect(taskTitleSchema.safeParse("").success).toBe(false);
  });

  test("acepta exactamente 200 chars", () => {
    expect(taskTitleSchema.safeParse("x".repeat(200)).success).toBe(true);
  });

  test("rechaza 201 chars", () => {
    expect(taskTitleSchema.safeParse("x".repeat(201)).success).toBe(false);
  });
});

describe("taskDescriptionSchema", () => {
  test("acepta null", () => {
    expect(taskDescriptionSchema.safeParse(null).success).toBe(true);
  });

  test("acepta 50_000 chars", () => {
    expect(taskDescriptionSchema.safeParse("x".repeat(50_000)).success).toBe(true);
  });

  test("rechaza 50_001 chars", () => {
    expect(taskDescriptionSchema.safeParse("x".repeat(50_001)).success).toBe(false);
  });
});

describe("kanbanOrderSchema", () => {
  test("rechaza NaN", () => {
    expect(kanbanOrderSchema.safeParse(Number.NaN).success).toBe(false);
  });

  test("rechaza Infinity", () => {
    expect(kanbanOrderSchema.safeParse(Number.POSITIVE_INFINITY).success).toBe(false);
  });

  test("acepta número finito positivo", () => {
    expect(kanbanOrderSchema.safeParse(1024).success).toBe(true);
  });

  test("acepta número finito negativo (orden estable half-step)", () => {
    expect(kanbanOrderSchema.safeParse(-512).success).toBe(true);
  });

  test("acepta 0", () => {
    expect(kanbanOrderSchema.safeParse(0).success).toBe(true);
  });
});

describe("taskStateTitleSchema", () => {
  test("rechaza string vacío", () => {
    expect(taskStateTitleSchema.safeParse("").success).toBe(false);
  });

  test("acepta exactamente 50 chars", () => {
    expect(taskStateTitleSchema.safeParse("x".repeat(50)).success).toBe(true);
  });

  test("rechaza 51 chars", () => {
    expect(taskStateTitleSchema.safeParse("x".repeat(51)).success).toBe(false);
  });
});

describe("tastOrderSchema", () => {
  test("rechaza -1", () => {
    expect(tastOrderSchema.safeParse(-1).success).toBe(false);
  });

  test("rechaza 2.5 (no entero)", () => {
    expect(tastOrderSchema.safeParse(2.5).success).toBe(false);
  });

  test("acepta 0", () => {
    expect(tastOrderSchema.safeParse(0).success).toBe(true);
  });

  test("acepta 5", () => {
    expect(tastOrderSchema.safeParse(5).success).toBe(true);
  });

  test("acepta 1000", () => {
    expect(tastOrderSchema.safeParse(1000).success).toBe(true);
  });
});

describe("moveTaskInputSchema", () => {
  test("falla si falta target_state_id", () => {
    const result = moveTaskInputSchema.safeParse({
      task_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(false);
  });

  test("acepta solo task_id y target_state_id", () => {
    const result = moveTaskInputSchema.safeParse({
      task_id: "550e8400-e29b-41d4-a716-446655440000",
      target_state_id: "550e8400-e29b-41d4-a716-446655440001",
    });
    expect(result.success).toBe(true);
  });

  test("acepta con prev/next opcionales", () => {
    const result = moveTaskInputSchema.safeParse({
      task_id: "550e8400-e29b-41d4-a716-446655440000",
      target_state_id: "550e8400-e29b-41d4-a716-446655440001",
      prev_task_id: "550e8400-e29b-41d4-a716-446655440002",
      next_task_id: "550e8400-e29b-41d4-a716-446655440003",
    });
    expect(result.success).toBe(true);
  });
});

describe("listClientsSearchInputSchema (tasks contract)", () => {
  test("falla con query vacío", () => {
    expect(listClientsSearchInputSchema.safeParse({ query: "" }).success).toBe(false);
  });

  test("acepta limit 50", () => {
    expect(
      listClientsSearchInputSchema.safeParse({ query: "acme", limit: 50 }).success,
    ).toBe(true);
  });

  test("falla con limit 51", () => {
    expect(
      listClientsSearchInputSchema.safeParse({ query: "acme", limit: 51 }).success,
    ).toBe(false);
  });

  test("acepta sin limit (default 20)", () => {
    const result = listClientsSearchInputSchema.safeParse({ query: "acme" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
    }
  });
});

describe("lookups listClientsSearchInputSchema (re-exportado)", () => {
  test("falla con query vacío", () => {
    expect(lookupsListClientsSearchInputSchema.safeParse({ query: "" }).success).toBe(false);
  });

  test("acepta con limit 50", () => {
    expect(
      lookupsListClientsSearchInputSchema.safeParse({ query: "x", limit: 50 }).success,
    ).toBe(true);
  });

  test("acepta sin limit (default 20)", () => {
    const result = lookupsListClientsSearchInputSchema.safeParse({ query: "x" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
    }
  });
});

describe("lookups listClientsSearchOutputSchema", () => {
  test("acepta array vacío", () => {
    expect(lookupsListClientsSearchOutputSchema.safeParse([]).success).toBe(true);
  });
});

describe("listClientsSearchOutputSchema (tasks contract)", () => {
  test("acepta array vacío", () => {
    expect(listClientsSearchOutputSchema.safeParse([]).success).toBe(true);
  });
});

describe("round-trip de outputs", () => {
  test("listTasksOutputSchema acepta Task[]", () => {
    const task = {
      task_id: "550e8400-e29b-41d4-a716-446655440000",
      task_title: "Hacer algo",
      task_description: "Detalle",
      task_tast_id: "550e8400-e29b-41d4-a716-446655440001",
      task_type_id: null,
      task_cate_id: null,
      task_clie_id: null,
      task_kanban_order: 1024,
      task_created_at: new Date(),
      task_updated_at: new Date(),
    };
    const result = listTasksOutputSchema.safeParse([task]);
    expect(result.success).toBe(true);
  });

  test("createTaskInputSchema acepta input mínimo", () => {
    const result = createTaskInputSchema.safeParse({
      task_title: "Nueva task",
    });
    expect(result.success).toBe(true);
  });

  test("createTaskOutputSchema devuelve Task", () => {
    const result = createTaskOutputSchema.safeParse({
      task_id: "550e8400-e29b-41d4-a716-446655440000",
      task_title: "X",
      task_description: null,
      task_tast_id: "550e8400-e29b-41d4-a716-446655440001",
      task_type_id: null,
      task_cate_id: null,
      task_clie_id: null,
      task_kanban_order: 1024,
      task_created_at: new Date(),
      task_updated_at: new Date(),
    });
    expect(result.success).toBe(true);
  });

  test("updateTaskInputSchema acepta campos parciales", () => {
    const result = updateTaskInputSchema.safeParse({
      task_id: "550e8400-e29b-41d4-a716-446655440000",
      task_title: "Nuevo título",
    });
    expect(result.success).toBe(true);
  });

  test("updateTaskOutputSchema devuelve Task", () => {
    const result = updateTaskOutputSchema.safeParse({
      task_id: "550e8400-e29b-41d4-a716-446655440000",
      task_title: "X",
      task_description: null,
      task_tast_id: "550e8400-e29b-41d4-a716-446655440001",
      task_type_id: null,
      task_cate_id: null,
      task_clie_id: null,
      task_kanban_order: 1024,
      task_created_at: new Date(),
      task_updated_at: new Date(),
    });
    expect(result.success).toBe(true);
  });

  test("moveTaskOutputSchema devuelve Task actualizado", () => {
    const result = moveTaskOutputSchema.safeParse({
      task_id: "550e8400-e29b-41d4-a716-446655440000",
      task_title: "X",
      task_description: null,
      task_tast_id: "550e8400-e29b-41d4-a716-446655440002",
      task_type_id: null,
      task_cate_id: null,
      task_clie_id: null,
      task_kanban_order: 2560,
      task_created_at: new Date(),
      task_updated_at: new Date(),
    });
    expect(result.success).toBe(true);
  });
});

describe("deleteTask schemas", () => {
  test("deleteTaskInputSchema requiere task_id", () => {
    expect(deleteTaskInputSchema.safeParse({}).success).toBe(false);
  });

  test("deleteTaskOutputSchema es { ok: true }", () => {
    expect(deleteTaskOutputSchema.safeParse({ ok: true }).success).toBe(true);
  });
});

describe("getTaskInputSchema", () => {
  test("requiere task_id", () => {
    expect(getTaskInputSchema.safeParse({}).success).toBe(false);
  });
});

describe("listTasksInputSchema", () => {
  test("sin search es válido", () => {
    expect(listTasksInputSchema.safeParse({}).success).toBe(true);
  });

  test("con search es válido", () => {
    expect(listTasksInputSchema.safeParse({ search: "fact" }).success).toBe(true);
  });
});

describe("listTaskStatesOutputSchema", () => {
  test("acepta array de TaskState", () => {
    const result = listTaskStatesOutputSchema.safeParse([
      {
        tast_id: "550e8400-e29b-41d4-a716-446655440000",
        tast_name: "Pendiente",
        tast_order: 0,
      },
    ]);
    expect(result.success).toBe(true);
  });
});

describe("createTaskStateInputSchema", () => {
  test("acepta nombre + order", () => {
    expect(
      createTaskStateInputSchema.safeParse({
        tast_name: "Pendiente",
        tast_order: 0,
      }).success,
    ).toBe(true);
  });
});

describe("reorderTaskStatesInputSchema", () => {
  test("falla con array vacío", () => {
    expect(reorderTaskStatesInputSchema.safeParse([]).success).toBe(false);
  });

  test("acepta 1 elemento", () => {
    expect(
      reorderTaskStatesInputSchema.safeParse([
        { tast_id: "550e8400-e29b-41d4-a716-446655440000", tast_order: 0 },
      ]).success,
    ).toBe(true);
  });
});

describe("typeForFormSchema", () => {
  test("acepta type_id + type_name", () => {
    expect(
      typeForFormSchema.safeParse({
        type_id: "550e8400-e29b-41d4-a716-446655440000",
        type_name: "Tarea",
      }).success,
    ).toBe(true);
  });
});

describe("categoryForFormSchema", () => {
  test("acepta cate_id + cate_name", () => {
    expect(
      categoryForFormSchema.safeParse({
        cate_id: "550e8400-e29b-41d4-a716-446655440000",
        cate_name: "Cat",
      }).success,
    ).toBe(true);
  });
});

describe("listTypesForForm schemas", () => {
  test("input vacío es válido", () => {
    expect(listTypesForFormInputSchema.safeParse({}).success).toBe(true);
  });

  test("output acepta array de TypeForForm", () => {
    const result = listTypesForFormOutputSchema.safeParse([
      { type_id: "550e8400-e29b-41d4-a716-446655440000", type_name: "Tarea" },
    ]);
    expect(result.success).toBe(true);
  });
});

describe("listCategoriesByType schemas", () => {
  test("input requiere type_id", () => {
    expect(listCategoriesByTypeInputSchema.safeParse({}).success).toBe(false);
  });

  test("output acepta array de CategoryForForm", () => {
    const result = listCategoriesByTypeOutputSchema.safeParse([
      { cate_id: "550e8400-e29b-41d4-a716-446655440000", cate_name: "X" },
    ]);
    expect(result.success).toBe(true);
  });
});

describe("taskSchema", () => {
  test("representa una task completa", () => {
    const task = {
      task_id: "550e8400-e29b-41d4-a716-446655440000",
      task_title: "Hacer algo",
      task_description: null,
      task_tast_id: "550e8400-e29b-41d4-a716-446655440001",
      task_type_id: null,
      task_cate_id: null,
      task_clie_id: null,
      task_kanban_order: 1024,
      task_created_at: new Date(),
      task_updated_at: new Date(),
    };
    expect(taskSchema.safeParse(task).success).toBe(true);
  });
});

describe("taskStateSchema", () => {
  test("representa un estado", () => {
    const state = {
      tast_id: "550e8400-e29b-41d4-a716-446655440000",
      tast_name: "Pendiente",
      tast_order: 0,
    };
    expect(taskStateSchema.safeParse(state).success).toBe(true);
  });
});

describe("tareas contract: router shape", () => {
  test("expone list, get, create, update, move, remove", () => {
    expect(tasksContract.list).toBeDefined();
    expect(tasksContract.get).toBeDefined();
    expect(tasksContract.create).toBeDefined();
    expect(tasksContract.update).toBeDefined();
    expect(tasksContract.move).toBeDefined();
    expect(tasksContract.remove).toBeDefined();
  });

  test("expone states.list/create/update/remove/reorder", () => {
    expect(tasksContract.states.list).toBeDefined();
    expect(tasksContract.states.create).toBeDefined();
    expect(tasksContract.states.update).toBeDefined();
    expect(tasksContract.states.remove).toBeDefined();
    expect(tasksContract.states.reorder).toBeDefined();
  });

  test("expone clients.search", () => {
    expect(tasksContract.clients.search).toBeDefined();
  });

  test("list, get, create, update, move, remove tienen prefijo /tasks", () => {
    expect(tasksContract.list["~orpc"].route.path).toBe("/tasks/list");
    expect(tasksContract.get["~orpc"].route.path).toBe("/tasks/get");
    expect(tasksContract.create["~orpc"].route.path).toBe("/tasks/create");
    expect(tasksContract.update["~orpc"].route.path).toBe("/tasks/update");
    expect(tasksContract.move["~orpc"].route.path).toBe("/tasks/move");
    expect(tasksContract.remove["~orpc"].route.path).toBe("/tasks/remove");
  });

  test("states.* llevan prefijo /tasks/states/...", () => {
    expect(tasksContract.states.list["~orpc"].route.path).toBe("/tasks/states/list");
    expect(tasksContract.states.create["~orpc"].route.path).toBe("/tasks/states/create");
    expect(tasksContract.states.update["~orpc"].route.path).toBe("/tasks/states/update");
    expect(tasksContract.states.remove["~orpc"].route.path).toBe("/tasks/states/remove");
    expect(tasksContract.states.reorder["~orpc"].route.path).toBe("/tasks/states/reorder");
  });

  test("clients.search lleva prefijo /tasks/clients/search", () => {
    expect(tasksContract.clients.search["~orpc"].route.path).toBe(
      "/tasks/clients/search",
    );
  });
});
