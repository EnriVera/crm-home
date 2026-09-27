---
name: h3
description: "Trigger: h3, H3Event, h3 handler, h3 v2, defineEventHandler, readValidatedBody, getCookie, setCookie, getHeader, h3 bridge, h3 event, request validation. H3 v2 HTTP framework used by the CRM-Home API under nitro. Use when writing or debugging API handlers, the ORPC-h3 bridge, cookie/header extraction, or request validation with zod."
license: Apache-2.0
metadata:
  author: "enri"
  version: "1.0"
---

# H3

## Activation Contract

Activate when writing a handler that consumes `H3Event`, when extracting
or setting cookies / headers from a request, when bridging between
ORPC procedures and h3-shaped handlers, when validating request bodies
or queries with zod, or when debugging why a handler returns 401 / 404 /
500 unexpectedly. H3 v2 is the contract every API handler in
`apps/api/src/http/` must respect — see `.pi/skills/nitro/SKILL.md` for
the wiring above it and `.pi/skills/orpc/` (or the orpc-bridge) for the
bridge that decouples h3 from ORPC.

## Hard Rules

- **h3 v2 only**: pin is `h3@2.0.1-rc.31` in `apps/api/package.json`. v2
  switched to the Fetch API: `event.req` is a `Request`, `event.res`
  is a `Response`. The v1 `event.node.req` / `event.node.res` (IncomingMessage
  / ServerResponse) fields still exist but are node-specific escape hatches.
  Prefer `event.req.headers` over `event.node.req.headers`.
- **Cookies live on `event.req.headers.get("cookie")`** in v2, NOT on
  `event.node.req.headers`. `getCookie(event, name)` reads from the Fetch
  Request. If you write a cookie to `event.node.req.headers` instead, the
  ORPC bridge (which materializes a hybrid `H3Event` for handlers)
  must manually forward it — see the `cookies` plumbing in
  `apps/api/src/http/orpc-bridge.ts`. Bug class to avoid.
- **`setCookie` writes to `event.res.headers`** (the Fetch Response the
  bridge propagates back to nitro). Setting cookies via `event.node.res.setHeader`
  works only if the handler is called directly from nitro; under the ORPC
  bridge, prefer `event.res.headers.append("set-cookie", ...)`.
- **`readValidatedBody(event, schema.parse)` is the canonical body validator**
  — it parses JSON, runs the schema, and returns typed data. Do NOT
  `event.req.json()` then re-validate manually. Same pattern:
  `getValidatedQuery`, `getValidatedRouterParams`.
- **Handers return `Response`**, not plain objects. `Response.json(...)`
  for JSON, `new Response(null, { status: 204 })` for empty. Returning a
  bare object works only in direct nitro dispatch (not under the ORPC
  bridge — see `invokeH3HandlerAndParse` in `orpc-bridge.ts`).
- **Errors thrown from handlers are caught by nitro** and become 500
  unless the handler itself returns a 4xx/5xx `Response`. If you throw a
  domain error (`TaskNotFound`, `InvalidClientInput`, etc.), map it to a
  status code in the handler — do not rely on nitro's default behavior.
- **Hybrid `H3Event` from ORPC bridge**: when a handler runs under the
  bridge, `event.req` is a fresh `Request` with the ORPC unwrapped body,
  but `event.node.req.headers/url/method` and `event.node.res` come from
  the base event so cookies set via `setCookie` propagate to the real
  response. Read this section of `orpc-bridge.ts` before debugging
  cookie or session propagation issues.

## Decision Gates

| Need | Action |
| ------ | -------- |
| Read a cookie | `getCookie(event, "name")` — handles the parse + decode. |
| Set a cookie | `setCookie(event, "name", value, { httpOnly, secure, sameSite, path, maxAge })`. Use `httpOnly: true` for session tokens. |
| Read a header | `getHeader(event, "name")`. Case-insensitive lookup. |
| Read the request body | `await readValidatedBody(event, schema.parse)`. Schema is zod (or valibot). Throws on validation failure. |
| Read query params | `await getValidatedQuery(event, schema.parse)`. |
| Read route params | `await getValidatedRouterParams(event, schema.parse)`. |
| Read user id from session | `readUserId(event)` — project helper that wraps `getSession(event)?.userId`. Don't reimplement. |
| Throw a domain error | Map in the handler — return `Response.json({ code: "TASK_NOT_FOUND", message: "..." }, { status: 404 })`. Do not throw. |
| Write to response body | `Response.json(result)` or `new Response(JSON.stringify(result), { headers: { "content-type": "application/json" } })`. |
| Stream a response | `new Response(readableStream, { headers: ... })`. Not used today; reserve for file downloads. |
| WebSocket | `defineWebSocketHandler({ open, message, close })`. Mounted via `app.get("/_ws", defineWebSocketHandler(...))`. Not used today. |

