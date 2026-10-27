---
name: orpc
description: Builds type-safe, contract-first RPC between the CRM-Home API (nitro + h3) and any frontend (web octane, web-v2 vue, future clients) using oRPC. Triggers on "orpc", "oRPC", "@orpc/client", "@orpc/server", "rpc procedure", "add an endpoint", "expose a procedure", "contract-first API", "zod schema for the API", "infrastructure/api/", orpc-bridge, or any task that adds or consumes a backend procedure for CRM-Home. Pairs with `@crm/contract` (the workspace package with the shared zod schemas) — every procedure's input and output type comes from there, not from inline zod. Reach for this skill before writing a new nitro handler, an orpc-bridge procedure, or a frontend orpc call.
user-invocable: false
allowed-tools: Read(apps/api/src/http/router.ts), Read(apps/api/src/http/orpc-bridge.ts), Read(packages/contract/src/**), Read(apps/web-v2/src/shared/vendor/orpc/**), Bash(bun run --filter @crm/api typecheck), Bash(bunx --bun shadcn@latest info --json)
---

# oRPC (CRM-Home)

oRPC is the type-safe RPC layer that connects every frontend in this monorepo (`apps/web` octane, `apps/web-v2` vue, future mobile) to the single backend at `apps/api` (nitro + h3). The full oRPC documentation is in `llms-full.txt` in this directory — read it for the spec, use this file for the CRM-Home conventions.

## The single source of truth: `@crm/contract`

Every API procedure in CRM-Home is defined against a **zod schema in `packages/contract/src/`**. The backend, the bridge, and the frontends all import the same schema, so types cannot drift.

```text
packages/contract/src/
├── task.ts        # Task, TaskState, TaskInput, TaskPatch, TaskMoved, …
├── schedule.ts    # Schedule, ScheduleItem, TimerStartInput, …
├── client.ts      # Client, ClientInput, ClientPatch
├── auth.ts        # OtpRequest, OtpVerifyInput, Session
├── config.ts      # UserConfig, Type, Category, Account, App, Currency
├── finance.ts     # Income, Expense, Transfer
└── index.ts       # barrel — import { TaskSchema, … } from "@crm/contract"
```

**Rule:** never inline a zod schema in `apps/api` or `apps/web-v2` for an entity that already has a contract schema. If a schema is missing from `@crm/contract`, add it there first, then import it from both sides.

## The three layers

| Layer | Lives in | What it does |
| --- | --- | --- |
| **Domain schema** | `packages/contract/src/<entity>.ts` | zod schema + inferred TS type. No orpc, no nitro, no Vue. |
| **Backend procedure** | `apps/api/src/http/<entity>/` (one folder per entity) | uses the contract schema as the procedure input/output. Calls a use case from `application/`. Auth is attached by the middleware in `apps/api/src/http/composition-root.ts`. |
| **Bridge + frontend client** | `apps/web-v2/src/shared/vendor/orpc/` (new) and `apps/web/src/lib/api/` (existing) | orpc client configured once; repositories in `infrastructure/api/procedures/` implement the `domain/<bc>/ports/` interfaces. |

The bridge `apps/api/src/http/orpc-bridge.ts` is the **only** place that imports `@orpc/server` and exposes the API router to the frontends.

## How to add a new procedure (5 steps)

1. **Schema first.** Add (or extend) the zod schema in `packages/contract/src/<entity>.ts`. If you need a new entity, create the file and export it from `index.ts`.
2. **Use case in backend.** Add a use case in `apps/api/src/application/<entity>/` (if it does not exist yet). Use cases take the contract input, return a `Result<Output, DomainError>`, and depend on ports in `apps/api/src/domain/<entity>/ports/`. The orpc procedure is a thin handler that calls the use case.
3. **Bridge the procedure.** Add the procedure to `apps/api/src/http/<entity>/<action>.ts` and register it in `apps/api/src/http/router.ts`. Naked procedures live under `rpc.public.*`; protected ones under `rpc.authed.*` and require the session middleware.
4. **Domain port on the frontend.** If the new procedure is consumed by `web-v2`, declare a port in `apps/web-v2/src/domain/<entity>/ports/<entity>-repository.ts` and add a use case in `apps/web-v2/src/application/<entity>/`.
5. **Adapter on the frontend.** Implement the port in `apps/web-v2/src/infrastructure/api/procedures/<entity>-repository.ts`. Use the orpc client wrapper in `apps/web-v2/src/shared/vendor/orpc/`. The composable in `apps/web-v2/src/shared/composables/use-<action>-<entity>.ts` wires the use case to TanStack Query.

If the procedure is consumed by `apps/web` (octane), the same bridge works — the existing client in `apps/web/src/lib/api/` already uses the same `@orpc/client` transport.

## Error mapping

`apps/web-v2/src/infrastructure/api/errors.ts` is the single mapping from oRPC error codes to domain errors. The current mapping is:

| oRPC code | Domain error | UX |
| --- | --- | --- |
| `BAD_REQUEST` | `ValidationError` | inline form error, scroll to first invalid field |
| `UNAUTHORIZED` | `UnauthenticatedError` | redirect to `/login`, preserve `redirectTo` |
| `FORBIDDEN` | `ForbiddenError` | toast "You don't have access" |
| `NOT_FOUND` | `NotFoundError` | empty state with CTA |
| `CONFLICT` | `ConflictError` | inline error, suggest refresh |
| `PAYLOAD_TOO_LARGE` | `ValidationError` | toast with size hint |
| `RATE_LIMITED` | `ConflictError` | toast with retry-after (the body includes it) |
| `INTERNAL_SERVER_ERROR` | `DomainError` | toast "Something went wrong" + retry |
| anything else | `DomainError` | generic toast, log to console |

Add to this file when a new orpc code needs a different UX. Do not branch on code in components or composables.

## Auth middleware (PRD-v2 §6.1, §8.1)

The session cookie (`crm_session=…`) is set by the API on OTP validation. The cookie is:

- `httpOnly`, `secure`, `sameSite: 'lax'`
- 30-day expiry with sliding renewal
- The orpc client on every frontend uses `credentials: 'include'` so the browser sends the cookie automatically

The `protectedProcedure` middleware in `apps/api/src/http/composition-root.ts` extracts the session, validates it, and attaches `context.userId` (a branded `UserId` from `@crm/contract`). Use cases read `context.userId` from the procedure input — never from the URL, never from a body field.

## TanStack Query wiring (web-v2)

The `shared/vendor/orpc/` wrapper exposes two helpers:

- `createOrpcQuery(procedure, input, options)` → `useQuery`-compatible reactive query
- `createOrpcMutation(procedure, options)` → `useMutation`-compatible reactive mutation with typed input/output

Cache keys are derived from the procedure path + the serialized input. No manual key strings. Invalidations follow the PRD-v2 §6.5 rule: the websocket sends `{entity, id, action}` and the `invalidation-bus` adapter turns that into a `queryClient.invalidateQueries` call.

## Common mistakes to avoid

- **Inline zod.** If the schema is reused (entity input + entity output), it lives in `@crm/contract`, not in `apps/api` and not in `apps/web-v2`.
- **Direct orpc calls from a component.** Components call composables, composables call use cases, use cases call ports, port adapters call orpc. The bridge is not bypassed.
- **`userId` in the body.** The session middleware sets `context.userId`. A use case that needs the current user reads it from the procedure input — never from a body field, never from a query param, never from a URL segment.
- **Throwing across layer boundaries.** Use cases return `Result<T, DomainError>`. The infrastructure layer maps orpc errors to `DomainError`. Components branch on the result, they do not `try/catch`.
- **Two schemas for the same concept.** If `apps/api` and `apps/web-v2` end up with a different zod schema for the same entity, the contract package is the place that broke. Fix it there, not in the consumers.
- **Returning the user from the session.** The session returns a `Session` (id, userId, expiresAt). The user profile is fetched via `rpc.authed.me()` and is a separate query with its own cache key.

## Catalog reference

`llms-full.txt` in this directory is the full oRPC documentation. Reach for it when:

- You need a feature not covered here (links, event iterators, AI tools, SSE, etc.).
- You are debugging a transport issue and need the Streamable HTTP spec details.
- You are writing a `middleware` (OpenAPI metadata, auth scopes, rate limiting) and need the middleware API.
- You are wiring a non-Node client (browser extension, mobile) and need the client setup variants.

Do not paste oRPC documentation into responses. Read the file with `read` and answer from it.
