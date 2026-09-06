import { describe, expect, it } from "bun:test";
import { createActor, createMachine } from "xstate";

describe("infrastructure/xstate smoke", () => {
  it("una máquina mínima arranca en su estado inicial", () => {
    const actor = createActor(
      createMachine({ initial: "idle", states: { idle: {} } }),
    ).start();
    expect(actor.getSnapshot().value).toBe("idle");
  });
});
