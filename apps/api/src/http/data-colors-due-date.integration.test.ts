import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  cleanupAuthTables,
  cleanupTasksTables,
} from "../infrastructure/kysely/test-cleanup";
import { resolveTestDatabaseUrl } from "../infrastructure/kysely/test-db";
import {
  describeIntegration,
  openTestDatabase,
} from "../infrastructure/kysely/test-db.helper";
import { createAppFetch } from "./composition-root";

/**
 * Integration test de los campos NUEVOS del contrato, de punta a punta por
 * HTTP (no por repositorio):
 *
 *  - `task_due_date` en create/update/list de tasks.
 *  - `tast_color` en create/update/list de estados.
 *  - `type_color` en create/update/list de tipos.
 *  - `cate_color` en create/update/list de categorías.
 *
 * Los tests de repositorio (`migration-010.integration.test.ts`) prueban que
 * la columna persiste; estos prueban que el NOMBRE DEL CAMPO en el wire es
 * el que espera el frontend (`task_due_date`, `tast_color`, `type_color`,
 * `cate_color`) y que el valor sale con la forma exacta (`Date` ISO en el
 * vencimiento, token de color en los colores).
 *
 * El frontend ya está construido contra esos nombres: un typo acá rompe el
 * cliente en silencio (la fila llega sin color).
 */

// Resuelve y valida la URL al importar el archivo: si falta o apunta a la
// base de desarrollo, el archivo falla de inmediato (no se saltea en silencio).
const databaseUrl = resolveTestDatabaseUrl();

/** OTP fijo: el generador real es aleatorio y el test no puede adivinarlo. */
const fixedOtpGenerator = {
  generate(): string {
    return "041283";
  },
};

interface OrpcEnvelope<T> {
  json: T;
}

const DATA_COLOR = "data-amber";

