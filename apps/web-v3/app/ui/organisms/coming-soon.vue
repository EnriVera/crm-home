<script setup lang="ts">
/**
 * Placeholder for the Phase 2 modules (finances).
 *
 * PRD-v4 §7.1 marks Ingresos, Gastos and Transferencias as Phase 2: the
 * APIs exist and the dashboard consumes them, but the screen is not built
 * yet. A bare "under construction" leaves the visitor on a dead screen:
 * this one names the module and offers a way out.
 */
defineProps<{
  /** The name of the module, already translated by the caller. */
  name: string;
}>();

const { t } = useI18n();
</script>

<template>
  <section class="mx-auto w-full max-w-5xl">
    <header>
      <h1 class="text-2xl font-semibold tracking-tight text-text">{{ name }}</h1>
      <p class="mt-1 text-sm text-text-2">{{ t("comingSoon.subtitle") }}</p>
    </header>

    <div
      class="mt-6 rounded-[var(--radius)] border border-dashed border-border bg-surface p-10 text-center"
      data-testid="coming-soon"
    >
      <p class="text-sm font-medium text-text">{{ t("comingSoon.badge") }}</p>
      <p class="mt-2 text-sm text-text-2">{{ t("comingSoon.body") }}</p>
      <NuxtLink
        to="/dashboard"
        class="mt-5 inline-flex items-center gap-2 rounded-[var(--radius)] bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
      >
        {{ t("comingSoon.cta") }}
      </NuxtLink>
    </div>
  </section>
</template>
