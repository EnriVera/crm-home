export * from "./contracts.js";

import { z } from "zod";
import {
  ClientId,
  UserId,
  AccountId,
  AttachmentId,
} from "../shared/identifiers/index.js";

/** Client — PRD-v2 §11 `client` table. */
export const Client = z.object({
  id: ClientId,
  userId: UserId,
  name: z.string().min(1).max(255),
  email: z.string().email().nullable(),
  areaPhone: z.string().nullable(),
  phone: z.string().nullable(),
  attachmentId: AttachmentId.nullable(),
  accountId: AccountId.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
});
export type Client = z.infer<typeof Client>;

export const ClientInput = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().nullable().default(null),
  areaPhone: z.string().nullable().default(null),
  phone: z.string().nullable().default(null),
  accountId: AccountId.nullable().default(null),
});
export type ClientInput = z.infer<typeof ClientInput>;

export const ClientPatch = ClientInput.partial();
export type ClientPatch = z.infer<typeof ClientPatch>;
