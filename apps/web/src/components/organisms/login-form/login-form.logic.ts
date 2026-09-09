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
    } catch {
      deps.setError(deps.translate("auth.login.errorRequestOtp"));
    } finally {
      deps.setIsLoading(false);
    }
  };
}
