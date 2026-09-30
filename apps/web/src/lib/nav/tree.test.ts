import { describe, expect, test } from "bun:test";

/**
 * Tests puros del árbol de navegación §7 y del estado activo (D3/D5).
 * RED: `lib/nav/{routes,tree,active}.ts` todavía no existen — debe fallar.
 */
describe("lib/nav", () => {
  test("SHELL_ROUTES: lista canónica de las 8 rutas del shell", async () => {
    const { SHELL_ROUTES } = await import("./routes");
    expect([...SHELL_ROUTES]).toEqual([
      "/dashboard",
      "/tasks",
      "/schedules",
      "/clients",
      "/incomes",
      "/expenses",
      "/transfers",
      "/config",
    ]);
  });

  test("árbol §7: orden exacto, Finance como grupo no clicable con 3 hijos", async () => {
    const { NAV_TREE } = await import("./tree");
    expect(NAV_TREE.map((node) => node.type)).toEqual([
      "item",
      "item",
      "item",
      "item",
      "group",
      "item",
    ]);
    expect(NAV_TREE.map((node) => node.labelKey)).toEqual([
      "nav.dashboard",
      "nav.tasks",
      "nav.schedule",
      "nav.clients",
      "nav.finance",
      "nav.config",
    ]);
    const finance = NAV_TREE[4];
    expect(finance?.type).toBe("group");
    if (finance?.type === "group") {
      expect(finance.children.map((child) => child.href)).toEqual([
        "/incomes",
        "/expenses",
        "/transfers",
      ]);
      expect(finance.children.map((child) => child.labelKey)).toEqual([
        "nav.income",
        "nav.expenses",
        "nav.transfers",
      ]);
    }
  });

  test("consistencia: hrefs del árbol ≡ SHELL_ROUTES", async () => {
    const { NAV_TREE } = await import("./tree");
    const { SHELL_ROUTES } = await import("./routes");
    const hrefs = NAV_TREE.flatMap((node) =>
      node.type === "group"
        ? node.children.map((child) => child.href)
        : [node.href],
    );
    expect([...hrefs].sort()).toEqual([...SHELL_ROUTES].sort());
  });

  test("pathnameOf: separa el path del query string", async () => {
    const { pathnameOf } = await import("./active");
    expect(pathnameOf("/incomes?page=2")).toBe("/incomes");
    expect(pathnameOf("/dashboard")).toBe("/dashboard");
  });

  test("isItemActive: match exacto de pathname", async () => {
    const { isItemActive } = await import("./active");
    expect(isItemActive("/tasks", "/tasks")).toBe(true);
    expect(isItemActive("/tasks", "/config")).toBe(false);
    expect(isItemActive("/tasks", "/tasks/sub")).toBe(false);
  });

  test("isGroupActive: activo si algún hijo lo está", async () => {
    const { isGroupActive, pathnameOf } = await import("./active");
    const children = [{ href: "/incomes" }, { href: "/expenses" }];
    expect(isGroupActive(pathnameOf("/incomes?page=2"), children)).toBe(true);
    expect(isGroupActive("/dashboard", children)).toBe(false);
  });

  test("ruta desconocida: ningún item ni grupo activo", async () => {
    const { NAV_TREE } = await import("./tree");
    const { isItemActive, isGroupActive, pathnameOf } = await import(
      "./active"
    );
    const pathname = pathnameOf("/no-existe");
    for (const node of NAV_TREE) {
      if (node.type === "group") {
        expect(isGroupActive(pathname, node.children)).toBe(false);
      } else {
        expect(isItemActive(pathname, node.href)).toBe(false);
      }
    }
  });
});
