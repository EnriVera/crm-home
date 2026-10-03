/**
 * Type (config/types) bounded context — request/response zod schemas.
 *
 * Day-of-judgment fix A-001: schemas previously in
 * `@crm/types/contracts/types.ts` now live here. The Type entity lives
 * in `./index.js` (the `Type` zod schema). The wire format uses
 * `type_*` prefix; the entity uses camelCase.
 */
import { oc } from "@orpc/contract";
import { z } from "zod";
import { uuidSchema } from "../shared/identifiers/index.js";

export const TYPE_MODULE_NAMES = [
 "tasks",
 "incomes",
 "expenses",
 "schedules",
] as const;
export type TypeModuleName = (typeof TYPE_MODULE_NAMES)[number];
export type TypeModules = readonly TypeModuleName[];

export const typeModuleNameSchema = z.enum(TYPE_MODULE_NAMES);
export const typeModulesSchema = z.array(typeModuleNameSchema);

export const typeSchema = z.object({
 type_id: uuidSchema,
 type_name: z.string().min(1).max(100),
 type_modules: typeModulesSchema,
 type_created_at: z.coerce.date(),
});

export const typeNameSchema = z
 .string()
 .min(1, { message: "typeName is required" })
 .max(100, { message: "typeName exceeds 100 chars" });

export const typeSearchSchema = z.string().max(100).default("");
export const typeLimitSchema = z.number().int().min(1).max(100).default(50);

export const listTypesInputSchema = z.object({
 search: typeSearchSchema,
 modules: typeModulesSchema.default([]),
 limit: typeLimitSchema,
});

export const createTypeInputSchema = z.object({
 type_name: typeNameSchema,
 type_modules: typeModulesSchema.default([]),
});

export const updateTypeInputSchema = z.object({
 type_id: uuidSchema,
 type_name: typeNameSchema.optional(),
 type_modules: typeModulesSchema.optional(),
});

export const removeTypeInputSchema = z.object({ type_id: uuidSchema });

const okOutputSchema = z.object({ ok: z.literal(true) });

export const typesContract = oc
 .errors({
  UNAUTHORIZED: { message: "Authentication required" },
  NOT_FOUND: { message: "Type not found" },
  VALIDATION: { message: "Invalid input" },
 })
 .router({
  list: oc.input(listTypesInputSchema).output(z.array(typeSchema)),
  create: oc.input(createTypeInputSchema).output(typeSchema),
  update: oc.input(updateTypeInputSchema).output(typeSchema),
  remove: oc.input(removeTypeInputSchema).output(okOutputSchema),
 });

export type TypeWire = z.infer<typeof typeSchema>;
export type TypesContract = typeof typesContract;
