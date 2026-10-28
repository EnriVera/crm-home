/**
 * Config adapter: the only place that talks to the API about the user's
 * configuration.
 *
 * The API speaks snake_case on the wire and the domain speaks camelCase, so
 * the mapping lives here and nowhere else (PRD-v4 §11.4). The UI never sees a
 * wire shape.
 */
import type {
  AppModule,
  Category,
  Currency,
  TaskState,
  TaskType,
  TypeModule,
} from "~/domain/config/entities";
import {
  callConfig,
  type AppWire,
  type CategoryWire,
  type CurrencyWire,
  type TaskStateConfigWire,
  type TypeWire,
} from "~/shared/vendor/orpc";

function toType(wire: TypeWire): TaskType {
  return {
    id: wire.type_id,
    name: wire.type_name,
    modules: wire.type_modules as TypeModule[],
    createdAt: new Date(wire.type_created_at),
  };
}

function toState(wire: TaskStateConfigWire): TaskState {
  return {
    id: wire.tast_id,
    name: wire.tast_name,
    order: wire.tast_order,
  };
}

function toCategory(wire: CategoryWire): Category {
  return {
    id: wire.cate_id,
    name: wire.cate_name,
    typeId: wire.cate_type_id,
    createdAt: new Date(wire.cate_created_at),
  };
}

function toApp(wire: AppWire): AppModule {
  return { id: wire.id, name: wire.name };
}

function toCurrency(wire: CurrencyWire): Currency {
  return {
    id: wire.id,
    name: wire.name,
    symbol: wire.symbol,
    decimals: wire.decimals,
  };
}

/** Every type of the user, newest last. */
export async function listTypes(search = ""): Promise<TaskType[]> {
  const wire = await callConfig("types.list", {
    search,
    modules: [],
    limit: 100,
  });
  return wire.map(toType);
}

export async function createType(input: {
  name: string;
  modules: TypeModule[];
}): Promise<TaskType> {
  const wire = await callConfig("types.create", {
    type_name: input.name,
    type_modules: input.modules,
  });
  return toType(wire);
}

export async function updateType(input: {
  id: string;
  name?: string;
  modules?: TypeModule[];
}): Promise<TaskType> {
  const wire = await callConfig("types.update", {
    type_id: input.id,
    ...(input.name !== undefined ? { type_name: input.name } : {}),
    ...(input.modules !== undefined ? { type_modules: input.modules } : {}),
  });
  return toType(wire);
}

export async function removeType(id: string): Promise<TaskType> {
  const wire = await callConfig("types.remove", { type_id: id });
  return toType(wire);
}

/** Every task state (kanban column) of the user. */
export async function listTaskStates(): Promise<TaskState[]> {
  const wire = await callConfig("states.list", undefined);
  return wire.map(toState);
}

export async function createTaskState(input: {
  name: string;
  order: number;
}): Promise<TaskState> {
  const wire = await callConfig("states.create", {
    tast_name: input.name,
    tast_order: input.order,
  });
  return toState(wire);
}

export async function updateTaskState(input: {
  id: string;
  name?: string;
  order?: number;
}): Promise<TaskState> {
  const wire = await callConfig("states.update", {
    tast_id: input.id,
    ...(input.name !== undefined ? { tast_name: input.name } : {}),
    ...(input.order !== undefined ? { tast_order: input.order } : {}),
  });
  return toState(wire);
}

export async function removeTaskState(id: string): Promise<TaskState> {
  const wire = await callConfig("states.remove", { tast_id: id });
  return toState(wire);
}

/**
 * Reorders the states.
 *
 * The API rejects a partial reorder: it requires every state of the user, so
 * the caller has to send the whole list.
 */
export async function reorderTaskStates(
  orders: { tast_id: string; tast_order: number }[],
): Promise<void> {
  await callConfig("states.reorder", orders);
}

/** The application modules (global table, read-only in the MVP). */
export async function listApps(): Promise<AppModule[]> {
  const wire = await callConfig("listApps", undefined);
  return wire.map(toApp);
}

/** The currencies (global table). */
export async function listCurrencies(): Promise<Currency[]> {
  const wire = await callConfig("listCurrencies", undefined);
  return wire.map(toCurrency);
}

/** Creates a currency in the global table (visible to every user). */
export async function createCurrency(input: {
  name: string;
  symbol: string;
  decimals: number;
}): Promise<Currency> {
  const wire = await callConfig("createCurrency", input);
  return toCurrency(wire);
}

/** Every category of the user, filtered by search/type. */
export async function listCategories(input?: {
  search?: string;
  typeId?: string | null;
}): Promise<Category[]> {
  const wire = await callConfig("categories.list", {
    search: input?.search ?? "",
    typeId: input?.typeId ?? null,
    limit: 100,
  });
  return wire.map(toCategory);
}

export async function createCategory(input: {
  name: string;
  typeId: string;
}): Promise<Category> {
  const wire = await callConfig("categories.create", {
    cate_name: input.name,
    cate_type_id: input.typeId,
  });
  return toCategory(wire);
}

export async function updateCategory(input: {
  id: string;
  name?: string;
  typeId?: string;
}): Promise<Category> {
  const wire = await callConfig("categories.update", {
    cate_id: input.id,
    ...(input.name !== undefined ? { cate_name: input.name } : {}),
    ...(input.typeId !== undefined ? { cate_type_id: input.typeId } : {}),
  });
  return toCategory(wire);
}

export async function removeCategory(id: string): Promise<void> {
  await callConfig("categories.remove", { cate_id: id });
}
