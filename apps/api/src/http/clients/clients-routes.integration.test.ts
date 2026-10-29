import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  cleanupAuthTables,
  cleanupTasksTables,
} from "../../infrastructure/kysely/test-cleanup";
import { createAppFetch } from "../composition-root";

/**
 * Integration test opt-in de los endpoints de clients + dependencies.
 * Skippea limpiamente sin `TEST_DATABASE_URL`.
 *
 * Cubre el criterio de aceptación de PRD-v2 §8.5: borrar un cliente con
 * tareas enganchadas pide una confirmación que LISTA las dependencias,
 * así que la UI necesita poder consultarlas antes de borrar.
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

describe.skipIf(!databaseUrl)("clients HTTP endpoints (integration)", () => {
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

    const email = `clients-http-${Date.now()}@example.com`;
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
    await cleanupTasksTables(db);
    await cleanupAuthTables(db);
    await db.destroy();
  });

  test("create → list → update → remove de un cliente", async () => {
    const createRes = await post("/rpc/clients/create", {
      client_name: "Acme Studio",
      client_email: "hola@acme.test",
      client_phone: "+54 9 11 0000-1111",
    });
    expect(createRes.status).toBe(200);
    const created = (await createRes.json()) as OrpcEnvelope<{
      client_id: string;
      client_name: string;
      client_phone: string;
    }>;
    expect(created.json.client_name).toBe("Acme Studio");
    // El teléfono se guarda y se devuelve EXACTO (criterio PRD-v2 §8.5).
    expect(created.json.client_phone).toBe("+54 9 11 0000-1111");

    const listRes = await post("/rpc/clients/list", {
      search: "",
      limit: 50,
    });
    const listed = (await listRes.json()) as OrpcEnvelope<
      { client_id: string }[]
    >;
    expect(
      listed.json.some((c) => c.client_id === created.json.client_id),
    ).toBe(true);

    const updateRes = await post("/rpc/clients/update", {
      client_id: created.json.client_id,
      client_name: "Acme Studio SA",
    });
    expect(updateRes.status).toBe(200);
    const updated = (await updateRes.json()) as OrpcEnvelope<{
      client_name: string;
    }>;
    expect(updated.json.client_name).toBe("Acme Studio SA");

    const removeRes = await post("/rpc/clients/remove", {
      client_id: created.json.client_id,
    });
    expect(removeRes.status).toBe(200);

    const listAfter = await post("/rpc/clients/list", {
      search: "",
      limit: 50,
    });
    const after = (await listAfter.json()) as OrpcEnvelope<
      { client_id: string }[]
    >;
    expect(
      after.json.some((c) => c.client_id === created.json.client_id),
    ).toBe(false);
  });

  test("dependencies lista las tareas enganchadas al cliente", async () => {
    const clientRes = await post("/rpc/clients/create", {
      client_name: "Cliente con tareas",
      client_email: null,
      client_phone: null,
    });
    const client = (await clientRes.json()) as OrpcEnvelope<{
      client_id: string;
    }>;

    // Sin tareas: la lista está vacía.
    const emptyRes = await post("/rpc/clients/dependencies", {
      client_id: client.json.client_id,
    });
    expect(emptyRes.status).toBe(200);
    const empty = (await emptyRes.json()) as OrpcEnvelope<{
      dependencies: { task_id: string; task_title: string }[];
      total: number;
    }>;
    expect(empty.json.total).toBe(0);
    expect(empty.json.dependencies).toEqual([]);

    // Con una tarea enganchada: aparece en la lista.
    const typesRes = await post("/rpc/types/list", {
      search: "",
      modules: [],
      limit: 50,
    });
    const types = (await typesRes.json()) as OrpcEnvelope<
      { type_id: string }[]
    >;
    // La API exige `task_tast_id` (la task nace en una columna).
    const statesRes = await post("/rpc/tasks/states/list", {});
    const states = (await statesRes.json()) as OrpcEnvelope<
      { tast_id: string }[]
    >;
    const taskRes = await post("/rpc/tasks/create", {
      task_title: "Tarea del cliente",
      task_tast_id: states.json[0]!.tast_id,
      task_type_id: types.json[0]!.type_id,
      task_clie_id: client.json.client_id,
    });
    expect(taskRes.status).toBe(200);

    const depsRes = await post("/rpc/clients/dependencies", {
      client_id: client.json.client_id,
    });
    const deps = (await depsRes.json()) as OrpcEnvelope<{
      dependencies: { task_id: string; task_title: string }[];
      total: number;
    }>;
    expect(deps.json.total).toBe(1);
    expect(deps.json.dependencies[0]?.task_title).toBe("Tarea del cliente");
  });
});
