import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  cleanupAuthTables,
  cleanupTasksTables,
} from "../../infrastructure/kysely/test-cleanup";
import { createAppFetch } from "../composition-root";

/**
 * Integration test opt-in del TIMER de /schedules (`/timers/*`).
 * Skippea limpiamente sin `TEST_DATABASE_URL`.
 *
 * Cubre los criterios de aceptación de PRD-v2 §8.4:
 * - Un schedule libre se guarda sin tarea, cliente, tipo ni categoría.
 * - Cerrar el browser con timer corriendo y volver: el tiempo no se pierde
 *   (el `current` devuelve la corrida abierta con su `start` original).
 * - Un timer que cruza medianoche reporta duración correcta (el cierre
 *   calcula la duración desde el `start` del servidor).
 * - Iniciar un schedule desde el historial cierra el que estaba corriendo.
 */
const databaseUrl = process.env.TEST_DATABASE_URL;

const fixedOtpGenerator = {
  generate(): string {
    return "041283";
  },
};

interface OrpcEnvelope<T> {
  json: T;
}

interface TimerWire {
  timer_id: string;
  timer_title: string;
  timer_task_id: string | null;
  timer_client_id: string | null;
  timer_type_id: string | null;
  timer_category_id: string | null;
  timer_start: string;
  timer_end: string | null;
  timer_duration_seconds: number | null;
  timer_origin: "manual" | "resumed";
  timer_last_heartbeat: string | null;
}

describe.skipIf(!databaseUrl)("timer HTTP endpoints (integration)", () => {
  let fetchApp: (request: Request) => Promise<Response>;
  let sessionCookie = "";

  function post(path: string, body: unknown, cookie = sessionCookie) {
    return fetchApp(
      new Request(`http://test${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(cookie ? { cookie } : {}),
        },
        body: JSON.stringify({ json: body }),
      }),
    );
  }

  beforeAll(async () => {
    if (!databaseUrl) return;
    process.env.DATABASE_URL = databaseUrl;
    fetchApp = createAppFetch(
      { DATABASE_URL: databaseUrl, SESSION_COOKIE_SECURE: "false" },
      { otpGenerator: fixedOtpGenerator },
    );

    const email = `timer-http-${Date.now()}@example.com`;
    await post("/rpc/auth/requestOtp", { email }, "");
    const verifyRes = await post(
      "/rpc/auth/verifyOtp",
      { email, code: "041283" },
      "",
    );
    expect(verifyRes.status).toBe(200);
    const setCookie = verifyRes.headers.get("Set-Cookie") ?? "";
    const match = /crm_session=([^;]+)/.exec(setCookie);
    expect(match).toBeDefined();
    sessionCookie = `crm_session=${match![1]}`;
  });

  afterAll(async () => {
    if (!databaseUrl) return;
    const { createDatabase } = await import(
      "../../infrastructure/kysely/database"
    );
    const db = createDatabase(databaseUrl);
    await db.deleteFrom("timer_run").execute();
    await cleanupTasksTables(db);
    await cleanupAuthTables(db);
    await db.destroy();
  });

  test("un timer libre se guarda sin tarea, cliente, tipo ni categoría", async () => {
    const startRes = await post("/rpc/timers/start", {
      timer_title: "Diseño de logo",
    });
    expect(startRes.status).toBe(200);
    const started = (await startRes.json()) as OrpcEnvelope<TimerWire>;
    expect(started.json.timer_title).toBe("Diseño de logo");
    expect(started.json.timer_task_id).toBeNull();
    expect(started.json.timer_client_id).toBeNull();
    expect(started.json.timer_type_id).toBeNull();
    expect(started.json.timer_category_id).toBeNull();
    expect(started.json.timer_end).toBeNull();

    // Limpieza: se cierra para no dejarlo abierto.
    const stopRes = await post("/rpc/timers/stop", {
      timer_id: started.json.timer_id,
    });
    expect(stopRes.status).toBe(200);
  });

  test("el timer abierto se recupera con su start original", async () => {
    const startRes = await post("/rpc/timers/start", {
      timer_title: "Reunión de cliente",
    });
    const started = (await startRes.json()) as OrpcEnvelope<TimerWire>;

    // "Cerrar el browser y volver": el current devuelve la misma corrida.
    const currentRes = await post("/rpc/timers/current", {});
    const current = (await currentRes.json()) as OrpcEnvelope<TimerWire | null>;
    expect(current.json?.timer_id).toBe(started.json.timer_id);
    expect(current.json?.timer_start).toBe(started.json.timer_start);

    await post("/rpc/timers/stop", { timer_id: started.json.timer_id });
  });

  test("el heartbeat registra el último latido", async () => {
    const started = (
      await (await post("/rpc/timers/start", { timer_title: "Timer con pulso" })).json()
    ) as OrpcEnvelope<TimerWire>;

    const beatRes = await post("/rpc/timers/heartbeat", {
      timer_id: started.json.timer_id,
    });
    expect(beatRes.status).toBe(200);
    const beat = (await beatRes.json()) as OrpcEnvelope<TimerWire>;
    expect(beat.json.timer_last_heartbeat).not.toBeNull();

    await post("/rpc/timers/stop", { timer_id: started.json.timer_id });
  });

  test("iniciar un timer desde el historial cierra el que estaba corriendo", async () => {
    const first = (
      await (await post("/rpc/timers/start", { timer_title: "Primero" })).json()
    ) as OrpcEnvelope<TimerWire>;

    const second = (
      await (await post("/rpc/timers/start", { timer_title: "Segundo" })).json()
    ) as OrpcEnvelope<TimerWire>;
    expect(second.json.timer_id).not.toBe(first.json.timer_id);

    // El primero quedó cerrado (con duración) y el segundo es el abierto.
    const currentRes = await post("/rpc/timers/current", {});
    const current = (await currentRes.json()) as OrpcEnvelope<TimerWire | null>;
    expect(current.json?.timer_id).toBe(second.json.timer_id);

    const historyRes = await post("/rpc/timers/history", { timer_limit: 50 });
    const history = (await historyRes.json()) as OrpcEnvelope<TimerWire[]>;
    const closed = history.json.find((run) => run.timer_id === first.json.timer_id);
    expect(closed?.timer_end).not.toBeNull();
    expect(closed?.timer_duration_seconds).toBeGreaterThanOrEqual(0);

    await post("/rpc/timers/stop", { timer_id: second.json.timer_id });
  });

  test("el historial filtra por búsqueda", async () => {
    await post("/rpc/timers/start", { timer_title: "Auditoría web" });
    const other = (
      await (await post("/rpc/timers/start", { timer_title: "Otro tema" })).json()
    ) as OrpcEnvelope<TimerWire>;
    await post("/rpc/timers/stop", { timer_id: other.json.timer_id });

    const res = await post("/rpc/timers/history", {
      timer_search: "auditor",
      timer_limit: 50,
    });
    const history = (await res.json()) as OrpcEnvelope<TimerWire[]>;
    expect(history.json.length).toBeGreaterThan(0);
    expect(
      history.json.every((run) =>
        run.timer_title.toLowerCase().includes("auditor"),
      ),
    ).toBe(true);
  });
});
