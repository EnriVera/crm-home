import { useState } from "octane";
import { isValidEmail } from "../../../lib/validation/email";
import { createRpcClient } from "../../../lib/api/rpc";
import { Button } from "../../atoms/button.tsrx";
import { FormField } from "../../molecules/form-field.tsrx";
import { useT } from "../../vendor/i18n";
import { createLoginSubmitHandler } from "./login-form.logic";

/**
 * Organismo del formulario de login (D9): UN campo (email) y UN botón
 * primario (una acción primaria por pantalla). Valida formato client-side con
 * `isValidEmail()`; si es válido solicita un OTP vía RPC y solo navega a
 * `/login-verification?email=<email>` en éxito.
 */
export function LoginForm() @{
  const t = useT();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const rpc = createRpcClient(import.meta.env.VITE_API_URL ?? "/rpc");
  const handleSubmit = createLoginSubmitHandler({
    requestOtp: (email: string) => rpc.auth.requestOtp({ email }),
    navigate: (url: string) => location.assign(url),
    setError,
    setIsLoading,
    translate: t,
    isValidEmail,
  });

  <form novalidate onSubmit={(event) => handleSubmit(event, email)} class="flex flex-col gap-4">
    <FormField
      id="email"
      label={t("auth.login.emailLabel")}
      type="email"
      autoComplete="email"
      required
      value={email}
      placeholder={t("auth.login.emailPlaceholder")}
      error={error ?? undefined}
      onInput={(value) => {
        setEmail(value);
        if (error !== null) setError(null);
      }}
    />
    <Button type="submit" disabled={isLoading} class="w-full">
      {isLoading ? t("auth.login.submitLoading") : t("auth.login.submit")}
    </Button>
  </form>
}
