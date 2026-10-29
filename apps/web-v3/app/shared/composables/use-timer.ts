import { computed, onBeforeUnmount, ref, shallowRef } from "vue";
import { createActor } from "xstate";
import {
  longestRun,
  startOfDay,
  startOfWeek,
  totalSeconds,
  type TimerRun,
} from "~/domain/schedule/entities";
import { timerMachine } from "~/machine/timer";
import {
  getCurrentTimer,
  heartbeatTimer,
  listTimerRuns,
  startTimer as startTimerRequest,
  stopTimer as stopTimerRequest,
} from "~/infrastructure/schedule/orpc-timer";

/** How often the timer sends its heartbeat to the server (PRD-v2 §8.4). */
const HEARTBEAT_MS = 60_000;
/** How often the elapsed time on screen is recalculated. */
const TICK_MS = 1_000;

/**
 * useTimer: the state of /schedules (PRD-v4 §8.5).
 *
 * The server is the source of truth: `current` returns the open run with
 * its original `start`, so reloading the page does not lose the time
 * (PRD-v2 §8.4 criterion).
 *
 * The workflow is handled by an XState machine (PRD-v4 §11.1) and the machine
 * only mirrors the state: the elapsed is recalculated against the server time.
 */
export function useTimer() {
  const actor = createActor(timerMachine);
  actor.start();

  // The XState snapshot is not reactive for Vue: it is kept in a ref and
  // updated on every transition (the canonical Vue + XState pattern).
  const snapshot = shallowRef(actor.getSnapshot());
  actor.subscribe((next) => {
    snapshot.value = next;
  });

  const history = ref<TimerRun[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const now = ref(new Date());

  const run = computed(() => snapshot.value.context.run);
  const elapsedSeconds = computed(() => snapshot.value.context.elapsedSeconds);
  const isRunning = computed(() => snapshot.value.matches("running"));

  let tickTimer: ReturnType<typeof setInterval> | undefined;
  let beatTimer: ReturnType<typeof setInterval> | undefined;
  // Guardian against out-of-order responses: every sync and every
  // start/stop takes a number and the late one discards its response.
  let syncGeneration = 0;

  function startTicking() {
    if (tickTimer) return;
    tickTimer = setInterval(() => {
      now.value = new Date();
      actor.send({ type: "TICK", now: now.value });
    }, TICK_MS);
  }

  function stopTicking() {
    clearInterval(tickTimer);
    tickTimer = undefined;
  }

  function startHeartbeat(timerId: string) {
    clearInterval(beatTimer);
    beatTimer = setInterval(() => {
      void heartbeatTimer(timerId).catch(() => {
        // A failed heartbeat does not stop the timer: the server keeps running.
      });
    }, HEARTBEAT_MS);
  }

  function stopHeartbeat() {
    clearInterval(beatTimer);
    beatTimer = undefined;
  }

  /** Syncs with the server (when opening the screen). */
  async function sync() {
    isLoading.value = true;
    error.value = null;
    // Every sync takes a generation number. If the user started or stopped a
    // timer meanwhile, the sync that arrives late discards its response:
    // otherwise a late SYNC resurrected in the UI a timer that was already
    // stopped (or erased one that had just been started).
    const generation = ++syncGeneration;
    try {
      const [current, runs] = await Promise.all([
        getCurrentTimer(),
        listTimerRuns({ limit: 200 }),
      ]);
      if (generation !== syncGeneration) return;
      history.value = runs;
      actor.send({ type: "SYNC", run: current, now: new Date() });
      if (current) {
        startTicking();
        startHeartbeat(current.id);
      } else {
        stopTicking();
        stopHeartbeat();
      }
    } catch {
      if (generation !== syncGeneration) return;
      error.value = "schedules.loadError";
    } finally {
      if (generation === syncGeneration) isLoading.value = false;
    }
  }

  /** Starts a timer (free or linked to a task). */
  async function start(input: {
    title: string;
    taskId?: string | null;
    clientId?: string | null;
    typeId?: string | null;
    categoryId?: string | null;
    origin?: "manual" | "resumed";
  }): Promise<TimerRun> {
    error.value = null;
    // A start invalidates any sync in flight: its response is older.
    ++syncGeneration;
    const started = await startTimerRequest({
      title: input.title,
      taskId: input.taskId ?? null,
      clientId: input.clientId ?? null,
      typeId: input.typeId ?? null,
      categoryId: input.categoryId ?? null,
      origin: input.origin ?? "manual",
    });
    actor.send({ type: "START", run: started, now: new Date() });
    startTicking();
    startHeartbeat(started.id);
    await refreshHistory();
    return started;
  }

  /** Stops the timer. */
  async function stop(): Promise<TimerRun | null> {
    const current = run.value;
    if (!current) return null;
    error.value = null;
    // A stop invalidates any sync in flight: its response is older.
    ++syncGeneration;
    const closed = await stopTimerRequest(current.id);
    actor.send({ type: "STOPPED", run: closed });
    stopTicking();
    stopHeartbeat();
    await refreshHistory();
    return closed;
  }

  async function refreshHistory() {
    history.value = await listTimerRuns({ limit: 200 });
  }

  /** The catalog totals: today, this week and the task with the most hours. */
  const todaySeconds = computed(() =>
    totalSeconds(history.value, startOfDay(now.value), now.value, now.value),
  );
  const weekSeconds = computed(() =>
    totalSeconds(history.value, startOfWeek(now.value), now.value, now.value),
  );
  const longest = computed(() =>
    longestRun(history.value, startOfWeek(now.value), now.value, now.value),
  );

  onBeforeUnmount(() => {
    stopTicking();
    stopHeartbeat();
    actor.stop();
  });

  return {
    run,
    history,
    elapsedSeconds,
    isRunning,
    isLoading,
    error,
    todaySeconds,
    weekSeconds,
    longest,
    now,
    sync,
    start,
    stop,
    refreshHistory,
  };
}
