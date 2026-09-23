export interface LoginFormLogicDependencies {
  requestOtp(email: string): Promise<unknown>;
  navigate(url: string): void;
  setError(error: string | null): void;
  setIsLoading(isLoading: boolean): void;
  translate(key: string): string;
  isValidEmail(email: string): boolean;
}

export function createLoginSubmitHandler(deps: LoginFormLogicDependencies) {
  return async (event: Event, email: string) => {
    event.preventDefault();

    if (!deps.isValidEmail(email)) {
      deps.setError(deps.translate("auth.login.errorInvalidEmail"));
      return;
    }

    deps.setIsLoading(true);
    deps.setError(null);

    try {
      await deps.requestOtp(email.trim().toLowerCase());
      deps.navigate(
        `/login-verification?email=${encodeURIComponent(email.trim())}`,
      );
    } catch (error) {
      // ORPC throws `ORPCError` con `code` discriminado. Mapeamos los códigos
      // más útiles para el usuario y caemos al mensaje genérico si llega
      // algo no esperado (network error, abort, TypeError de cliente mal
      // configurado, etc.). El `console.error` es defensivo: si el switch
      // cae al default, el error real queda en consola para debugging
      // futuro (sin esto, bugs como el del cliente sin contrato tardan
      // horas en diagnosticarse porque solo se ve el fallback genérico).
      console.error("[login] requestOtp failed:", error);
      const code = (error as { code?: unknown })?.code;
      let key: string;
      switch (code) {
        case "RATE_LIMITED":
          key = "auth.login.errorRateLimited";
          break;
        case "INTERNAL_SERVER_ERROR":
          key = "auth.login.errorServiceUnavailable";
          break;
        default:
          key = "auth.login.errorRequestOtp";
      }
      deps.setError(deps.translate(key));
    } finally {
      deps.setIsLoading(false);
    }
  };
}
