import { useState } from "octane";
import { isValidEmail } from "../../../lib/validation/email";
import { Button } from "../../atoms/button.tsrx";
import { FormField } from "../../molecules/form-field.tsrx";
import { useT } from "../../vendor/i18n";

/**
 * Organismo del formulario de login (D9): UN campo (email) y UN botón
 * primario (una acción primaria por pantalla). Valida formato client-side con
 * `isValidEmail()`; si es válido navega (MPA) a
 * `/login-verification?email=<encodeURIComponent(email)>`.
 */
export function LoginForm() @{
  const t = useT();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: Event) => {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setError(t("auth.login.errorInvalidEmail"));
      return;
    }
    location.assign(
      `/login-verification?email=${encodeURIComponent(email.trim())}`,
    );
  };

  <form novalidate onSubmit={handleSubmit} class="flex flex-col gap-4">
    <FormField
      id="email"
      label={t("auth.login.emailLabel")}
      type="email"
      autocomplete="email"
      required
      value={email}
      placeholder={t("auth.login.emailPlaceholder")}
      error={error ?? undefined}
      onInput={(value) => {
        setEmail(value);
        if (error !== null) setError(null);
      }}
    />
    <Button type="submit" class="w-full">
      {t("auth.login.submit")}
    </Button>
  </form>
}
