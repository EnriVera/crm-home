import type { H3Event } from "h3";
import { readValidatedBody } from "h3";
import { z } from "zod";
import type { ListCategories } from "../../application/categories/list-categories";
import type { CreateCategory } from "../../application/categories/create-category";
import type { UpdateCategory } from "../../application/categories/update-category";
import type { RemoveCategory } from "../../application/categories/remove-category";
import {
  CategoryNotFound,
  InvalidCategoryInput,
} from "../../application/categories/errors";
import { mapDomainErrorToStatus } from "../error-mapping";
import { readUserId } from "../request-user";

/**
 * Entry HTTP del módulo `categories` (tab `categorías` en /config).
 *
 * Sigue el patrón de `types-routes.ts`:
 *  - `readUserId(event)` inyectado por el dispatch wrapper desde la
 *    session cookie (leído como header `X-User-Id` por el router).
 *  - `readValidatedBody(event, zodSchema.parse)` valida el body con
 *    Zod antes de invocar el use case.
 *  - Errores mapeados con el helper compartido `mapDomainErrorToStatus`.
 *
 * Una categoría siempre pertenece a un type (`cate_type_id NOT NULL`).
 */

export interface CategoriesRouteDependencies {
  listCategories: ListCategories;
  createCategory: CreateCategory;
  updateCategory: UpdateCategory;
  removeCategory: RemoveCategory;
}

const listCategoriesInputSchema = z.object({
  search: z.string().max(100).default(""),
  typeId: z.string().uuid().nullable().default(null),
  limit: z.number().int().min(1).max(100).default(50),
});

const createCategoryInputSchema = z.object({
  cate_name: z.string().min(1).max(255),
  cate_type_id: z.string().uuid(),
});

const updateCategoryInputSchema = z.object({
  cate_id: z.string().uuid(),
  cate_name: z.string().min(1).max(255).optional(),
  cate_type_id: z.string().uuid().optional(),
});

const removeCategoryInputSchema = z.object({
  cate_id: z.string().uuid(),
});

function mapCategoryRowToContract(row: {
  id: string;
  name: string;
  typeId: string;
  createdAt: Date;
}) {
  return {
    cate_id: row.id,
    cate_name: row.name,
    cate_type_id: row.typeId,
    cate_created_at: row.createdAt,
  };
}

export function createListCategoriesHandler(deps: CategoriesRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(
        event,
        listCategoriesInputSchema.parse,
      );
      const rows = await deps.listCategories.execute({
        userId,
        search: body.search,
        typeId: body.typeId,
        limit: body.limit,
      });
      return Response.json(rows.map(mapCategoryRowToContract));
    } catch (err) {
      const { status, body } = mapDomainErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function createCreateCategoryHandler(deps: CategoriesRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(
        event,
        createCategoryInputSchema.parse,
      );
      const row = await deps.createCategory.execute({
        userId,
        name: body.cate_name,
        typeId: body.cate_type_id,
      });
      return Response.json(mapCategoryRowToContract(row), { status: 201 });
    } catch (err) {
      const { status, body } = mapDomainErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function createUpdateCategoryHandler(deps: CategoriesRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(
        event,
        updateCategoryInputSchema.parse,
      );
      const row = await deps.updateCategory.execute({
        userId,
        categoryId: body.cate_id,
        name: body.cate_name,
        typeId: body.cate_type_id,
      });
      return Response.json(mapCategoryRowToContract(row));
    } catch (err) {
      const { status, body } = mapDomainErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}

export function createRemoveCategoryHandler(deps: CategoriesRouteDependencies) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const userId = readUserId(event);
      const body = await readValidatedBody(
        event,
        removeCategoryInputSchema.parse,
      );
      await deps.removeCategory.execute({
        userId,
        categoryId: body.cate_id,
      });
      return Response.json({ ok: true });
    } catch (err) {
      const { status, body } = mapDomainErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}
