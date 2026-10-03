/**
 * @crm/contract — single source of truth for every entity, request, and
 * response shape shared between apps/api (backend) and the frontends
 * (apps/web, apps/web-v2, future clients).
 *
 * The backend defines the orpc procedures against these schemas; the
 * frontends import the same schemas to type their use cases and ports.
 * Never define a zod schema for an entity twice.
 */

export * as Task from "./task";
export * as Schedule from "./schedule";
export * as Client from "./client";
export * as Auth from "./auth";
export * as Config from "./config";
export * as Finance from "./finance";
export * as Shared from "./shared";
