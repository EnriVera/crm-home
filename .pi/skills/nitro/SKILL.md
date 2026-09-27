---
name: nitro
description: "Trigger: nitro, nitro.config.ts, defineNitroConfig, nitro dev, nitro build, h3 handler, composition root, scheduled tasks, preset bun. Nitro v3 server framework for the CRM-Home API. Use when wiring HTTP routes (apps/api/src/http/), configuring presets/runtimes, adding background tasks or scheduled jobs, or debugging why a nitro endpoint returns the wrong shape."
license: Apache-2.0
metadata:
  author: "enri"
  version: "1.0"
---

# Nitro

## Activation Contract

Activate when editing `apps/api/nitro.config.ts`, adding or moving HTTP
routes under `apps/api/src/http/`, configuring the dev/prod runtime preset
(bun / node / deno / vercel / cloudflare), wiring background tasks or
cron-scheduled jobs, or debugging why a route returns the wrong status
or body shape. Nitro is the only HTTP entry point for the API; the
Octane fullstack shell never calls nitro directly — `@orpc/server` does
via an h3 bridge (see `.pi/skills/h3/SKILL.md`).

## Hard Rules

- **Single composition root**: every HTTP request flows through
  `apps/api/src/http/composition-root.ts`. New handlers do NOT register
  their own `route:` entries in `nitro.config.ts` — they hang off the
  composition root, which dispatches to the ORPC router. The
  `route: "/**"` declaration is the only one; keep it that way.
- **v3 only**: pin is `nitro@3.0.0` in `apps/api/package.json`. The config
  API moved to `defineNitroConfig({...})` from `nitro/config` (not the
  older `nitropack` import). Handlers do not import nitro types directly;
  they receive `H3Event` from h3 and return `Response` (see `.pi/skills/h3/SKILL.md`).
- **Bun preset is the dev and prod runtime**: `preset: "bun"` is pinned
  for `bun run dev` and the production start script. Switching to node
  preset requires verifying every dep — `apps/api/src/infrastructure/email/`
  uses `node:fs/promises` and similar node built-ins; bun handles them
  transparently today.
- **Tasks live in `apps/api/tasks/<task-name>.ts`**. Each task is a file
  exporting a `defineTask({ meta: { name, description }, run: async (ctx) => {...} })`.
  Tasks are registered under `nitro.config.ts > tasks: { "<name>": {...} }`
  and may be invoked manually (`nitro task run <name>`) or via cron
  (`scheduledTasks: { "*/1 * * * *": ["email-sending"] }`).
- **No business logic in `nitro.config.ts`**. Config is wiring only
  (routes, presets, tasks, storage). All real handlers live under
  `apps/api/src/http/` and consume the composition root.
- **No direct `@orpc/server` import from a handler file**. Handlers stay
  h3-shaped (`(event: H3Event) => Promise<Response>`); the ORPC bridge
  in `apps/api/src/http/orpc-bridge.ts` is the only place that builds an
  h3-event-shaped view of an ORPC procedure input. This keeps the two
  protocols decoupled and the handlers reusable from non-ORPC callers
  (tests, future HTTP entry points).

## Decision Gates

| Need | Action |
| ------ | -------- |
| Add an HTTP endpoint | Add a procedure to the ORPC router under `apps/api/src/http/router.ts`. Do NOT add `route:` entries to `nitro.config.ts`. |
| Background work (email draining, cleanup, etc.) | Add a `tasks/<name>.ts` file + register in `nitro.config.ts > tasks`. Use `scheduledTasks` for cron, manual `nitro task run <name>` for ad-hoc. |
| Scheduled job (recurring) | Add to `scheduledTasks: { "<cron>": ["<task-name>"] }` in `nitro.config.ts`. Cron is standard 5-field syntax. |
| Storage (redis, fs, memory) | Configure under `storage: { <name>: { driver, ... } }` in `nitro.config.ts`. Use `useStorage("<name>")` from `nitro/runtime` in the handler. Today no storage is configured. |
| Switch runtime (bun → node / deno / cloudflare) | Update `preset` in `nitro.config.ts` and verify every dep works under the new runtime. Bun is the chosen default — do not switch without an explicit decision. |
| Test a handler | Handler is `(event: H3Event) => Promise<Response>`. Construct a stub `H3Event` via `buildH3Event()` from `orpc-bridge.ts` and assert the Response shape. |
| Add middleware (auth, logging) | Add to `apps/api/src/http/router.ts` as a `before:` middleware in the ORPC router, or in the composition root if it must run before ORPC dispatch. |

