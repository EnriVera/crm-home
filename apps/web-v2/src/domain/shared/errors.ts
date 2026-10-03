/**
 * DomainError — closed-set of errors that cross layer boundaries.
 * The infrastructure layer maps orpc error codes to one of these.
 * Mirrors @crm/contract/shared/errors.
 */
export type DomainErrorCode =
 | "validation"
 | "unauthenticated"
 | "forbidden"
 | "not_found"
 | "conflict"
 | "rate_limited"
 | "internal"
 | "unknown";

export interface DomainError {
 code: DomainErrorCode;
 message: string;
 details?: Record<string, unknown>;
}

export const domainError = (
 code: DomainErrorCode,
 message: string,
 details?: Record<string, unknown>,
): DomainError => (details ? { code, message, details } : { code, message });