## Execution Steps

### Canonical handler shape

```ts
import type { H3Event } from "h3";
import { readValidatedBody, getCookie } from "h3";
import { z } from "zod";

const inputSchema = z.object({
  client_id: z.string().uuid(),
  notes: z.string().max(500).optional(),
});

export function createUpdateClientHandler(deps: UpdateClientDeps) {
  return async (event: H3Event): Promise<Response> => {
    const session = getCookie(event, "crm_session");
    if (!session) {
      return Response.json(
        { defined: true, code: "UNAUTHORIZED", message: "Missing session" },
        { status: 401 },
      );
    }
    const input = await readValidatedBody(event, inputSchema.parse);
    const updated = await deps.updateClient.execute({ ...input, session });
    return Response.json(updated);
  };
}
```

The handler factory `createXxxHandler(deps)` closes over its dependencies
(DB, repos, clock). The composition root wires the concrete deps and
exposes the resulting function. Unit tests construct deps as fakes.

### Error mapping

Map domain errors to status + code in the handler. Project convention is
`{ defined: true, code: "TASK_NOT_FOUND", message: "..." }` (the `defined: true`
flag is what ORPC's bridge uses to recognize a structured error envelope).
See `apps/api/src/http/tasks/error-mapping.ts` for the canonical mapper.

```ts
import { mapTaskErrorToStatus } from "../tasks/error-mapping";

export function createListTasksHandler(deps: ListTasksDeps) {
  return async (event: H3Event): Promise<Response> => {
    try {
      const rows = await deps.listTasks.execute({ userId: readUserId(event) });
      return Response.json(rows);
    } catch (err) {
      const { status, body } = mapTaskErrorToStatus(err);
      return Response.json(body, { status });
    }
  };
}
```

### Testing

- Construct a stub `H3Event` via `buildH3Event(options)` from
  `apps/api/src/http/orpc-bridge.ts`. Set `cookies`, `headers`, `body`,
  `query` as needed.
- Assert the handler returns a `Response` with the expected status +
  body. Use `response.json()` to parse.
- For 4xx/5xx cases, assert the `code` field in the body envelope.

### Cookie propagation under the ORPC bridge

The ORPC bridge materializes a hybrid `H3Event` per request: `event.req`
is a new `Request` with the unwrapped ORPC body + cookie header from the
base; `event.node.req/res` come from the base nitro event. When a handler
calls `setCookie(event, "crm_session", value, opts)`:

1. h3 v2 reads `event.req.headers` (the new Request) and writes to
   `event.res.headers` (the new Response it builds internally).
2. The bridge copies that Response's headers into the base event's
   Response before returning to nitro.
3. Nitro propagates the headers to the client.

If a handler writes cookies via `event.node.res.setHeader(...)` directly,
step 1 is bypassed and the cookie does not reach the client. Use
`setCookie` from h3 — it goes through the right path.

## Output Contract

When extending the API:

- Handlers are h3-shaped: `(event: H3Event) => Promise<Response>`.
- Validation goes through `readValidatedBody` / `getValidatedQuery` /
  `getValidatedRouterParams` — never raw `req.json()` + manual parse.
- Cookies set via `setCookie(event, ...)` from h3 — never raw
  `event.node.res.setHeader("set-cookie", ...)` (works under direct
  nitro, breaks under the ORPC bridge).
- Domain errors map to `{ defined: true, code, message }` envelopes with
  the appropriate HTTP status.
- Unit tests use `buildH3Event` from `orpc-bridge.ts` for the stub event.

## References

- <https://h3.unjs.io> — official h3 v2 docs.
- <https://context7.com/h3js/h3/llms.txt> — current upstream dump.
- `apps/api/src/http/orpc-bridge.ts` — the ORPC↔h3 bridge, including the
  cookie-propagation rationale and `buildH3Event` test helper.
- `apps/api/src/http/auth/auth-routes.ts` — canonical handlers with
  `getCookie` + `setSessionCookie` + zod-validated bodies.
- `.pi/skills/nitro/SKILL.md` — the wiring layer above h3.
