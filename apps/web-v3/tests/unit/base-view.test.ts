import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import BaseView from "~/ui/organisms/base-view.vue";

const MESSAGES: Record<string, string> = {
  "baseview.switcher": "Cambiar vista",
  "baseview.grid": "Grilla",
  "baseview.list": "Lista",
};

vi.stubGlobal("useI18n", () => ({
  t: (key: string) => MESSAGES[key] ?? key,
}));

/** Host: owns the search binding like a view would. */
const Host = defineComponent({
  setup() {
    const search = ref("");
    return () =>
      h("div", [
        h(
          BaseView,
          {
            id: "test-list",
            searchPlaceholder: "Buscar…",
            "onUpdate:search": (value: string) => (search.value = value),
          },
          {
            grid: () => h("p", "vista grilla"),
            list: () => h("p", "vista lista"),
          },
        ),
        h("output", { "data-search": search.value }),
      ]);
  },
});

describe("base-view", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(cleanup);

  it("renders the grid slot by default", () => {
    render(Host);

    expect(screen.getByTestId("baseview-grid-view").textContent).toContain(
      "vista grilla",
    );
  });

  it("switches to the list view and persists it", async () => {
    render(Host);

    screen.getByTestId("baseview-list").click();

    await waitFor(() =>
      expect(screen.getByTestId("baseview-list-view").textContent).toContain(
        "vista lista",
      ),
    );

    // Persisted for the next mount (same instance id).
    expect(localStorage.getItem("baseview:test-list")).toContain('"list"');
  });

  it("restores the persisted view on mount", async () => {
    localStorage.setItem(
      "baseview:test-list",
      JSON.stringify({ view: "list", search: "" }),
    );

    render(Host);

    await waitFor(() =>
      expect(screen.getByTestId("baseview-list-view").textContent).toContain(
        "vista lista",
      ),
    );
  });

  it("emits and persists the search term", async () => {
    render(Host);

    const input = screen.getByPlaceholderText("Buscar…");
    await fireEvent.update(input, "dise");

    await waitFor(() =>
      expect(
        document.querySelector("output")?.getAttribute("data-search"),
      ).toBe("dise"),
    );
    expect(localStorage.getItem("baseview:test-list")).toContain("dise");
  });

  it("hides the switcher when only one view is offered", () => {
    const Single = defineComponent({
      setup: () => () =>
        h(
          BaseView,
          { id: "single", views: ["grid"], searchPlaceholder: "Buscar…" },
          { grid: () => h("p", "solo grilla") },
        ),
    });

    render(Single);

    expect(screen.queryByTestId("baseview-list")).toBeNull();
    expect(screen.getByTestId("baseview-grid-view")).toBeDefined();
  });

  it("shows the skeleton while loading", () => {
    const Loading = defineComponent({
      setup: () => () =>
        h(
          BaseView,
          { id: "loading", searchPlaceholder: "Buscar…", loading: true },
          { grid: () => h("p", "contenido") },
        ),
    });

    render(Loading);

    expect(screen.getByTestId("baseview-loading")).toBeDefined();
    expect(screen.queryByTestId("baseview-grid-view")).toBeNull();
  });
});
