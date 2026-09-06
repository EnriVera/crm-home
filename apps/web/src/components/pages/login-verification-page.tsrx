import { OtpForm } from "../organisms/otp-form/otp-form.tsrx";
import { useT } from "../vendor/i18n";

export interface LoginVerificationPageProps {
  /** `RenderRouteProps.url` (pathname + search) para leer `?email=` (D3). */
  url: string;
}

/** Lee `email` del query string de la url (pathname + search, origin-free). */
function emailFromUrl(url: string): string | null {
  const search = url.split("?")[1] ?? "";
  const email = new URLSearchParams(search).get("email");
  return email !== null && email !== "" ? email : null;
}

const BACK_LINK_CLASS =
  "self-start rounded-md text-sm font-medium text-primary-700 underline-offset-4 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus dark:text-primary-400";

/**
 * Página `/login-verification` (D9): nombra el email destino y deja volver
 * sin perder contexto. Sin `?email=` muestra mensaje i18n + link a `/login`
 * (nunca una pantalla rota). El código es string con ceros a la izquierda
 * (§8.1, responsabilidad del wrapper `vendor/otp-input`).
 */
export function LoginVerificationPage(props: LoginVerificationPageProps) @{
  const t = useT();
  const email = emailFromUrl(props.url);

  <div class="w-full max-w-sm rounded-xl border border-border bg-surface p-8">
    {email === null ? (
      <div class="flex flex-col gap-4">
        <h1 class="m-0 text-2xl font-semibold tracking-tight text-text-primary">
          {t("auth.otp.title")}
        </h1>
        <p class="m-0 text-sm leading-relaxed text-text-secondary">
          {t("auth.otp.missingEmail")}
        </p>
        <a href="/login" class={BACK_LINK_CLASS}>
          {t("auth.otp.backToLogin")}
        </a>
      </div>
    ) : (
      <div class="flex flex-col gap-6">
        <div class="flex flex-col gap-2">
          <h1 class="m-0 text-2xl font-semibold tracking-tight text-text-primary">
            {t("auth.otp.title")}
          </h1>
          <p class="m-0 text-sm leading-relaxed text-text-secondary">
            {t("auth.otp.subtitlePrefix")}{" "}
            <span class="font-medium text-text-primary">{email}</span>
          </p>
        </div>
        <OtpForm email={email} />
        <a href="/login" class={BACK_LINK_CLASS}>
          {t("auth.otp.backToLogin")}
        </a>
      </div>
    )}
  </div>
}
