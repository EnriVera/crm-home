import { describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { timerMachine } from "~/machine/timer";
import type { TimerRun } from "~/domain/schedule/entities";

function run(start: string): TimerRun {
  return {
    id: "t1",
    title: "Diseño",
    taskId: null,
    clientId: null,
    typeId: null,
    categoryId: null,
    start: new Date(start),
    end: null,
    durationSeconds: null,
    origin: "manual",
    lastHeartbeat: null,
  };
}

describe("timer machine", () => {
  it("starts idle with no run", () => {
    const actor = createActor(timerMachine).start();
    const snapshot = actor.getSnapshot();
    expect(snapshot.matches("idle")).toBe(true);
    expect(snapshot.context.run).toBeNull();
    actor.stop();
  });

  it("moves to running with the elapsed against the server start", () => {
    const actor = createActor(timerMachine).start();
    actor.send({
      type: "START",
      run: run("2026-06-28T09:00:00"),
      now: new Date("2026-06-28T10:00:00"),
    });
    const snapshot = actor.getSnapshot();
    expect(snapshot.matches("running")).toBe(true);
    expect(snapshot.context.elapsedSeconds).toBe(3600);
    actor.stop();
  });

  it("recalculates the elapsed on every tick (total since the server start)", () => {
    const actor = createActor(timerMachine).start();
    actor.send({
      type: "START",
      run: run("2026-06-28T09:00:00"),
      now: new Date("2026-06-28T10:00:00"),
    });
    actor.send({ type: "TICK", now: new Date("2026-06-28T10:05:00") });
    // 09:00 → 10:05 = 65 minutos.
    expect(actor.getSnapshot().context.elapsedSeconds).toBe(3900);
    actor.stop();
  });

  it("goes back to idle when the timer is stopped", () => {
    const actor = createActor(timerMachine).start();
    actor.send({
      type: "START",
      run: run("2026-06-28T09:00:00"),
      now: new Date("2026-06-28T10:00:00"),
    });
    actor.send({
      type: "STOPPED",
      run: { ...run("2026-06-28T09:00:00"), end: new Date(), durationSeconds: 3600 },
    });
    const snapshot = actor.getSnapshot();
    expect(snapshot.matches("idle")).toBe(true);
    expect(snapshot.context.run).toBeNull();
    actor.stop();
  });

  it("syncs with the server: a run keeps it running, none clears it", () => {
    const actor = createActor(timerMachine).start();

    actor.send({
      type: "SYNC",
      run: run("2026-06-28T09:00:00"),
      now: new Date("2026-06-28T10:00:00"),
    });
    expect(actor.getSnapshot().matches("running")).toBe(true);
    expect(actor.getSnapshot().context.elapsedSeconds).toBe(3600);

    actor.send({ type: "SYNC", run: null, now: new Date("2026-06-28T10:00:00") });
    expect(actor.getSnapshot().matches("idle")).toBe(true);
    expect(actor.getSnapshot().context.elapsedSeconds).toBe(0);
    actor.stop();
  });
});