describeIntegration(
  "colores de dato y vencimiento por HTTP (integration)",
  () => {
    let fetchApp: (request: Request) => Promise<Response>;
    let sessionCookie = "";
    let typeId = "";
    let stateId = "";

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
      process.env.DATABASE_URL = databaseUrl;
      fetchApp = createAppFetch(
        { DATABASE_URL: databaseUrl, SESSION_COOKIE_SECURE: "false" },
        { otpGenerator: fixedOtpGenerator },
      );

      const email = `colors-http-${Date.now()}@example.com`;
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

      const typesRes = await post("/rpc/types/list", {
        search: "",
        modules: [],
        limit: 50,
      });
      const types = (await typesRes.json()) as OrpcEnvelope<
        { type_id: string }[]
      >;
      typeId = types.json[0]!.type_id;

      // El create de task exige `task_tast_id`: sin una columna, el
      // handler responde 400 y el test mediría otra cosa.
      const statesRes = await post("/rpc/tasks/states/list", {});
      const states = (await statesRes.json()) as OrpcEnvelope<
        { tast_id: string }[]
      >;
      stateId = states.json[0]!.tast_id;
    });

    afterAll(async () => {
      const db = await openTestDatabase();
      await cleanupTasksTables(db);
      await cleanupAuthTables(db);
      await db.destroy();
    });

    // ── type_color ────────────────────────────────────────────────────────

    test("type_color: create persiste el token y list lo devuelve", async () => {
      const createRes = await post("/rpc/types/create", {
        type_name: "Con color",
        type_modules: ["tasks"],
        type_color: DATA_COLOR,
      });
      expect(createRes.status).toBe(200);
      const created = (await createRes.json()) as OrpcEnvelope<{
        type_id: string;
        type_color: string | null;
      }>;
      expect(created.json.type_color).toBe(DATA_COLOR);

      const listRes = await post("/rpc/types/list", {
        search: "",
        modules: [],
        limit: 50,
      });
      const listed = (await listRes.json()) as OrpcEnvelope<
        { type_id: string; type_color: string | null }[]
      >;
      const found = listed.json.find((t) => t.type_id === created.json.type_id);
      expect(found).toBeDefined();
      expect(found!.type_color).toBe(DATA_COLOR);
    });

    test("type_color: update puede quitar el color con null explícito", async () => {
      const createRes = await post("/rpc/types/create", {
        type_name: "Para descolorear",
        type_modules: ["tasks"],
        type_color: DATA_COLOR,
      });
      const created = (await createRes.json()) as OrpcEnvelope<{
        type_id: string;
      }>;

      const updateRes = await post("/rpc/types/update", {
        type_id: created.json.type_id,
        type_color: null,
      });
      expect(updateRes.status).toBe(200);
      const updated = (await updateRes.json()) as OrpcEnvelope<{
        type_color: string | null;
      }>;
      expect(updated.json.type_color).toBeNull();
    });

    test("type_color: un color fuera del set cerrado responde 400", async () => {
      const res = await post("/rpc/types/create", {
        type_name: "Color inválido",
        type_modules: ["tasks"],
        type_color: "#ff8800",
      });
      expect(res.status).toBe(400);
    });

    // ── cate_color ────────────────────────────────────────────────────────

    test("cate_color: create persiste el token y list lo devuelve", async () => {
      const createRes = await post("/rpc/categories/create", {
        cate_name: "Categoría con color",
        cate_type_id: typeId,
        cate_color: DATA_COLOR,
      });
      expect(createRes.status).toBe(200);
      const created = (await createRes.json()) as OrpcEnvelope<{
        cate_id: string;
        cate_color: string | null;
      }>;
      expect(created.json.cate_color).toBe(DATA_COLOR);

      const listRes = await post("/rpc/categories/list", {
        search: "",
        typeId: null,
        limit: 50,
      });
      const listed = (await listRes.json()) as OrpcEnvelope<
        { cate_id: string; cate_color: string | null }[]
      >;
      const found = listed.json.find((c) => c.cate_id === created.json.cate_id);
      expect(found).toBeDefined();
      expect(found!.cate_color).toBe(DATA_COLOR);
    });

    test("cate_color: un color fuera del set cerrado responde 400", async () => {
      const res = await post("/rpc/categories/create", {
        cate_name: "Color inválido",
        cate_type_id: typeId,
        cate_color: "data-rosa",
      });
      expect(res.status).toBe(400);
    });

    // ── tast_color ────────────────────────────────────────────────────────

    test("tast_color: create persiste el token y list lo devuelve", async () => {
      const createRes = await post("/rpc/tasks/states/create", {
        tast_name: "Bloqueada",
        tast_order: 90,
        tast_color: DATA_COLOR,
      });
      expect(createRes.status).toBe(200);
      const created = (await createRes.json()) as OrpcEnvelope<{
        tast_id: string;
        tast_color: string | null;
      }>;
      expect(created.json.tast_color).toBe(DATA_COLOR);

      const listRes = await post("/rpc/tasks/states/list", {});
      const listed = (await listRes.json()) as OrpcEnvelope<
        { tast_id: string; tast_color: string | null }[]
      >;
      const found = listed.json.find((s) => s.tast_id === created.json.tast_id);
      expect(found).toBeDefined();
      expect(found!.tast_color).toBe(DATA_COLOR);
    });

    test("tast_color: update puede cambiar y quitar el color", async () => {
      const createRes = await post("/rpc/tasks/states/create", {
        tast_name: "Para recolorear",
        tast_order: 92,
        tast_color: "data-blue",
      });
      const created = (await createRes.json()) as OrpcEnvelope<{
        tast_id: string;
      }>;

      const updateRes = await post("/rpc/tasks/states/update", {
        tast_id: created.json.tast_id,
        tast_color: DATA_COLOR,
      });
      expect(updateRes.status).toBe(200);
      const updated = (await updateRes.json()) as OrpcEnvelope<{
        tast_color: string | null;
      }>;
      expect(updated.json.tast_color).toBe(DATA_COLOR);

      // Y quitarlo con null explícito.
      const clearRes = await post("/rpc/tasks/states/update", {
        tast_id: created.json.tast_id,
        tast_color: null,
      });
      expect(clearRes.status).toBe(200);
      const cleared = (await clearRes.json()) as OrpcEnvelope<{
        tast_color: string | null;
      }>;
      expect(cleared.json.tast_color).toBeNull();
    });

    test("tast_color: un color fuera del set cerrado responde 400", async () => {
      const res = await post("/rpc/tasks/states/create", {
        tast_name: "Color inválido",
        tast_order: 91,
        tast_color: "rojo",
      });
      expect(res.status).toBe(400);
    });

    // ── task_due_date ─────────────────────────────────────────────────────

    test("task_due_date: create guarda el instante y list lo devuelve", async () => {
      const dueDate = new Date("2026-12-24T18:30:00.000Z");
      const createRes = await post("/rpc/tasks/create", {
        task_title: "Con vencimiento",
        task_type_id: typeId,
        task_tast_id: stateId,
        task_due_date: dueDate.toISOString(),
      });
      expect(createRes.status).toBe(200);
      const created = (await createRes.json()) as OrpcEnvelope<{
        task_id: string;
        task_due_date: string | null;
      }>;
      // El wire manda un instante ISO; la columna es timestamptz.
      expect(new Date(created.json.task_due_date!).getTime()).toBe(
        dueDate.getTime(),
      );

      const listRes = await post("/rpc/tasks/list", {});
      const listed = (await listRes.json()) as OrpcEnvelope<
        { task_id: string; task_due_date: string | null }[]
      >;
      const found = listed.json.find((t) => t.task_id === created.json.task_id);
      expect(found).toBeDefined();
      expect(new Date(found!.task_due_date!).getTime()).toBe(dueDate.getTime());
    });

    test("task_due_date: update puede quitarla con null explícito", async () => {
      const dueDate = new Date("2026-12-25T10:00:00.000Z");
      const createRes = await post("/rpc/tasks/create", {
        task_title: "Vence y después no",
        task_type_id: typeId,
        task_tast_id: stateId,
        task_due_date: dueDate.toISOString(),
      });
      const created = (await createRes.json()) as OrpcEnvelope<{
        task_id: string;
      }>;

      const updateRes = await post("/rpc/tasks/update", {
        task_id: created.json.task_id,
        task_due_date: null,
      });
      expect(updateRes.status).toBe(200);
      const updated = (await updateRes.json()) as OrpcEnvelope<{
        task_due_date: string | null;
      }>;
      expect(updated.json.task_due_date).toBeNull();
    });

    test("task_due_date: una task sin vencimiento devuelve null", async () => {
      const createRes = await post("/rpc/tasks/create", {
        task_title: "Sin vencimiento",
        task_type_id: typeId,
        task_tast_id: stateId,
      });
      expect(createRes.status).toBe(200);
      const created = (await createRes.json()) as OrpcEnvelope<{
        task_due_date: string | null;
      }>;
      expect(created.json.task_due_date).toBeNull();
    });
  },
);
