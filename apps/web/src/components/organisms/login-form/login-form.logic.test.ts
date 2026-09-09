import { describe, expect, mock, test } from "bun:test";
import { createLoginSubmitHandler } from "./login-form.logic";

function createEvent(): Event {
  return new Event("submit", { cancelable: true });
}

function createDeps(overrides: {
  requestOtp?: () => Promise<void>;
  isValidEmail?: (email: string) => boolean;
} = {}) {
  const requestOtp = overrides.requestOtp ?? mock(() => Promise.resolve());
  return {
    requestOtp,
    navigate: mock((url: string) => url),
    setError: mock((error: string | null) => error),
    setIsLoading: mock((isLoading: boolean) => isLoading),
    translate: (key: string) => key,
    isValidEmail:
      overrides.isValidEmail ??
      ((email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
  };
}

describe("createLoginSubmitHandler", () => {
  test("email inválido no navega", async () => {
    const deps = createDeps({ isValidEmail: () => false });
    const handler = createLoginSubmitHandler(deps);
    const event = createEvent();

    await handler(event, "no-es-un-email");

    expect(deps.requestOtp).not.toHaveBeenCalled();
    expect(deps.navigate).not.toHaveBeenCalled();
  });

  test("requestOtp exitoso navega a /login-verification?email=...", async () => {
    const deps = createDeps();
    const handler = createLoginSubmitHandler(deps);
    const event = createEvent();

    await handler(event, "ana@example.com");

    expect(deps.requestOtp).toHaveBeenCalledWith("ana@example.com");
    expect(deps.navigate).toHaveBeenCalledWith(
      "/login-verification?email=ana%40example.com",
    );
  });

  test("rate-limit muestra error sin navegar", async () => {
    const deps = createDeps({
      requestOtp: mock(() => Promise.reject(new Error("rate limit"))),
    });
    const handler = createLoginSubmitHandler(deps);
    const event = createEvent();

    await handler(event, "ana@example.com");

    expect(deps.setError).toHaveBeenCalledWith("auth.login.errorRequestOtp");
    expect(deps.navigate).not.toHaveBeenCalled();
  });

  test("normaliza el email a minúsculas", async () => {
    const deps = createDeps();
    const handler = createLoginSubmitHandler(deps);
    const event = createEvent();

    await handler(event, "ANA@EXAMPLE.COM");

    expect(deps.requestOtp).toHaveBeenCalledWith("ana@example.com");
  });
});
