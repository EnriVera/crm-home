import { describe, expect, test } from "bun:test";
import { parseSmtpUrl } from "./parse-smtp-url";

describe("parseSmtpUrl", () => {
  test("parsea smtp://localhost:1025 sin auth", () => {
    const config = parseSmtpUrl("smtp://localhost:1025");
    expect(config).toEqual({
      host: "localhost",
      port: 1025,
      secure: false,
    });
  });

  test("parsea smtps://smtp.example.com:465 con auth", () => {
    const config = parseSmtpUrl("smtps://user:pass@smtp.example.com:465");
    expect(config).toEqual({
      host: "smtp.example.com",
      port: 465,
      secure: true,
      auth: { user: "user", pass: "pass" },
    });
  });

  test("usa puerto 587 por defecto para smtp", () => {
    const config = parseSmtpUrl("smtp://smtp.example.com");
    expect(config.port).toBe(587);
    expect(config.secure).toBe(false);
  });

  test("usa puerto 465 por defecto para smtps", () => {
    const config = parseSmtpUrl("smtps://smtp.example.com");
    expect(config.port).toBe(465);
    expect(config.secure).toBe(true);
  });

  test("decodifica credenciales con caracteres especiales", () => {
    const config = parseSmtpUrl(
      "smtp://user%40domain:p%40ss@smtp.example.com:587",
    );
    expect(config.auth).toEqual({ user: "user@domain", pass: "p@ss" });
  });

  test("rechaza protocolos no soportados", () => {
    expect(() => parseSmtpUrl("http://smtp.example.com")).toThrow();
  });

  test("rechaza puertos inválidos", () => {
    expect(() => parseSmtpUrl("smtp://smtp.example.com:abc")).toThrow();
    expect(() => parseSmtpUrl("smtp://smtp.example.com:70000")).toThrow();
  });
});
