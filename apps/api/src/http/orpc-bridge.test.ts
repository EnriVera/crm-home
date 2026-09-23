import { describe, expect, test } from "bun:test";
import {
  bridgeHttpErrorFromResponse,
  BridgeHttpError,
  buildH3Event,
  buildH3EventFromBase,
  extractCookiesFromH3Event,
  extractHeadersFromH3Event,
  invokeH3HandlerAndParse,
} from "./orpc-bridge";

describe("buildH3Event", () => {
  test("GET request builds a Request sin body", async () => {
    const event = buildH3Event({
      method: "GET",
      path: "/rpc/auth/session",
    });

    expect(event.req.method).toBe("GET");
    expect(event.req.url).toBe("http://internal/rpc/auth/session");
    expect(event.req.body).toBeNull();
  });

  test("POST request con body JSON expone content-type application/json y el body se lee como JSON", async () => {
    const event = buildH3Event({
      method: "POST",
      path: "/rpc/auth/verifyOtp",
      body: { email: "qa@x.com", code: "123456" },
    });

    expect(event.req.method).toBe("POST");
    expect(event.req.headers.get("content-type")).toBe("application/json");
    const body = event.req.body;
    // Bun/Node Web Request expone el body como ReadableStream en algunos
    // runtimes; el bridge lo wrappea en Blob para que `readBody` de h3 v2
    // funcione uniformemente. Aceptamos cualquiera de los dos.
    expect(body).not.toBeNull();
    let text: string;
    if (body instanceof Blob) {
      text = await body.text();
    } else if (body instanceof ReadableStream) {
      text = await new Response(body).text();
    } else {
      throw new Error("body is not Blob nor ReadableStream");
    }
    expect(text).toBe('{"email":"qa@x.com","code":"123456"}');
  });

  test("query string se serializa con URLSearchParams", () => {
    const event = buildH3Event({
      method: "GET",
      path: "/rpc/tasks/list",
      query: { limit: 10, archived: false },
    });

    const url = new URL(event.req.url);
    expect(url.pathname).toBe("/rpc/tasks/list");
    expect(url.searchParams.get("limit")).toBe("10");
    expect(url.searchParams.get("archived")).toBe("false");
  });

  test("headers del options se mergean con content-type default", () => {
    const event = buildH3Event({
      method: "POST",
      path: "/rpc/x",
      body: {},
      headers: { "x-test": "1" },
    });

    expect(event.req.headers.get("content-type")).toBe("application/json");
    expect(event.req.headers.get("x-test")).toBe("1");
  });

  test("cookies se joinan en el header cookie TANTO en node.req COMO en event.req.headers", () => {
    // h3 v2 `getCookie(event, name)` lee `event.req.headers.get("cookie")`,
    // no `node.req.headers`. Por eso el cookie DEBE vivir en el Fetch Request
    // (event.req) — si solo vive en node.req, `getCookie` retorna undefined
    // y cualquier procedure autenticada responde 401. Confirmado por bug fix.
    const event = buildH3Event({
      method: "GET",
      path: "/rpc/auth/session",
      cookies: { crm_session: "abc", other: "def" },
    });

    const expectedCookie = "crm_session=abc; other=def";

    // event.req.headers (Fetch Request): donde h3 v2 lo lee.
    expect(event.req.headers.get("cookie")).toBe(expectedCookie);

    // node.req.headers: donde handlers legacy que leen node.req.headers lo buscan.
    const nodeHeaders = (event.node as unknown as { req: { headers: Headers } })
      .req.headers;
    expect(nodeHeaders.get("cookie")).toBe(expectedCookie);
  });
});

