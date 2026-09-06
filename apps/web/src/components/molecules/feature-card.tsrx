import { useT } from "../vendor/i18n";

/** Molecule de ejemplo (D7): tarjeta de feature. Consume solo `../vendor`. */
export function FeatureCard() @{
  const t = useT();

  <article class="max-w-xl rounded-xl border border-border bg-surface p-5">
    <h2 class="m-0 text-base font-semibold text-primary">
      {t("smoke.feature.title")}
    </h2>
    <p class="m-0 mt-2 leading-relaxed text-text-secondary">
      {t("smoke.feature.body")}
    </p>
  </article>
}
