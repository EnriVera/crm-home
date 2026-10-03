export { orpcClient } from "./client";
export type { AppOrpcClient } from "./client";
export { useOrpcQuery, useOrpcMutation } from "./query";
// Re-export ORPCError so consumers (e.g. infrastructure/api/errors.ts)
// can do `instanceof ORPCError` checks without importing @orpc/client
// directly. The vendor rule blocks direct imports of @orpc/client.
export { ORPCError } from "@orpc/client";
