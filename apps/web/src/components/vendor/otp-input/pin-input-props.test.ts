import { describe, expect, test } from "bun:test";

import { toPinInputProps } from "./pin-input-props";

/**
 * Tests del mapeo puro `OtpInputProps` → props de la máquina zag pin-input
 * (D-SA1). Re-enfoque de los 8 tests de la máquina hand-rolled (D1): la
 * máquina zag no es headless-testeable sin el runtime de Octane (su Service
 * vive en el adapter `@octanejs/zag`), así que la cobertura residual del
 * wrapper es el CONTRATO — mismos comportamientos, nivel de mapeo. La lógica
 * de la máquina queda cubierta por la suite CI de zag upstream.
 * RED: el módulo `pin-input-props.ts` todavía no existe — este test falla.
 */
describe("vendor/otp-input toPinInputProps", () => {
  test("length por defecto es 6 (count + defaultValue de 6 slots vacíos)", () => {
    const props = toPinInputProps({});
    expect(props.count).toBe(6);
    expect(props.defaultValue).toEqual(["", "", "", "", "", ""]);
  });

  test("length distinto de 6 dimensiona count y defaultValue", () => {
    const props = toPinInputProps({ length: 4 });
    expect(props.count).toBe(4);
    expect(props.defaultValue).toEqual(["", "", "", ""]);
  });

  test("rechazo de no-numéricos: pattern [0-9]* y type numeric", () => {
    const props = toPinInputProps({});
    expect(props.pattern).toBe("[0-9]*");
    expect(props.type).toBe("numeric");
  });

  test("otp: true (autocomplete one-time-code) y NUNCA type=\"number\"", () => {
    const props = toPinInputProps({});
    expect(props.otp).toBe(true);
    // zag type es una union de strings de contenido; "number" no existe en ella
    // y el mapeo nunca debe producir input type=number (ceros a la izquierda).
    expect(props.type).not.toBe("number" as never);
  });

  test("onComplete se cablea a onValueComplete con valueAsString (ceros preservados)", () => {
    const completed: string[] = [];
    const props = toPinInputProps({ onComplete: (code) => completed.push(code) });
    expect(typeof props.onValueComplete).toBe("function");
    props.onValueComplete!({
      value: ["0", "4", "1", "2", "8", "3"],
      valueAsString: "041283",
    });
    expect(completed).toEqual(["041283"]);
  });

  test("sin onComplete no hay onValueComplete", () => {
    const props = toPinInputProps({});
    expect(props.onValueComplete).toBeUndefined();
  });

  test("disabled se propaga a la máquina (inerte)", () => {
    expect(toPinInputProps({ disabled: true }).disabled).toBe(true);
    expect(toPinInputProps({}).disabled).toBeUndefined();
  });

  test("invalid se propaga (origen del data-attribute de error)", () => {
    expect(toPinInputProps({ invalid: true }).invalid).toBe(true);
    expect(toPinInputProps({}).invalid).toBeUndefined();
  });
});
