import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { cleanupAuthTables } from "../../infrastructure/kysely/test-cleanup";
import { resolveTestDatabaseUrl } from "../../infrastructure/kysely/test-db";
import { describeIntegration, openTestDatabase } from "../../infrastructure/kysely/test-db.helper";
import { createAppFetch } from "../composition-root";

/**
 * Integration test opt-in de los endpoints de categories + createCurrency.
 * Skippea limpiamente sin `TEST_DATABASE_URL` (mismo gate que el resto).
 *
 * Flujo:
 *   1. Registrarse con OTP real para obtener sesión.
 *   2. categories: create → list → update → remove → list confirma.
 *   3. categories.create con el type de OTRO usuario → 400 (multi-tenant).
 *   4. config/createCurrency → la moneda nueva aparece en listCurrencies.
 */

// Resuelve y valida la URL al importar el archivo: si falta o apunta a la
// base de desarrollo, el archivo falla de inmediato (no se saltea en silencio).
const databaseUrl = resolveTestDatabaseUrl();

const fixedOtpGenerator = {
  generate(): string {
    return "041283";
  },
};

interface OrpcEnvelope<T> {
  json: T;
}

describeIntegration("categories + createCurrency HTTP endpoints (integration)", () => {
    let fetchApp: (request: Request) => Promise<Response>;
    let sessionCookie = "";
    let typeId = "";

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

      const email = `categories-http-${Date.now()}@example.com`;
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
    });

    afterAll(async () => {
      const db = await openTestDatabase();
      await cleanupAuthTables(db);
      await db.destroy();
    });

    test("categories CRUD completo con la sesión real", async () => {
      // Create
      const createRes = await post("/rpc/categories/create", {
        cate_name: "Web",
        cate_type_id: typeId,
      });
      expect(createRes.status).toBe(200); // el dispatcher normaliza success a 200
      const created = (await createRes.json()) as OrpcEnvelope<{
        cate_id: string;
        cate_name: string;
        cate_type_id: string;
      }>;
      expect(created.json.cate_name).toBe("Web");
      expect(created.json.cate_type_id).toBe(typeId);

      // List la incluye
      const listRes = await post("/rpc/categories/list", {
        search: "",
        typeId: null,
        limit: 50,
      });
      expect(listRes.status).toBe(200);
      const listed = (await listRes.json()) as OrpcEnvelope<
        { cate_id: string; cate_name: string }[]
      >;
      expect(
        listed.json.some((c) => c.cate_id === created.json.cate_id),
      ).toBe(true);

      // Update (rename)
      const updateRes = await post("/rpc/categories/update", {
        cate_id: created.json.cate_id,
        cate_name: "Web corporativa",
      });
      expect(updateRes.status).toBe(200);
      const updated = (await updateRes.json()) as OrpcEnvelope<{
        cate_name: string;
      }>;
      expect(updated.json.cate_name).toBe("Web corporativa");

      // Remove
      const removeRes = await post("/rpc/categories/remove", {
        cate_id: created.json.cate_id,
      });
      expect(removeRes.status).toBe(200);

      // List ya no la incluye
      const listAfter = await post("/rpc/categories/list", {
        search: "",
        typeId: null,
        limit: 50,
      });
      const after = (await listAfter.json()) as OrpcEnvelope<
        { cate_id: string }[]
      >;
      expect(after.json.some((c) => c.cate_id === created.json.cate_id)).toBe(
        false,
      );
    });

    test("categories.create con un type ajeno responde 400", async () => {
      // Segundo usuario con su propio type.
      const email = `categories-other-${Date.now()}@example.com`;
      await post("/rpc/auth/requestOtp", { email }, "");
      const verifyRes = await post(
        "/rpc/auth/verifyOtp",
        { email, code: "041283" },
        "",
      );
      const setCookie = verifyRes.headers.get("Set-Cookie") ?? "";
      const otherCookie = `crm_session=${/crm_session=([^;]+)/.exec(setCookie)![1]}`;

      const otherTypes = (await (
        await post(
          "/rpc/types/list",
          { search: "", modules: [], limit: 50 },
          otherCookie,
        )
      ).json()) as OrpcEnvelope<{ type_id: string }[]>;
      const foreignTypeId = otherTypes.json[0]!.type_id;

      // El primer usuario intenta atar su categoría al type del otro.
      const res = await post("/rpc/categories/create", {
        cate_name: "Robo",
        cate_type_id: foreignTypeId,
      });
      expect(res.status).toBe(400);
    });

    test("config/createCurrency persiste y listCurrencies la expone", async () => {
      const name = `Dólar test ${Date.now()}`;
      const createRes = await post("/rpc/config/createCurrency", {
        name,
        symbol: "US$",
        decimals: 2,
      });
      expect(createRes.status).toBe(200); // el dispatcher normaliza success a 200
      const created = (await createRes.json()) as OrpcEnvelope<{
        id: string;
        name: string;
        symbol: string;
        decimals: number;
      }>;
      expect(created.json.name).toBe(name);
      expect(created.json.symbol).toBe("US$");

      const listRes = await post("/rpc/config/listCurrencies", {});
      const listed = (await listRes.json()) as OrpcEnvelope<
        { id: string; name: string }[]
      >;
      expect(listed.json.some((c) => c.id === created.json.id)).toBe(true);
    });

    test("config/createCurrency sin sesión responde 401", async () => {
      const res = await post(
        "/rpc/config/createCurrency",
        { name: "X", symbol: "X", decimals: 2 },
        "",
      );
      expect(res.status).toBe(401);
    });

    test("categories/update sin campos responde 200 y no rompe la fila", async () => {
      // Un PATCH sólo con el id es válido según el contrato (todos los
      // campos son opcionales). Armaba un SET vacío y Postgres respondía
      // "syntax error at or near where": un 500 en vez de un no-op.
      const createRes = await post("/rpc/categories/create", {
        cate_name: "Sin cambios",
        cate_type_id: typeId,
      });
      const created = (await createRes.json()) as OrpcEnvelope<{
        cate_id: string;
        cate_name: string;
      }>;

      const updateRes = await post("/rpc/categories/update", {
        cate_id: created.json.cate_id,
      });
      expect(updateRes.status).toBe(200);
      const updated = (await updateRes.json()) as OrpcEnvelope<{
        cate_id: string;
        cate_name: string;
      }>;
      expect(updated.json.cate_name).toBe("Sin cambios");

      await post("/rpc/categories/remove", { cate_id: created.json.cate_id });
    });

    test("un body inválido responde 400, no 500", async () => {
      const res = await post("/rpc/categories/update", {
        cate_id: "no-soy-un-uuid",
      });
      expect(res.status).toBe(400);
    });
  },
);
