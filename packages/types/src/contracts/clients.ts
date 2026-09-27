import { oc } from "@orpc/contract";
import { z } from "zod";
import { uuidSchema } from "./_shared";

/* ---------- Schemas atómicos ---------- */

export const clientNameSchema = z
 .string()
 .min(1, { message: "clientName is required" })
 .max(100, { message: "clientName exceeds 100 chars" });

export const clientEmailSchema = z
 .union([z.string().email(), z.null()])
 .default(null);

export const clientPhoneSchema = z
 .union([z.string().max(40), z.null()])
 .default(null);

export const clientSearchSchema = z.string().max(100).default("");

export const clientLimitSchema = z.number().int().min(1).max(100).default(50);

/* ---------- Schema entidad (read-side) ---------- */

export const clientSchema = z.object({
 client_id: uuidSchema,
 client_name: z.string(),
 client_email: z.union([z.string(), z.null()]),
 client_phone: z.union([z.string(), z.null()]),
 client_created_at: z.coerce.date(),
 client_updated_at: z.coerce.date(),
});

/* ---------- Schemas de input (write-side) ---------- */

/**
 * Input para `create`. Re-usa los schemas atómicos para que las
 * validaciones sean DRY entre list/create/update.
 *
 * `name` es required (mismo `clientNameSchema` que filtra min/max).
 * `email` y `phone` son opcionales — `null` se persiste literal.
 */
export const createClientInputSchema = z.object({
 client_name: clientNameSchema,
 client_email: clientEmailSchema,
 client_phone: clientPhoneSchema,
});

/**
 * Input para `update`. `id` es required; los otros campos son opcionales
 * (partial update). Si un campo viene como `null` explícito, se persiste
 * `null` (no se omite). El cliente que llama decide si manda o no cada
 * campo.
 */
export const updateClientInputSchema = z.object({
 client_id: uuidSchema,
 client_name: clientNameSchema.optional(),
 client_email: clientEmailSchema.optional(),
 client_phone: clientPhoneSchema.optional(),
});

/**
 * Input para `remove`. Soft-delete (set client_deleted_at = NOW()).
 */
export const removeClientInputSchema = z.object({
 client_id: uuidSchema,
});

const okOutputSchema = z.object({ ok: z.literal(true) });

/* ---------- Contract ---------- */

/**
 * Contract del módulo `clients` (PRD §D5).
 *
 * Expone las 4 operaciones CRUD: `list` (read), `get` (read single),
 * `create` (write), `update` (write), `remove` (soft-delete). El patrón
 * es el mismo que `tasks`:
 *
 *   rpc.clients.list({ search, limit })
 *   rpc.clients.get({ client_id })
 *   rpc.clients.create({ client_name, client_email?, client_phone? })
 *   rpc.clients.update({ client_id, client_name?, client_email?, client_phone? })
 *   rpc.clients.remove({ client_id })
 *
 * Los inputs siguen la convención snake_case del dominio (prefijo
 * `client_`) — el handler hace el mapeo a los nombres del repo
 * (camelCase).
 */
export const clientsContract = oc
 .errors({
  UNAUTHORIZED: { message: "Authentication required" },
  NOT_FOUND: { message: "Client not found" },
  VALIDATION: { message: "Invalid input" },
 })
 .router({
  list: oc
   .input(
    z.object({
     search: clientSearchSchema,
     limit: clientLimitSchema,
    }),
   )
   .output(z.array(clientSchema)),
  get: oc.input(z.object({ client_id: uuidSchema })).output(clientSchema),
  create: oc.input(createClientInputSchema).output(clientSchema),
  update: oc.input(updateClientInputSchema).output(clientSchema),
  remove: oc.input(removeClientInputSchema).output(okOutputSchema),
 });

export type Client = z.infer<typeof clientSchema>;
export type CreateClientInput = z.infer<typeof createClientInputSchema>;
export type UpdateClientInput = z.infer<typeof updateClientInputSchema>;
export type RemoveClientInput = z.infer<typeof removeClientInputSchema>;
