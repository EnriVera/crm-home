import { z } from "zod";

/**
 * DomainError — closed-set of errors that cross layer boundaries.
 * The infrastructure layer maps orpc error codes to one of these.
 */
export const DomainErrorCode = z.enum([
 "validation",
 "unauthenticated",
 "forbidden",
 "not_found",
 "conflict",
 "rate_limited",
 "internal",
 "unknown",
]);
export type DomainErrorCode = z.infer<typeof DomainErrorCode>;

export const DomainError = z.object({
 code: DomainErrorCode,
 message: z.string(),
 details: z.record(z.string(), z.unknown()).optional(),
});
export type DomainError = z.infer<typeof DomainError>;