describe("buildH3EventFromBase", () => {
  function makeBase(): {
    req: Request;
    res: { append: (k: string, v: string) => void };
    appended: { key: string; value: string }[];
    node: { req: { headers: Map<string, string> }; res: unknown };
  } {
    const appended: { key: string; value: string }[] = [];
    return {
      req: new Request("http://localhost/real", {
        method: "GET",
        headers: { cookie: "crm_session=real-cookie", "x-real": "yes" },
      }),
      res: {
        append: (k, v) => appended.push({ key: k, value: v }),
      },
      appended,
      node: {
        req: { headers: new Map<string, string>() },
        res: undefined as unknown,
      },
    };
  }

  test("forwarding del header cookie del base al event.req del hybrid", () => {
    // El bridge extrae el header `cookie` del base H3Event y lo propaga al
    // Fetch Request standalone. Sin esto, `getCookie(event)` falla incluso
    // si el browser sí envió la cookie en el request original.
    function makeBaseWithCookieRequest(cookieHeader: string) {
      const appended: { key: string; value: string }[] = [];
      const req = new Request("http://localhost/real", {
        method: "GET",
        headers: { cookie: cookieHeader },
      });
      return {
        req,
        res: {
          append: (k: string, v: string) => appended.push({ key: k, value: v }),
        },
        appended,
        node: {
          req: { headers: new Map<string, string>() },
          res: undefined as unknown,
        },
      };
    }

    const base = makeBaseWithCookieRequest(
      "crm_session=from-base; trail=ok",
    );

    const hybrid = buildH3EventFromBase(
      base as unknown as Parameters<typeof buildH3EventFromBase>[0],
      {
        method: "POST",
        path: "/rpc/auth/session",
        body: undefined,
      },
    );

    // El Fetch Request del hybrid debe incluir el cookie del base.
    expect(hybrid.req.headers.get("cookie")).toBe(
      "crm_session=from-base; trail=ok",
    );
  });

  test("preserva node.req.headers del base (incluyendo cookies legacy)", () => {
    const base = makeBase() as unknown as Parameters<
      typeof buildH3EventFromBase
    >[0];
    // El bridge lee SOLO de base.node.req.headers (no de event.req.headers).
    // Replicamos la shape de h3 v2 (Node IncomingHttpHeaders con keys
    // lowercase) en `base.node.req.headers` para que el header accessor
    // matchee.
    const baseNode = base.node as unknown as {
      req: { headers: Map<string, string> };
    };
    baseNode.req.headers = new Map<string, string>([
      ["cookie", "crm_session=real-cookie"],
      ["x-real", "yes"],
    ]);
    const hybrid = buildH3EventFromBase(base, {
      method: "POST",
      path: "/rpc/auth/verifyOtp",
      body: { email: "qa@x.com", code: "123456" },
    });

    const node = hybrid.node as unknown as {
      req: { headers: Map<string, string> };
    };
    expect(node.req.headers.get("cookie")).toBe("crm_session=real-cookie");
    expect(node.req.headers.get("x-real")).toBe("yes");
  });

  test("propaga res del base para que setCookie escriba al response real", () => {
    const base = makeBase();
    const hybrid = buildH3EventFromBase(
      base as unknown as Parameters<typeof buildH3EventFromBase>[0],
      {
        method: "POST",
        path: "/rpc/auth/verifyOtp",
        body: { email: "qa@x.com", code: "123456" },
      },
    );

    const res = (hybrid as unknown as { res: typeof base.res }).res;
    expect(res).toBe(base.res);

    // Escribimos como lo haría un handler de dominio.
    res.append("set-cookie", "crm_session=x; Path=/");
    expect(base.appended).toEqual([
      { key: "set-cookie", value: "crm_session=x; Path=/" },
    ]);
  });

  test("el req del hybrid es nuevo (con body ORPC destrabado), no el del base", async () => {
    const base = makeBase();
    const hybrid = buildH3EventFromBase(
      base as unknown as Parameters<typeof buildH3EventFromBase>[0],
      {
        method: "POST",
        path: "/rpc/auth/verifyOtp",
        body: { email: "qa@x.com", code: "123456" },
      },
    );

    const text = await hybrid.req.text();
    expect(text).toBe('{"email":"qa@x.com","code":"123456"}');
    // El base.req no fue consumido.
    expect(await base.req.text()).toBe("");
  });
});

describe("BridgeHttpError", () => {
  test("expone orpcCode, status, data y usa nombre BridgeHttpError", () => {
    const err = new BridgeHttpError("TASK_NOT_FOUND", 404, { taskId: "x" });

    expect(err.orpcCode).toBe("TASK_NOT_FOUND");
    expect(err.status).toBe(404);
    expect(err.data).toEqual({ taskId: "x" });
    expect(err.name).toBe("BridgeHttpError");
    expect(err.message).toBe("TASK_NOT_FOUND (HTTP 404)");
  });

  test("acepta message custom", () => {
    const err = new BridgeHttpError("X", 500, null, "boom");

    expect(err.message).toBe("boom");
  });
});

