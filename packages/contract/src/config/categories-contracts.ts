/**
 * Categories (config/categories) bounded context — request/response zod schemas.
 *
 * The wire format uses the `cate_*` prefix (the DB columns); the entity
 * `Category` in `./index.js` is camelCase and aspirational — the DB stores
 * only id, user, name, type and soft-delete. Multi-tenant: every procedure
 * filters by the session user.
 *
 * Field convention: output rows mirror the DB columns (`cate_*`); input
 * filter params are logical camelCase names (`typeId`, `search`, `limit`).
 * That is the convention the API speaks; renaming either side breaks the
 * wire.
 */
import { oc } from "@orpc/contract";
import { z } from "zod";
import { uuidSchema } from "../shared/identifiers/index.js";

/**
 * Color de dato — token del design system (PRD-v4 §11.3), NO un hex.
 * El frontend lo resuelve a `var(--color-data-*)`.
 */
export const categoryDataColorSchema = z.enum([
  "data-blue",
  "data-green",
  "data-pink",
  "data-cyan",
  "data-amber",
  "data-purple",
  "data-red",
  "data-gray",
]);
export type CategoryDataColor = z.infer<typeof categoryDataColorSchema>;

export const categorySchema = z.object({
  cate_id: uuidSchema,
  cate_name: z.string().min(1).max(255),
  cate_type_id: uuidSchema,
  cate_color: z.union([z.string(), z.null()]),
  cate_created_at: z.coerce.date(),
});

export const categoryNameSchema = z
  .string()
  .min(1, { message: "categoryName is required" })
  .max(255, { message: "categoryName exceeds 255 chars" });

export const categorySearchSchema = z.string().max(100).default("");
export const categoryLimitSchema = z
  .number()
  .int()
  .min(1)
  .max(100)
  .default(50);

export const listCategoriesInputSchema = z.object({
  search: categorySearchSchema,
  typeId: uuidSchema.nullable().default(null),
  limit: categoryLimitSchema,
});

export const createCategoryInputSchema = z.object({
  cate_name: categoryNameSchema,
  cate_type_id: uuidSchema,
  cate_color: categoryDataColorSchema.nullable().optional(),
});

export const updateCategoryInputSchema = z.object({
  cate_id: uuidSchema,
  cate_name: categoryNameSchema.optional(),
  cate_type_id: uuidSchema.optional(),
  cate_color: categoryDataColorSchema.nullable().optional(),
});

export const removeCategoryInputSchema = z.object({ cate_id: uuidSchema });

const okOutputSchema = z.object({ ok: z.literal(true) });

export const categoriesContract = oc
  .errors({
    UNAUTHORIZED: { message: "Authentication required" },
    NOT_FOUND: { message: "Category not found" },
    VALIDATION: { message: "Invalid input" },
  })
  .router({
    list: oc.input(listCategoriesInputSchema).output(z.array(categorySchema)),
    create: oc.input(createCategoryInputSchema).output(categorySchema),
    update: oc.input(updateCategoryInputSchema).output(categorySchema),
    remove: oc.input(removeCategoryInputSchema).output(okOutputSchema),
  });

export type CategoryWire = z.infer<typeof categorySchema>;
export type CategoriesContract = typeof categoriesContract;
