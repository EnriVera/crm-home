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

/** Cada cuánto el timer manda su latido al server (PRD-v2 §8.4). */
const HEARTBEAT_MS = 60_000;
/** Cada cuánto se recalcula el elapsed en pantalla. */
const TICK_MS = 1_000;

/**
 * useTimer: el estado del /schedules (PRD-v4 §8.5).
 *
 * El server es la fuente de verdad: `current` devuelve la corrida abierta
 * con su `start` original, así que recargar la página no pierde el tiempo
 * (criterio de PRD-v2 §8.4).
 *
 * El workflow lo maneja una máquina de XState (PRD-v4 §11.1) y la máquina
 * sólo refleja el estado: el elapsed se recalcula contra la hora del server.
 */
export function useTimer() {
  const actor = createActor(timerMachine);
  actor.start();

  // El snapshot de XState no es reactivo para Vue: se guarda en un ref y se
  // actualiza con cada transición (el patrón canónico Vue + XState).
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
  // Guardián contra respuestas fuera de orden: cada sync y cada
  // start/stop toman un número y el que llega tarde lo descarta.
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
        // Un latido fallido no corta el timer: el server sigue corriendo.
      });
    }, HEARTBEAT_MS);
  }

  function stopHeartbeat() {
    clearInterval(beatTimer);
    beatTimer = undefined;
  }

  /** Sincroniza con el server (al abrir la pantalla). */
  async function sync() {
    isLoading.value = true;
    error.value = null;
    // Cada sync toma un número de generación. Si mientras tanto el usuario
    // arrancó o paró un timer, el sync que vuelve atrás descarta su
    // respuesta: si no, un SYNC tardío resucitaba en la UI un timer ya
    // parado (o borraba uno recién arrancado).
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

  /** Arranca un timer (libre o ligado a una task). */
  async function start(input: {
    title: string;
    taskId?: string | null;
    clientId?: string | null;
    typeId?: string | null;
    categoryId?: string | null;
    origin?: "manual" | "resumed";
  }): Promise<TimerRun> {
    error.value = null;
    // Un start invalida cualquier sync en vuelo: su respuesta es anterior.
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

  /** Para el timer. */
  async function stop(): Promise<TimerRun | null> {
    const current = run.value;
    if (!current) return null;
    error.value = null;
    // Un stop invalida cualquier sync en vuelo: su respuesta es anterior.
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

  /** Los totals del catálogo: hoy, esta semana y la tarea con más horas. */
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
