<script setup lang="ts">
/**
 * Placeholder honesto para los módulos de la Fase 2 (finanzas).
 *
 * PRD-v4 §7.1 marca Ingresos, Gastos y Transferencias como Fase 2: las APIs
 * ya existen y las consume el dashboard, pero la pantalla todavía no está
 * construida. Un "En construcción" sin más deja al usuario en una pantalla
 * muerta; esto dice qué falta y ofrece a dónde ir.
 */
const { t } = useI18n();
</script>

<template>
  <section class="mx-auto w-full max-w-5xl">
    <header>
      <h1 class="text-2xl font-semibold tracking-tight text-text">
        {{ t("comingSoon.title") }}
      </h1>
      <p class="mt-1 text-sm text-text-2">{{ t("comingSoon.subtitle") }}</p>
    </header>

    <div
      class="mt-6 rounded-[var(--radius)] border border-dashed border-border bg-surface p-10 text-center"
      data-testid="coming-soon"
    >
      <p class="text-sm text-text-2">{{ t("comingSoon.body") }}</p>
      <NuxtLink
        to="/dashboard"
        class="mt-5 inline-flex items-center gap-2 rounded-[var(--radius)] bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
      >
        {{ t("comingSoon.cta") }}
      </NuxtLink>
    </div>
  </section>
</template>
