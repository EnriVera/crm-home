/**
 * Maps orpc errors to the closed-set `DomainError` shape used by the
 * application layer. See PRD-v3 §SKILL orpc, the "Error mapping" table.
 */
import {
 domainError,
 type DomainError,
 type DomainErrorCode,
} from "@/domain/shared/errors";
import { ORPCError } from "@/shared/vendor/orpc";

const orpcCodeToDomainCode: Record<string, DomainErrorCode> = {
 BAD_REQUEST: "validation",
 UNAUTHORIZED: "unauthenticated",
 FORBIDDEN: "forbidden",
 NOT_FOUND: "not_found",
 CONFLICT: "conflict",
 PAYLOAD_TOO_LARGE: "validation",
 RATE_LIMITED: "rate_limited",
};

export function mapOrpcError(err: unknown): DomainError {
 if (err instanceof ORPCError) {
  const code = orpcCodeToDomainCode[err.code] ?? "internal";
  return domainError(code, err.message, { orpcCode: err.code });
 }
 if (err instanceof Error) {
  return domainError("unknown", err.message);
 }
 return domainError("unknown", "An unexpected error occurred.");
}
