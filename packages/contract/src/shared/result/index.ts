import { z } from "zod";

/**
 * Result<T, E> — explicit success/failure type. Used in the frontend
 * application layer to avoid thrown errors across layer boundaries.
 */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export const ResultSchema = <T extends z.ZodTypeAny, E extends z.ZodTypeAny>(
 value: T,
 error: E,
) =>
 z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), value }),
  z.object({ ok: z.literal(false), error }),
 ]);
