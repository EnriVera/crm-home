import { LoginForm } from "../organisms/login-form/login-form.tsrx";
import { useT } from "../vendor/i18n";

/**
 * Página `/login` (D9): card única centrada `max-w-sm` sobre `bg-background`.
 * Onboarding liviano (primera puerta del producto): título + subtítulo que
 * anticipa qué va a pasar, un campo, un botón. Nada más compite por atención.
 *
 * Variante `?reauth=1`: cuando el 401 interceptor del RPC client detecta
 * cookie inválida (server rechazó la sesión), redirige a `/login?reauth=1`
 * para forzar el render de /login aunque haya cookie presente
 * (createRedirectIfAuthenticated respeta el flag). Mostramos un banner arriba
 * del form explicando al user por qué se le pidió re-login (en lugar de
 * parecer un bug silencioso).
 */
export interface LoginPageProps {
  /** `RenderRouteProps.url` (pathname + search; idéntico en SSR + hidratación — D3). */
  url: string;
}

/** Lee `?reauth=1` del search string (origin-free, safe para SSR). */
function isReauthFromUrl(url: string): boolean {
  const search = url.split("?")[1] ?? "";
  try {
    return new URLSearchParams(search).get("reauth") === "1";
  } catch {
    return false;
  }
}

export function LoginPage(props: LoginPageProps) @{
  const t = useT();
  const showReauthBanner = isReauthFromUrl(props.url);

  <div class="w-full max-w-sm rounded-xl border border-border bg-surface p-8">
    {showReauthBanner ? (
      <div
        role="status"
        data-component="reauth-banner"
        class="mb-6 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning"
      >
        {t("auth.login.sessionExpired")}
      </div>
    ) : null}
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
