import { z } from "zod";
import { uuidSchema } from "./_shared";

/* ---------- Schemas compartidos para lookups del módulo tasks ---------- */

export const typeForFormSchema = z.object({
  type_id: uuidSchema,
  type_name: z.string(),
});
export type TypeForForm = z.infer<typeof typeForFormSchema>;

export const categoryForFormSchema = z.object({
  cate_id: uuidSchema,
  cate_name: z.string(),
});
export type CategoryForForm = z.infer<typeof categoryForFormSchema>;

/* El cliente consume la misma búsqueda de clientes que el router de tasks
   expone bajo /tasks/clients/search. Se re-exporta aquí para que el form
   organism pueda importar el schema sin acoplarse al router completo. */

export {
  listClientsSearchInputSchema,
  listClientsSearchOutputSchema,
} from "./tasks";

export const listTypesForFormInputSchema = z.object({
  clie_id: uuidSchema.optional(),
});
export const listTypesForFormOutputSchema = z.array(typeForFormSchema);

export const listCategoriesByTypeInputSchema = z.object({
  type_id: uuidSchema,
});
export const listCategoriesByTypeOutputSchema = z.array(categoryForFormSchema);
