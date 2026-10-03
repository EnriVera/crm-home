import { z } from "zod";

/**
 * Branded identifier types (PRD-v3 §5 + the orpc SKILL).
 *
 * The brand prevents mixing a UserId and a TaskId at the type level even
 * though both are UUIDs at runtime. Constructors parse a plain string and
 * return the branded type; the type is opaque to anything that does not
 * import the constructor.
 *
 * zod 4's `.brand<T>()` is a type-level operation; the runtime value is
 * identical to a plain `z.string().uuid()`. We expose the type and the
 * schema side by side, so consumers can `z.infer<typeof UserId>` and
 * import `UserId` directly.
 */

/** Plain (unbranded) UUID schema — for procedure input/output where the
 * domain name is not yet known to the wire shape. The handler maps
 * these into the appropriate branded id at the use case boundary. */
export const uuidSchema = z.string().uuid();
export type Uuid = z.infer<typeof uuidSchema>;

export const UserId = z.string().uuid().brand<"UserId">();
export type UserId = z.infer<typeof UserId>;

export const SessionId = z.string().uuid().brand<"SessionId">();
export type SessionId = z.infer<typeof SessionId>;

export const TaskId = z.string().uuid().brand<"TaskId">();
export type TaskId = z.infer<typeof TaskId>;

export const TaskStateId = z.string().uuid().brand<"TaskStateId">();
export type TaskStateId = z.infer<typeof TaskStateId>;

export const ClientId = z.string().uuid().brand<"ClientId">();
export type ClientId = z.infer<typeof ClientId>;

export const ScheduleId = z.string().uuid().brand<"ScheduleId">();
export type ScheduleId = z.infer<typeof ScheduleId>;

export const ScheduleItemId = z.string().uuid().brand<"ScheduleItemId">();
export type ScheduleItemId = z.infer<typeof ScheduleItemId>;

export const TypeId = z.string().uuid().brand<"TypeId">();
export type TypeId = z.infer<typeof TypeId>;

export const CategoryId = z.string().uuid().brand<"CategoryId">();
export type CategoryId = z.infer<typeof CategoryId>;

export const AccountId = z.string().uuid().brand<"AccountId">();
export type AccountId = z.infer<typeof AccountId>;

export const AppId = z.string().uuid().brand<"AppId">();
export type AppId = z.infer<typeof AppId>;

export const CurrencyId = z.string().uuid().brand<"CurrencyId">();
export type CurrencyId = z.infer<typeof CurrencyId>;

export const OtpRequestId = z.string().uuid().brand<"OtpRequestId">();
export type OtpRequestId = z.infer<typeof OtpRequestId>;

export const AttachmentId = z.string().uuid().brand<"AttachmentId">();
export type AttachmentId = z.infer<typeof AttachmentId>;
