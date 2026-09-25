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

/* ---------- Contract ---------- */

/**
 * Contract del módulo `clients` (PRD §D5 — shell route, MVP read-only).
 *
 * Solo expone `list` por ahora. `create` / `update` / `remove` llegan en
 * una próxima ola. El pattern es el mismo que `tasks`:
 *
 *   rpc.clients.list({ search, limit })
 */
export const clientsContract = oc.errors({
  UNAUTHORIZED: { message: "Authentication required" },
}).router({
  list: oc
    .input(
      z.object({
        search: clientSearchSchema,
        limit: clientLimitSchema,
      }),
    )
    .output(z.array(clientSchema)),
});

export type Client = z.infer<typeof clientSchema>;
