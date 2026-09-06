import { describe, expect, it } from "bun:test";
import { ICON_COMPONENTS, type IconName } from "./paths";
import * as paths from "./paths";

const EXPECTED_NAMES: IconName[] = [
  "house",
  "check-square",
  "calendar",
  "users",
  "wallet",
  "arrow-down-circle",
  "arrow-up-circle",
  "arrows-left-right",
  "gear",
  "sun",
  "moon",
  "sidebar",
];

describe("vendor/icons paths (mapa nombre → componente del binding)", () => {
  it("ICON_COMPONENTS cubre exactamente la union cerrada de 12 IconName", () => {
    expect(Object.keys(ICON_COMPONENTS).sort()).toEqual(
      [...EXPECTED_NAMES].sort(),
    );
  });

  it("cada entrada es un componente del binding phosphor (función)", () => {
    for (const name of EXPECTED_NAMES) {
      expect(typeof ICON_COMPONENTS[name]).toBe("function");
    }
  });

  it("ICON_PATHS vendored (path data inline) ya no se exporta", () => {
    expect("ICON_PATHS" in paths).toBe(false);
  });
});
