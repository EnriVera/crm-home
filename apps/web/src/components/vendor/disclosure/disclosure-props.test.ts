import { describe, expect, test } from "bun:test";

import { toDisclosureProps } from "./disclosure-props";
import type { DisclosureProps } from "./disclosure.tsrx";

describe("toDisclosureProps", () => {
  test("default shape: id estable + sin estado", () => {
    const props: DisclosureProps = {
      trigger: null as never,
      children: null as never,
    };

    expect(toDisclosureProps(props)).toEqual({
      id: "disclosure",
      defaultOpen: undefined,
      open: undefined,
      onOpenChange: undefined,
      disabled: undefined,
    });
  });

  test("pasa defaultOpen cuando se provee", () => {
    const props: DisclosureProps = {
      defaultOpen: true,
      trigger: null as never,
      children: null as never,
    };

    const mapped = toDisclosureProps(props);
    expect(mapped.defaultOpen).toBe(true);
  });

  test("pasa open controlado cuando se provee", () => {
    const props: DisclosureProps = {
      open: false,
      trigger: null as never,
      children: null as never,
    };

    const mapped = toDisclosureProps(props);
    expect(mapped.open).toBe(false);
  });

  test("pasa onOpenChange dereferenciado", () => {
    const onOpenChange = (details: { open: boolean }) => details.open;
    const props: DisclosureProps = {
      onOpenChange,
      trigger: null as never,
      children: null as never,
    };

    const mapped = toDisclosureProps(props);
    expect(mapped.onOpenChange).toBe(onOpenChange);
  });

  test("pasa disabled cuando se provee", () => {
    const props: DisclosureProps = {
      disabled: true,
      trigger: null as never,
      children: null as never,
    };

    expect(toDisclosureProps(props).disabled).toBe(true);
  });

  test("id determinístico entre llamadas (estable para SSR + hidratación)", () => {
    const a = toDisclosureProps({
      trigger: null as never,
      children: null as never,
    });
    const b = toDisclosureProps({
      trigger: null as never,
      children: null as never,
    });

    expect(a.id).toBe(b.id);
    expect(a.id).toBe("disclosure");
  });
});