## Execution Steps

### Handler shape

Handlers are plain `(event: H3Event) => Promise<Response>` — no nitro
imports, no ORPC coupling:

```ts
// apps/api/src/http/tasks/example.ts
import type { H3Event } from "h3";
import { readValidatedBody } from "h3";
import { z } from "zod";

const inputSchema = z.object({ id: z.string().uuid() });

export async function createMyHandler(deps: MyDeps) {
  return async (event: H3Event): Promise<Response> => {
    const { id } = await readValidatedBody(event, inputSchema.parse);
    const result = await deps.doThing(id);
    return Response.json(result);
  };
}
```

The handler is a factory `createXxxHandler(deps)` that closes over its
dependencies (DB, repos, clock). The composition root wires the concrete
deps and registers the resulting function. This keeps handlers pure
relative to composition — unit tests construct deps as fakes without
touching the DB.

### Composition root

`apps/api/src/http/composition-root.ts` is the only file that imports
every handler factory, every domain service, and every infra adapter.
It exposes a single `fetch`-shaped handler that nitro mounts at `/**`:

```ts
import { createAuthRouter } from "./router"; // ORPC router
import { createRequestOtpHandler } from "./auth/auth-routes";

export default defineEventHandler(async (event) => {
  // health, auth, etc. dispatch here; ORPC routes mount under /rpc/*
  ...
});
```

When adding a new module, add its handler factory to this file. Do NOT
introduce new `route:` entries in `nitro.config.ts`.

### Task module

```ts
// apps/api/tasks/email-sending.ts
import { defineTask } from "nitro/runtime";

export default defineTask({
  meta: { name: "email-sending", description: "Drain email_sending queue" },
  async run(ctx) {
    // ctx has logger, signal for graceful shutdown, etc.
    const drained = await drainQueue(...);
    return { result: drained };
  },
});
```

Register in `nitro.config.ts`:

```ts
tasks: {
  "email-sending": {
    handler: "./tasks/email-sending.ts",
    description: "Drena la cola email_sending y envía los mensajes pendientes",
  },
},
scheduledTasks: {
  "*/1 * * * *": ["email-sending"],
},
```

### Local dev loop

```bash
# API alone:
cd apps/api && bun run dev

# Whole stack (web + api):
# from repo root: bun run dev (each workspace)
```

`bun run dev` in `apps/api/` runs `nitro dev` which compiles on demand
and watches for changes. The ORPC bridge is rebuilt automatically; the
composition root resolves at request time.

## Output Contract

When extending the API:

- Handlers stay h3-shaped — never import `@orpc/server` directly.
- New background work goes in `tasks/<name>.ts`, registered in
  `nitro.config.ts`.
- New HTTP routes go in the ORPC router, not in `nitro.config.ts`.
- Composition root is the single wiring point — every handler factory
  is imported there exactly once.
- `defineNitroConfig` is the only call to make in `nitro.config.ts`;
  no business logic, no helpers.

## References

- <https://nitro.build> — official docs (config, tasks, storage, presets).
- <https://context7.com/nitrojs/nitro/llms.txt> — current upstream dump.
- `apps/api/nitro.config.ts` — the actual config in this repo.
- `apps/api/src/http/composition-root.ts` — composition root (read this
  before adding any new module).
- `.pi/skills/h3/SKILL.md` — h3 v2 contract that handlers must respect.
