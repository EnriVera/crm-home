import { fireEvent, render, screen } from "@testing-library/vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OtpInput } from "~/shared/vendor/otp-input";

function cell(index: number): HTMLInputElement {
  return screen.getByTestId(`otp-cell-${index}`) as HTMLInputElement;
}

describe("OtpInput", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("moves to the next cell when a digit is typed", async () => {
    render(OtpInput);

    await fireEvent.update(cell(0), "1");

    expect(cell(0).value).toBe("1");
    expect(document.activeElement).toBe(cell(1));
  });

  it("clears the previous cell and jumps back on backspace", async () => {
    render(OtpInput);

    await fireEvent.update(cell(0), "1");
    await fireEvent.keyDown(cell(1), { key: "Backspace" });

    expect(cell(0).value).toBe("");
    expect(document.activeElement).toBe(cell(0));
  });

  it("fills the six cells on paste and completes with the leading zeros", async () => {
    const { emitted } = render(OtpInput);

    await fireEvent.paste(cell(0), {
      clipboardData: { getData: () => "012345" },
    });

    expect(cell(0).value).toBe("0");
    expect(cell(5).value).toBe("5");
    expect(emitted("complete")).toEqual([["012345"]]);
  });

  it("spreads a code the browser dropped into a single cell", async () => {
    const { emitted } = render(OtpInput);

    await fireEvent.update(cell(0), "012345");

    expect(cell(0).value).toBe("0");
    expect(cell(5).value).toBe("5");
    expect(emitted("complete")).toEqual([["012345"]]);
  });
});
