import { assign, setup } from "xstate";
import { elapsedSeconds, type TimerRun } from "~/domain/schedule/entities";

/**
 * Timer workflow (PRD-v4 §11.1: workflows live in XState).
 *
 * The machine models the TIMER STATE, not the server's: the `start` comes
 * from the server, so the local clock is recalculated from it (closing the
 * browser does not lose time — PRD-v2 §8.4 criterion).
 *
 * - `idle`: no timer is running.
 * - `running`: there is an open run; the elapsed is recalculated on every
 *   tick from the server's `start` with the local clock (the server owns
 *   the start instant, the browser owns the ticking).
 */
export interface TimerContext {
  run: TimerRun | null;
  elapsedSeconds: number;
}

export type TimerEvent =
  | { type: "START"; run: TimerRun; now: Date }
  | { type: "STOPPED"; run: TimerRun }
  | { type: "TICK"; now: Date }
  | { type: "SYNC"; run: TimerRun | null; now: Date };

export const timerMachine = setup({
  types: {
    context: {} as TimerContext,
    events: {} as TimerEvent,
  },
  guards: {
    hasRun: ({ event }) =>
      event.type === "SYNC" ? event.run !== null : false,
  },
  actions: {
    setRun: assign(({ event, context }) => {
      if (event.type !== "START") return {};
      return {
        run: event.run,
        elapsedSeconds: elapsedSeconds(event.run, event.now),
      };
    }),
    tick: assign(({ event, context }) => {
      if (event.type !== "TICK" || !context.run) return {};
      return { elapsedSeconds: elapsedSeconds(context.run, event.now) };
    }),
    sync: assign(({ event }) => {
      if (event.type !== "SYNC" || !event.run) return {};
      return {
        run: event.run,
        elapsedSeconds: elapsedSeconds(event.run, event.now),
      };
    }),
    clearRun: assign({ run: null, elapsedSeconds: 0 }),
  },
}).createMachine({
  id: "timer",
  initial: "idle",
  context: { run: null, elapsedSeconds: 0 },
  states: {
    idle: {
      on: {
        START: { target: "running", actions: "setRun" },
        SYNC: [
          { guard: "hasRun", target: "running", actions: "sync" },
          { target: "idle", actions: "clearRun" },
        ],
      },
    },
    running: {
      on: {
        // A START while already running REPLACES the run: the server closes
        // the previous one and opens the new one (the "one open timer" rule),
        // so the UI has to adopt the new one. Without this transition the
        // `START` was ignored and the bar kept showing the already closed run,
        // with its clock ticking and no way to stop it.
        START: { actions: "setRun" },
        TICK: { actions: "tick" },
        STOPPED: { target: "idle", actions: "clearRun" },
        SYNC: [
          { guard: "hasRun", target: "running", actions: "sync" },
          { target: "idle", actions: "clearRun" },
        ],
      },
    },
  },
});

export type TimerMachine = typeof timerMachine;
