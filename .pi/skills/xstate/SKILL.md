---
name: xstate
description: "Trigger: xstate, state machine, finite state machine, fsm, setup, createActor, fromPromise, waitFor, actor, snapshot, transitions, guards, actions, OTP state. XState v5 state machines in the CRM-Home octane fullstack app. Use when modeling a workflow with discrete states (auth flow, OTP, kanban reorder, side effects), wiring an xstate machine into a .tsrx component via @octanejs/xstate, or debugging state transitions / actor lifecycle."
license: Apache-2.0
metadata:
  author: "enri"
  version: "1.0"
---

# Xstate

## Activation Contract

Activate when modeling a domain workflow as a finite state machine, when
debugging actor transitions or stuck states in `apps/web/src/lib/otp/` or
similar pure-machine modules, or when wiring an existing xstate machine into
an octane component via `@octanejs/xstate`. XState is the chosen base for any
non-trivial state with branching transitions — do not hand-roll a state
machine with `useState` + `useEffect` when xstate already provides the
invariants.

## Hard Rules

- **v5 only**: `setup({ types, actors, guards, actions }).createMachine({...})`
  is the canonical shape. v4 `Machine({...})` is NOT supported by the deps
  in `apps/web/package.json` (`xstate@5.32.6`). v5 inference is strict —
  declare `types.context` and `types.events` in `setup()` so `assign` /
  `guard` callbacks see the right shapes without explicit generics.
- **Adapter is `@octanejs/xstate`, not `@xstate/react`**. The React adapter
  drags React's scheduler into octane runtime (same crash class as the
  wouter adapter — see `.pi/skills/octane/SKILL.md`). For octane, prefer
  the pure `createActor` + `getSnapshot` pattern and let octane's
  `useSyncExternalStore` (or a thin wrapper) trigger re-renders.
- **Pure machine + façade adapter pattern**: keep the machine definition
  (`createXxxMachineDef`) in a `.ts` module and export a thin façade
  (`createXxxMachine`) that wraps the actor with a stable domain interface.
  Consumers import only the façade — swapping the machine internals does
  not break callers. See `apps/web/src/lib/otp/otp-machine.ts` for the
  canonical example.
- **`onError` on `invoke` is mandatory for any RPC-backed actor**. Without
  it, a thrown error kills the actor silently and the state machine stays
  in `submitting` forever (the OTP form bug). Pattern:

  ```ts
  invoke: {
    src: "verifier",
    input: ({ context }) => ({ code: context.code }),
    onDone: [...],
    onError: {
      target: "error",
      actions: assign({ attemptsRemaining: ({ context }) => context.attemptsRemaining - 1 }),
    },
  }
  ```

- **Context holds data, states are categorical**. Constants like
  `OTP_MAX_ATTEMPTS` and `OTP_CODE_LENGTH` live in the context (data),
  not as transition string literals. The D9 → D-SA4 migration history is
  preserved in `otp-machine.ts` for the rationale.
- **`waitFor(actor, predicate)` over polling `getSnapshot`** when awaiting
  a transition from outside the machine. It is the only public v5 API that
  resolves when the actor leaves the current state — polling misses
  intermediate transitions and races with re-renders.
- **`guard` callbacks receive `{ context, event }`**, not positional args.
  Same for `assign` actions.

## Decision Gates

| Need | Action |
| ------ | -------- |
| Discrete state with branching transitions | XState v5 `setup().createMachine()` — see `otp-machine.ts` for the canonical reference. |
| RPC-backed side effect from a state | `invoke: { src: fromPromise(...), input: ..., onDone, onError }`. Always define `onError` (see Hard Rules). |
| Stateless UI (loading/error/empty/data) | Use `useFetch` from `apps/web/src/hooks/use-fetch.ts` — do NOT pull in xstate for trivial states. |
| Persist state across page reloads | xstate v5 has a `persistence` plugin; check the official docs. Today the OTP machine is in-memory only — persistence is a follow-up if needed. |
| Visualize the machine | Use <https://stately.ai/registry/editor> — paste the machine JSON. Not installed locally; treat as a reference tool. |
| Need React hooks (useMachine) | Wrong adapter — see `.pi/skills/octane/SKILL.md`. Use the pure actor + `useSyncExternalStore` pattern instead. |

## Execution Steps

### Module layout

