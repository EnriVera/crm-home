/**
 * Client bounded context — request/response zod schemas.
 *
 * Day-of-judgment fix A-001: schemas previously in
 * `@crm/types/contracts/clients.ts` now live here as the single source
 * of truth shared between apps/api and the frontends.
 *
 * The wire format follows the snake_case convention the domain uses
 * (`client_*`). The entity schemas in `./index.js` (`Client`,
 * `ClientInput`, `ClientPatch`) use camelCase and are the internal
 * shape the use cases / repos deal with. The API route maps between
 * the two.
 */
import { oc } from "@orpc/contract";
import { z } from "zod";
import { uuidSchema } from "../shared/identifiers/index.js";

/* ---------- Atomic schemas (shared between list/create/update) ---------- */

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

/* ---------- Entity (read-side) ---------- */

export const clientSchema = z.object({
  client_id: uuidSchema,
  client_name: z.string(),
  client_email: z.union([z.string(), z.null()]),
  client_phone: z.union([z.string(), z.null()]),
  client_created_at: z.coerce.date(),
  client_updated_at: z.coerce.date(),
});

/* ---------- Input schemas (write-side) ---------- */

export const createClientInputSchema = z.object({
  client_name: clientNameSchema,
  client_email: clientEmailSchema,
  client_phone: clientPhoneSchema,
});

export const updateClientInputSchema = z.object({
  client_id: uuidSchema,
  client_name: clientNameSchema.optional(),
  client_email: clientEmailSchema.optional(),
  client_phone: clientPhoneSchema.optional(),
});

export const removeClientInputSchema = z.object({
  client_id: uuidSchema,
});

/* ---------- Dependencies (delete confirmation, PRD-v2 §8.5) ---------- */

/**
 * What a client is attached to.
 *
 * The PRD requires that deleting a client with tasks or movements asks
 * for an explicit confirmation that LISTS the dependencies. The DB only
 * links clients to tasks (`task_clie_id`); income/expense/transfer have
 * no client column, so tasks are the only dependency there is.
 */
export const clientDependencySchema = z.object({
  task_id: uuidSchema,
  task_title: z.string(),
});

export const clientDependenciesOutputSchema = z.object({
  dependencies: z.array(clientDependencySchema),
  total: z.number().int(),
});

const okOutputSchema = z.object({ ok: z.literal(true) });

/* ---------- Contract router ---------- */

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
   dependencies: oc
    .input(z.object({ client_id: uuidSchema }))
    .output(clientDependenciesOutputSchema),
  });

export type Client = z.infer<typeof clientSchema>;
export type CreateClientInput = z.infer<typeof createClientInputSchema>;
export type UpdateClientInput = z.infer<typeof updateClientInputSchema>;
export type RemoveClientInput = z.infer<typeof removeClientInputSchema>;
export type ClientsContract = typeof clientsContract;
