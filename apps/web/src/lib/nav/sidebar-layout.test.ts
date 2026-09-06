import { describe, expect, test } from "bun:test";

import {
  clampSidebarSize,
  isCollapsedSize,
  SIDEBAR_LAYOUT,
  SIDEBAR_LAYOUT_ID,
} from "./sidebar-layout";

/**
 * Tests de la lógica pura del layout del sidebar (D-SA6, STRICT TDD).
 * Los tamaños son porcentajes del contenedor (el binding
 * @octanejs/resizable-panels trabaja en %, no en px — decisión D-SA6).
 * RED: `sidebar-layout.ts` todavía no existe — este test debe fallar.
 */

describe("lib/nav/sidebar-layout (D-SA6)", () => {
  test("constantes coherentes: collapsedSize < minSize < defaultSize < maxSize", () => {
    expect(SIDEBAR_LAYOUT.collapsedSize).toBeLessThan(SIDEBAR_LAYOUT.minSize);
    expect(SIDEBAR_LAYOUT.minSize).toBeLessThan(SIDEBAR_LAYOUT.defaultSize);
    expect(SIDEBAR_LAYOUT.defaultSize).toBeLessThan(SIDEBAR_LAYOUT.maxSize);
  });

  test("isCollapsedSize: solo el tamaño colapsado (o menor) cuenta como colapsado", () => {
    expect(isCollapsedSize(SIDEBAR_LAYOUT.collapsedSize)).toBe(true);
    expect(isCollapsedSize(0)).toBe(true);
    expect(isCollapsedSize(SIDEBAR_LAYOUT.defaultSize)).toBe(false);
    expect(isCollapsedSize(SIDEBAR_LAYOUT.minSize)).toBe(false);
  });

  test("clamp: por debajo del mínimo (sin colapsar) sube a minSize; por encima baja a maxSize", () => {
    expect(clampSidebarSize(SIDEBAR_LAYOUT.minSize - 1)).toBe(
      SIDEBAR_LAYOUT.minSize,
    );
    expect(clampSidebarSize(SIDEBAR_LAYOUT.maxSize + 10)).toBe(
      SIDEBAR_LAYOUT.maxSize,
    );
    expect(clampSidebarSize(SIDEBAR_LAYOUT.defaultSize)).toBe(
      SIDEBAR_LAYOUT.defaultSize,
    );
  });

  test("clamp: en la zona de colapso se queda en collapsedSize", () => {
    expect(clampSidebarSize(SIDEBAR_LAYOUT.collapsedSize)).toBe(
      SIDEBAR_LAYOUT.collapsedSize,
    );
    expect(clampSidebarSize(0)).toBe(SIDEBAR_LAYOUT.collapsedSize);
  });

  test("el id de persistencia del layout es estable (auto-save del binding)", () => {
    expect(SIDEBAR_LAYOUT_ID).toBe("crm-sidebar-layout");
  });
});
