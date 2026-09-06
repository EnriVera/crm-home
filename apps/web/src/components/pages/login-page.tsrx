import { LoginForm } from "../organisms/login-form/login-form.tsrx";
import { useT } from "../vendor/i18n";

/**
 * Página `/login` (D9): card única centrada `max-w-sm` sobre `bg-background`.
 * Onboarding liviano (primera puerta del producto): título + subtítulo que
 * anticipa qué va a pasar, un campo, un botón. Nada más compite por atención.
 */
export function LoginPage() @{
  const t = useT();

  <div class="w-full max-w-sm rounded-xl border border-border bg-surface p-8">
    <div class="mb-6 flex flex-col gap-2">
      <h1 class="m-0 text-2xl font-semibold tracking-tight text-text-primary">
        {t("auth.login.title")}
      </h1>
      <p class="m-0 text-sm leading-relaxed text-text-secondary">
        {t("auth.login.subtitle")}
      </p>
    </div>
    <LoginForm />
  </div>
}
