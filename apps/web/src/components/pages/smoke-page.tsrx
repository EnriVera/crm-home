import { AppTitle } from "../atoms/app-title.tsrx";
import { FeatureCard } from "../molecules/feature-card.tsrx";
import { useT } from "../vendor/i18n";

/**
 * Página de humo (D7): compone al menos un atom y un molecule; todos sus
 * textos provienen exclusivamente del catálogo i18n `es`.
 */
export function SmokePage() @{
  const t = useT();

  <section class="flex max-w-2xl flex-col items-center gap-5 px-6 py-12 text-center">
    <AppTitle />
    <p class="m-0 text-lg leading-relaxed text-text-secondary">
      {t("smoke.description")}
    </p>
    <FeatureCard />
  </section>
}