```text
apps/web/src/lib/<feature>/
├── <feature>-machine.ts        # pure TS — machine def + façade + types
├── <feature>-machine.test.ts   # bun test — headless actor tests
└── <feature>-machine.smoke.test.ts # optional: integration with real RPC
```

The machine module is pure TS (no octane imports). The façade
(`create<Feature>Machine`) exposes a domain interface — never re-export the
`Actor` or `StateMachine` types to consumers. This isolates the v5 API
behind a stable contract.

### Façade pattern (canonical)

```ts
import { createActor, fromPromise, setup, waitFor } from "xstate";

export function createMyMachineDef(options: MyOptions) {
  return setup({
    types: { context: {} as Ctx, events: {} as Evt },
    actors: {
      rpc: fromPromise<Output, Input>(({ input }) => callRpc(input)),
    },
    guards: { isComplete: ({ event }) => /* ... */ },
    actions: { assignX: assign({ x: ({ event }) => /* ... */ }) },
  }).createMachine({
    id: "my",
    initial: "idle",
    context: { /* ... */ },
    states: {
      idle: { on: { SET: { target: "ready", actions: "assignX" } } },
      ready: { on: { SUBMIT: { target: "submitting" } } },
      submitting: {
        invoke: {
          src: "rpc",
          input: ({ context }) => ({ /* ... */ }),
          onDone: [{ guard: ({ event }) => event.output.ok, target: "success" }],
          onError: { target: "error", actions: /* decrement */ },
        },
      },
      error: { on: { SET: { target: "ready", actions: "assignX" } } },
      success: { type: "final" },
    },
  });
}

export interface MyMachine { getState(): MyState; send(...): void; }
export function createMyMachine(options: MyOptions): MyMachine {
  const actor = createActor(createMyMachineDef(options)).start();
  return {
    getState() {
      const snap = actor.getSnapshot();
      return { status: snap.value as Status, /* ... */ };
    },
    async submit() {
      actor.send({ type: "SUBMIT" });
      await waitFor(actor, (s) => s.value !== "submitting");
    },
    /* ... */
  };
}
```

### Wiring into an octane component

For UI state, use `octane`'s `useSyncExternalStore` to subscribe to the
actor's snapshot. The façade stays domain-only; the component is the
adapter to octane reactivity.

```tsrx
import { useSyncExternalStore } from "octane";
import { createMyMachine, type MyMachine } from "../lib/<feature>/<feature>-machine.ts";

export function MyPage() @{
  const machine = useMemo(() => createMyMachine({ rpc: realRpc }), []);
  const state = useSyncExternalStore(
    (cb) => machine.subscribe(cb),
    () => machine.getState(),
    () => machine.getState(), // SSR snapshot — same as client initial
  );
  ...
}
```

For OTP specifically, `apps/web/src/lib/otp/otp-machine.ts` exposes
`createOtpMachine` and the `vendor/otp-input/otp-input.tsrx` consumes it
through the zag pin-input wrapper (not directly via octane component).

### Testing

- `bun test <feature>-machine.test.ts` — headless actor tests. Spawn the
  actor, send events, assert `getSnapshot().value` and context.
- Cover all `onDone` branches of `invoke` (success, expected-error, throw).
- Cover `onError` explicitly — the OTP machine has a smoke test that
  triggers a thrown error and asserts the transition to `error` + attempt
  decrement.

## Output Contract

When adding an xstate machine to CRM-Home:

- Two exports per module: `create<Feature>MachineDef(options)` (machine
  factory, pure) and `create<Feature>Machine(options)` (façade wrapping
  the actor).
- Façade exposes only domain types (`MyState`, `MyMachine`), never
  `Actor` or `StateMachine` from xstate.
- Every `invoke` defines `onError` — no silent actor death.
- `setup().types.context` and `setup().types.events` are declared so
  callbacks infer correctly.
- Headless test covers all `onDone` branches + `onError`.

## References

- <https://stately.ai/docs/xstate> — official v5 docs (machines, actors,
  guards, actions, persisted state).
- <https://stately.ai/docs/migration> — v4 → v5 migration guide (no `Machine`
  constructor, new `setup` API).
- <https://context7.com/statelyai/xstate/llms.txt> — current upstream dump
  for offline reference.
- `apps/web/src/lib/otp/otp-machine.ts` — canonical example of the
  pure-machine + façade pattern, with `onError` rationale.