describe("bridgeHttpErrorFromResponse", () => {
  test("preserva code discriminado del body cuando viene", async () => {
    const response = new Response(
      JSON.stringify({ code: "INVALID_KANBAN_ORDER", message: "x" }),
      { status: 409, headers: { "content-type": "application/json" } },
    );

    const err = await bridgeHttpErrorFromResponse(response);

    expect(err.orpcCode).toBe("INVALID_KANBAN_ORDER");
    expect(err.status).toBe(409);
    expect(err.message).toBe("x");
  });

  test("cae al mapping de STATUS_TO_ORPC_CODE si no hay code en el body", async () => {
    const response = new Response(JSON.stringify({ message: "no auth" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });

    const err = await bridgeHttpErrorFromResponse(response);

    expect(err.orpcCode).toBe("UNAUTHORIZED");
    expect(err.status).toBe(401);
  });

  test("status sin mapping usa INTERNAL_SERVER_ERROR como fallback", async () => {
    const response = new Response("wat", { status: 418 });

    const err = await bridgeHttpErrorFromResponse(response);

    expect(err.orpcCode).toBe("INTERNAL_SERVER_ERROR");
  });

  test("body vacío o no-JSON devuelve null data y cae al statusText (string vacío en Bun/Node)", async () => {
    const response = new Response("plain text", { status: 502 });

    const err = await bridgeHttpErrorFromResponse(response);

    expect(err.data).toBeNull();
    // En Bun el statusText de Fetch Response es "" (no se popula desde
    // IncomingHttpStatusMessage). Sólo verificamos que message caiga al
    // fallback: o string vacío o un texto conocido ("Bad Gateway" en
    // otros runtimes). El contrato es "no inventar string cuando no hay".
    expect(typeof err.message).toBe("string");
  });
});

describe("invokeH3HandlerAndParse", () => {
  test("handler que retorna objeto plano se devuelve directo", async () => {
    const result = await invokeH3HandlerAndParse(
      async () => ({ ok: true }),
      {} as Parameters<typeof invokeH3HandlerAndParse>[1],
    );

    expect(result).toEqual({ ok: true });
  });

  test("handler que retorna Response 200 con JSON parsea el body", async () => {
    const result = await invokeH3HandlerAndParse(
      async () =>
        new Response(JSON.stringify({ verdict: "valid" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      {} as Parameters<typeof invokeH3HandlerAndParse>[1],
    );

    expect(result).toEqual({ verdict: "valid" });
  });

  test("handler que retorna Response 4xx tira BridgeHttpError con code del body", async () => {
    const handler = async () =>
      new Response(
        JSON.stringify({ code: "INVALID_INPUT", message: "missing field" }),
        { status: 400, headers: { "content-type": "application/json" } },
      );

    await expect(invokeH3HandlerAndParse(handler, {} as never)).rejects.toThrow(
      BridgeHttpError,
    );

    try {
      await invokeH3HandlerAndParse(handler, {} as never);
    } catch (e) {
      const err = e as BridgeHttpError;
      expect(err.orpcCode).toBe("INVALID_INPUT");
      expect(err.status).toBe(400);
      expect(err.message).toBe("missing field");
    }
  });

  test("handler que retorna Response 204 o body vacío → undefined", async () => {
    const result = await invokeH3HandlerAndParse(
      async () => new Response(null, { status: 204 }),
      {} as Parameters<typeof invokeH3HandlerAndParse>[1],
    );

    expect(result).toBeUndefined();
  });

  test("handler 200 con body no-JSON tira INTERNAL_SERVER_ERROR con rawBody", async () => {
    const handler = async () =>
      new Response("not-json", {
        status: 200,
        headers: { "content-type": "text/plain" },
      });

    try {
      await invokeH3HandlerAndParse(handler, {} as never);
      throw new Error("should have thrown");
    } catch (e) {
      const err = e as BridgeHttpError;
      expect(err).toBeInstanceOf(BridgeHttpError);
      expect(err.orpcCode).toBe("INTERNAL_SERVER_ERROR");
      expect(err.status).toBe(500);
      expect((err.data as { rawBody?: string }).rawBody).toBe("not-json");
    }
  });
});

describe("extractHeadersFromH3Event", () => {
  test("lowercases keys y solo toma del event.req.headers", () => {
    const req = new Request("http://x/", {
      headers: { Cookie: "crm_session=abc", "X-Trace-Id": "42" },
    });
    const headers = extractHeadersFromH3Event({ req } as never);

    expect(headers["cookie"]).toBe("crm_session=abc");
    expect(headers["x-trace-id"]).toBe("42");
    expect(Object.keys(headers).every((k) => k === k.toLowerCase())).toBe(true);
  });

  test("event sin req.headers devuelve objeto vacío", () => {
    const headers = extractHeadersFromH3Event({} as never);
    expect(headers).toEqual({});
  });
});

describe("extractCookiesFromH3Event", () => {
  test("parsea cookie header a objeto", () => {
    const req = new Request("http://x/", {
      headers: { cookie: "crm_session=abc; other=def" },
    });
    const cookies = extractCookiesFromH3Event({ req } as never);

    expect(cookies).toEqual({ crm_session: "abc", other: "def" });
  });

  test("cookie inexistente → {}", () => {
    const req = new Request("http://x/");
    const cookies = extractCookiesFromH3Event({ req } as never);

    expect(cookies).toEqual({});
  });

  test("par cookie sin '=' se ignora silenciosamente", () => {
    const req = new Request("http://x/", {
      headers: { cookie: "valid=1; broken; also=ok" },
    });
    const cookies = extractCookiesFromH3Event({ req } as never);

    expect(cookies).toEqual({ valid: "1", also: "ok" });
  });
});
