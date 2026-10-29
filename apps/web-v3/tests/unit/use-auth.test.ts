import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const verifyOtpCall = vi.fn();
const fetchSession = vi.fn();

vi.mock("~/infrastructure/auth/orpc-auth", () => ({
  AuthCallError: class AuthCallError extends Error {
    constructor(
      readonly code: string,
      message = "error",
    ) {
      super(message);
    }
  },
  fetchSession: () => fetchSession(),
  requestOtp: vi.fn(),
  verifyOtp: (input: unknown) => verifyOtpCall(input),
}));

const { useAuth } = await import("~/shared/composables/use-auth");
const { useAuthStore } = await import("~/stores/auth");
const { useThemeStore } = await import("~/stores/theme");

const USER = {
  id: "user-1",
  email: "ana@example.com",
  name: "Ana",
  userTheme: "light",
};

describe("useAuth.verifyOtp", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    verifyOtpCall.mockReset();
    fetchSession.mockReset();
  });

  it("falla cuando el código es válido pero no hay sesión", async () => {
    // El código ya se consumió: reportar éxito dejaría al usuario en un
    // loop (el guard lo rebota a /login y el código no sirve más).
    verifyOtpCall.mockResolvedValue("valid");
    fetchSession.mockResolvedValue(null);

    const auth = useAuth();
    const ok = await auth.verifyOtp({ email: USER.email, code: "123456" });

    expect(ok).toBe(false);
    expect(auth.errorMessage.value).not.toBeNull();
    expect(useAuthStore().session).toBeNull();
    expect(useAuthStore().hasSession).toBe(false);
  });

  it("inicia sesión y aplica el tema de la cuenta", async () => {
    verifyOtpCall.mockResolvedValue("valid");
    fetchSession.mockResolvedValue(USER);

    const auth = useAuth();
    const ok = await auth.verifyOtp({ email: USER.email, code: "123456" });

    expect(ok).toBe(true);
    expect(useAuthStore().session?.email).toBe(USER.email);
    expect(useThemeStore().theme).toBe("light");
  });

  it("no intenta leer la sesión cuando el código es inválido", async () => {
    verifyOtpCall.mockResolvedValue("invalid");

    const auth = useAuth();
    const ok = await auth.verifyOtp({ email: USER.email, code: "000000" });

    expect(ok).toBe(false);
    expect(auth.errorMessage.value).toBe("auth.otpWrong");
    expect(fetchSession).not.toHaveBeenCalled();
  });
});
