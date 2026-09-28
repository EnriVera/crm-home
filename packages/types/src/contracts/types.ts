import { oc } from "@orpc/contract";
import { z } from "zod";
import { uuidSchema } from "./_shared";

/* ---------- Schemas atómicos ---------- */

/**
 * Set cerrado de módulos donde un `type` puede usarse. Constraint de
 * PRD §8.7: cada type pertenece a un módulo (tasks / incomes /
 * expenses / schedules) y el form correspondiente filtra los types
 * por módulo.
 *
 * Si en el futuro se agregan módulos (por ej. `clients`), se suman al
 * tuple acá y se propaga al Zod enum en `apps/api/src/http/types/types-routes.ts`
 * y al `TYPE_MODULES` en `apps/api/src/application/types/{create,update}-type.ts`.
 */
export const TYPE_MODULES = [
  "tasks",
  "incomes",
  "expenses",
  "schedules",
] as const;
export type TypeModule = (typeof TYPE_MODULES)[number];

export const typeModuleSchema = z.enum(TYPE_MODULES);

/* ---------- Schemas entidad (read-side) ---------- */

/**
 * Output shape del CRUD de types. Mapea el row DB snake_case a la
 * convención del resto de los contratos (`<entity>_<field>`).
 *
 * No exponemos `type_user_id` (interno; el handler ya filtra por user
 * antes de llegar al caller).
 */
export const typeSchema = z.object({
 type_id: uuidSchema,
 type_name: z.string().min(1).max(100),
 type_module: typeModuleSchema,
 type_created_at: z.coerce.date(),
});

/* ---------- Schemas de input (write-side) ---------- */

export const typeNameSchema = z
 .string()
 .min(1, { message: "typeName is required" })
 .max(100, { message: "typeName exceeds 100 chars" });

export const typeSearchSchema = z.string().max(100).default("");

export const typeLimitSchema = z.number().int().min(1).max(100).default(50);

export const listTypesInputSchema = z.object({
 search: typeSearchSchema,
 module: typeModuleSchema.nullable().default(null),
 limit: typeLimitSchema,
});

export const createTypeInputSchema = z.object({
 type_name: typeNameSchema,
 type_module: typeModuleSchema,
});

export const updateTypeInputSchema = z.object({
 type_id: uuidSchema,
 type_name: typeNameSchema.optional(),
 type_module: typeModuleSchema.optional(),
});

export const removeTypeInputSchema = z.object({
 type_id: uuidSchema,
});

const okOutputSchema = z.object({ ok: z.literal(true) });

/* ---------- Contract ---------- */

/**
 * Contract del módulo `types` (PRD §8.7 → tab `tipos` en /config).
 *
 * CRUD completo:
 *   rpc.types.list({ search, module?, limit })
 *   rpc.types.create({ type_name, type_module })
 *   rpc.types.update({ type_id, type_name?, type_module? })
 *   rpc.types.remove({ type_id })
 *
 * El handler traduce errores de dominio (`InvalidTypeInput`,
 * `TypeNotFound`) a HTTP 400 / 404 vía el mapeo compartido. El
 * `errors()` block documenta los códigos que el cliente puede
 * esperar para mostrar mensajes localizados.
 */
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

export type Type = z.infer<typeof typeSchema>;
export type CreateTypeInput = z.infer<typeof createTypeInputSchema>;
export type UpdateTypeInput = z.infer<typeof updateTypeInputSchema>;
export type RemoveTypeInput = z.infer<typeof removeTypeInputSchema>;
export type ListTypesInput = z.infer<typeof listTypesInputSchema>;
