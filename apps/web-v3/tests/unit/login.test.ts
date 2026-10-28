import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LoginView from "~/ui/views/login.vue";

const { requestOtpMock, navigateToMock, routeState, authState } = await vi.hoisted(
  async () => {
    const { ref } = await import("vue");
    return {
      requestOtpMock: vi.fn(),
      navigateToMock: vi.fn(),
      routeState: { query: {} as Record<string, string> },
      authState: {
        isLoading: ref(false),
        errorMessage: ref<string | null>(null),
      },
    };
  },
);

vi.mock("~/shared/composables/use-auth", () => ({
  useAuth: () => ({
    isLoading: authState.isLoading,
    errorMessage: authState.errorMessage,
    clearError: vi.fn(),
    requestOtp: requestOtpMock,
    verifyOtp: vi.fn(),
    restoreSession: vi.fn(),
  }),
}));

const MESSAGES: Record<string, string> = {
  "auth.title": "Iniciar sesión",
  "auth.subtitle": "Entrá a tu estudio con tu email.",
  "auth.emailLabel": "Email",
  "auth.emailPlaceholder": "nombre en estudio.com",
  "auth.hint": "Sin contraseña: te enviamos un código por email",
  "auth.sendCode": "Enviar código",
  "auth.sending": "Enviando…",
  "auth.errors.invalidEmail": "Ingresá un email válido",
  "auth.errors.rateLimited": "Esperá un momento antes de pedir otro código",
};

vi.stubGlobal("useI18n", () => ({
  t: (key: string) => MESSAGES[key] ?? key,
}));

// Nuxt owns the router: the views use its composables, so the test replaces
// them with the same globals the auto-imports resolve to.
vi.stubGlobal("useRoute", () => routeState);
vi.stubGlobal("navigateTo", navigateToMock);

function submitForm(container: Element) {
  const form = container.querySelector("form") as HTMLFormElement | null;
  if (!form) throw new Error("The login view has no form");
  return fireEvent.submit(form);
}

describe("login view", () => {
  // vitest runs without globals, so the library cannot register its own
  // cleanup and every render has to be unmounted by hand.
  afterEach(cleanup);

  beforeEach(() => {
    requestOtpMock.mockReset();
    navigateToMock.mockReset();
    routeState.query = {};
    authState.isLoading.value = false;
    authState.errorMessage.value = null;
    requestOtpMock.mockResolvedValue(true);
  });

  it("renders the title, the email field and the submit button", () => {
    render(LoginView);

    expect(screen.getByText("Iniciar sesión")).toBeTruthy();
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Enviar código" })).toBeTruthy();
  });

  it("shows an inline error and asks for nothing when the email is empty", async () => {
    const { container } = render(LoginView);

    await submitForm(container);

    expect(screen.getByTestId("login-error").textContent).toContain(
      "Ingresá un email válido",
    );
    expect(requestOtpMock).not.toHaveBeenCalled();
  });

  it("asks for the code and moves to the verification step", async () => {
    const { container } = render(LoginView);

    await fireEvent.update(
      screen.getByLabelText("Email") as HTMLInputElement,
      "ana@estudio.com",
    );
    await submitForm(container);

    expect(requestOtpMock).toHaveBeenCalledWith("ana@estudio.com");
    expect(navigateToMock).toHaveBeenCalledTimes(1);
    const [target] = navigateToMock.mock.calls[0] as [
      { path: string; query: Record<string, string | undefined> },
    ];
    expect(target.path).toBe("/login-verification");
    expect(target.query.email).toBe("ana@estudio.com");
  });

  it("keeps the redirect target on the way to the verification step", async () => {
    routeState.query = { redirect: "/tasks" };
    const { container } = render(LoginView);

    await fireEvent.update(
      screen.getByLabelText("Email") as HTMLInputElement,
      "ana@estudio.com",
    );
    await submitForm(container);

    const [target] = navigateToMock.mock.calls[0] as [
      { path: string; query: Record<string, string | undefined> },
    ];
    expect(target.query.redirect).toBe("/tasks");
  });

  it("shows the failure reported by the composable inline", async () => {
    authState.errorMessage.value = "auth.errors.rateLimited";
    render(LoginView);

    await waitFor(() => {
      expect(screen.getByTestId("login-error").textContent).toContain(
        "Esperá un momento antes de pedir otro código",
      );
    });
  });
});
