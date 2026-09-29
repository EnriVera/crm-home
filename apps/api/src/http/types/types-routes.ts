import type { H3Event } from "h3";
import { readValidatedBody } from "h3";
import { z } from "zod";
import type { ListTypes } from "../../application/types/list-types";
import type { CreateType } from "../../application/types/create-type";
import type { UpdateType } from "../../application/types/update-type";
import type { RemoveType } from "../../application/types/remove-type";
import {
  InvalidTypeInput,
  TypeNotFound,
} from "../../application/types/errors";
import { mapTaskErrorToStatus } from "../tasks/error-mapping";
import { readUserId } from "../tasks/tasks-routes";

/**
 * Entry HTTP del módulo `types` (tab `tipos` en /config).
 *
 * Sigue el patrón de `clients-routes.ts` y `expenses-routes.ts`:
 *  - `readUserId(event)` inyectado por el dispatch wrapper desde la
 *    session cookie (leído como header `X-User-Id` por el router).
 *  - `readValidatedBody(event, zodSchema.parse)` valida el body con
 *    Zod antes de invocar el use case.
 *  - Errores ORPC mapeados via `mapTaskErrorToStatus` (compartido
 *    con tasks / clients — el shape del error envelope es idéntico).
 *
 * Multi-módulo (migration 007):
 *  - `type_modules` es un array en create / update. Vacío `[]` permitido
 *    (= "applies to all modules" — el filter de list con `module=null`
 *    matchea los types con `modules = []`).
 *  - List input sigue aceptando un único `module` (filter), no un array
 *    (el UI filtra por un módulo a la vez, no multi-filter).
 */

export interface TypesRouteDependencies {
  listTypes: ListTypes;
  createType: CreateType;
  updateType: UpdateType;
  removeType: RemoveType;
}

const TYPE_MODULES = ["tasks", "incomes", "expenses", "schedules"] as const;

const listTypesInputSchema = z.object({
  search: z.string().max(100).default(""),
  module: z.enum(TYPE_MODULES).nullable().default(null),
  limit: z.number().int().min(1).max(100).default(50),
});

const createTypeInputSchema = z.object({
  type_name: z.string().min(1).max(100),
  type_modules: z.array(z.enum(TYPE_MODULES)).default([]),
});

const updateTypeInputSchema = z.object({
  type_id: z.string().uuid(),
  type_name: z.string().min(1).max(100).optional(),
  type_modules: z.array(z.enum(TYPE_MODULES)).optional(),
});

const removeTypeInputSchema = z.object({
  type_id: z.string().uuid(),
});

function mapTypeRowToContract(row: {
  id: string;
  userId: string;
  name: string;
  modules: readonly string[];
  createdAt: Date;
}) {
  return {
    type_id: row.id,
    type_name: row.name,
    type_modules: [...row.modules],
    type_created_at: row.createdAt,
  };
}

export function createListTypesHandler(deps: TypesRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(event, listTypesInputSchema.parse);
      const rows = await deps.listTypes.execute({
        userId,
        search: body.search,
        module: body.module,
        limit: body.limit,
      });
      return Response.json(rows.map(mapTypeRowToContract));
    } catch (err) {
      const { status, body } = mapTaskErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function createCreateTypeHandler(deps: TypesRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(event, createTypeInputSchema.parse);
      const row = await deps.createType.execute({
        userId,
        name: body.type_name,
        modules: body.type_modules,
      });
      return Response.json(mapTypeRowToContract(row), { status: 201 });
    } catch (err) {
      if (err instanceof InvalidTypeInput) {
        return Response.json(
          {
            defined: true,
            code: "INVALID_TYPE_INPUT",
            message: err.message,
          },
          { status: 400 },
        );
      }
      const { status, body } = mapTaskErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function createUpdateTypeHandler(deps: TypesRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(event, updateTypeInputSchema.parse);
      const row = await deps.updateType.execute({
        userId,
        typeId: body.type_id,
        name: body.type_name,
        modules: body.type_modules,
      });
      return Response.json(mapTypeRowToContract(row));
    } catch (err) {
      if (err instanceof InvalidTypeInput) {
        return Response.json(
          {
            defined: true,
            code: "INVALID_TYPE_INPUT",
            message: err.message,
          },
          { status: 400 },
        );
      }
      if (err instanceof TypeNotFound) {
        return Response.json(
          { defined: true, code: "TYPE_NOT_FOUND", message: err.message },
          { status: 404 },
        );
      }
      const { status, body } = mapTaskErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function createRemoveTypeHandler(deps: TypesRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(event, removeTypeInputSchema.parse);
      const row = await deps.removeType.execute({
        userId,
        typeId: body.type_id,
      });
      return Response.json(mapTypeRowToContract(row));
    } catch (err) {
      if (err instanceof TypeNotFound) {
        return Response.json(
          { defined: true, code: "TYPE_NOT_FOUND", message: err.message },
          { status: 404 },
        );
      }
      const { status, body } = mapTaskErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}
