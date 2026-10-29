import { assign, setup } from "xstate";
import { elapsedSeconds, type TimerRun } from "~/domain/schedule/entities";

/**
 * Timer workflow (PRD-v4 §11.1: los workflows van en XState).
 *
 * La máquina modela el ESTADO DEL TIMER, no el del server: el `start` es
 * del servidor, así que el reloj local se recalcula desde ahí (cerrar el
 * browser no pierde tiempo — criterio de PRD-v2 §8.4).
 *
 * - `idle`: no hay timer corriendo.
 * - `running`: hay una corrida abierta; el elapsed se recalcula en cada
 *   tick contra la hora del server.
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
        // Un START mientras ya corre REEMPLAZA la corrida: el server cierra
        // la anterior y abre la nueva (regla "un timer abierto"), así que la
        // UI tiene que adoptar la nueva. Sin esta transición el `START`
        // se ignoraba y la barra seguía mostrando la corrida ya cerrada,
        // con su reloj corriendo y sin forma de pararla.
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
