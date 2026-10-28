import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import EditDrawer from "~/ui/organisms/edit-drawer.vue";

const { hostState } = await vi.hoisted(async () => {
  const { ref } = await import("vue");
  return {
    hostState: {
      closeMock: vi.fn(),
      submitMock: vi.fn(),
      open: ref(false),
    },
  };
});

const MESSAGES: Record<string, string> = {
  "config.drawer.cancel": "Cancelar",
  "config.drawer.save": "Guardar",
  "config.drawer.saving": "Guardando…",
};

vi.stubGlobal("useI18n", () => ({
  t: (key: string) => MESSAGES[key] ?? key,
}));

/** Host component: the drawer is presentational, the parent owns `open`. */
const Host = defineComponent({
  props: {
    submitting: { type: Boolean, default: false },
    error: { type: String, default: null },
  },
  setup(props) {
    return () =>
      h("div", [
        h("button", { onClick: () => (hostState.open.value = true) }, "open"),
        h(
          EditDrawer,
          {
            open: hostState.open.value,
            title: "Nuevo tipo",
            submitting: props.submitting,
            error: props.error,
            onClose: () => {
              hostState.open.value = false;
              hostState.closeMock();
            },
            onSubmit: () => hostState.submitMock(),
          },
          () => [
            h("input", { type: "text", placeholder: "campo" }),
            h("button", { type: "button" }, "otro"),
          ],
        ),
      ]);
  },
});

describe("edit-drawer", () => {
  afterEach(cleanup);

  beforeEach(() => {
    hostState.closeMock.mockReset();
    hostState.submitMock.mockReset();
    hostState.open.value = false;
  });

  it("renders the panel and overlay when open, nothing when closed", async () => {
    render(Host);

    expect(screen.queryByTestId("drawer-panel")).toBeNull();

    screen.getByText("open").click();

    await waitFor(() => expect(screen.getByTestId("drawer-panel")).toBeDefined());
    expect(screen.getByTestId("drawer-overlay")).toBeDefined();
    expect(screen.getByTestId("drawer-panel").textContent).toContain(
      "Nuevo tipo",
    );
  });

  it("closes on Esc and reports to the parent", async () => {
    render(Host);
    screen.getByText("open").click();
    await screen.findByTestId("drawer-panel");

    await fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() =>
      expect(screen.queryByTestId("drawer-panel")).toBeNull(),
    );
    expect(hostState.closeMock).toHaveBeenCalledTimes(1);
  });

  it("closes on overlay click", async () => {
    render(Host);
    screen.getByText("open").click();
    const overlay = await screen.findByTestId("drawer-overlay");

    overlay.click();

    await waitFor(() =>
      expect(screen.queryByTestId("drawer-panel")).toBeNull(),
    );
  });

  it("emits submit when the form is submitted", async () => {
    render(Host);
    screen.getByText("open").click();
    const panel = await screen.findByTestId("drawer-panel");

    await fireEvent.submit(panel.querySelector("form")!);

    expect(hostState.submitMock).toHaveBeenCalledTimes(1);
  });

  it("disables the primary button while submitting", async () => {
    render(Host, { props: { submitting: true } });
    screen.getByText("open").click();

    const save = await screen.findByTestId("drawer-save");
    expect((save as HTMLButtonElement).disabled).toBe(true);
    expect(save.textContent).toContain("Guardando…");
  });

  it("shows the inline error above the footer", async () => {
    render(Host, { props: { error: "config.drawer.saveError" } });
    screen.getByText("open").click();

    const error = await screen.findByTestId("drawer-error");
    expect(error.textContent).toContain("config.drawer.saveError");
  });

  it("keeps Tab focus inside the drawer", async () => {
    render(Host);
    screen.getByText("open").click();
    await screen.findByTestId("drawer-panel");

    const panel = screen.getByTestId("drawer-panel");
    const focusables = panel.querySelectorAll<HTMLElement>(
      "button:not([disabled]), input",
    );

    // Focus moves to the first focusable on open.
    expect(document.activeElement).toBe(focusables[0]);

    // Tab from the last focusable wraps back to the first.
    focusables[focusables.length - 1]!.focus();
    await fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(focusables[0]);
  });

  it("restores focus to the opener on close", async () => {
    render(Host);
    const opener = screen.getByText("open");
    // A real interaction leaves focus on the trigger; a programmatic
    // .click() does not, so set it up explicitly.
    opener.focus();
    opener.click();
    await screen.findByTestId("drawer-panel");

    await fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it("renders the resize handle", async () => {
    render(Host);
    screen.getByText("open").click();

    expect(await screen.findByTestId("drawer-resize")).toBeDefined();
  });
});
