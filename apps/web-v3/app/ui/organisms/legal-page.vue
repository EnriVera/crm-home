<script setup lang="ts">
/**
 * Página legal honesta para los textos que todavía no existen.
 *
 * Los textos legales (términos, privacidad, cookies) se redactan antes
 * de la salida a producción. Un "En construcción" sin contexto deja al
 * usuario en una pantalla muerta; esto dice qué está y qué no está en
 * vigor, sin inventar cláusulas.
 */
defineProps<{ title: string; body: string }>();
</script>

<template>
  <section class="mx-auto w-full max-w-3xl">
    <header>
      <h1 class="text-2xl font-semibold tracking-tight text-text">
        {{ title }}
      </h1>
    </header>

    <div
      class="mt-6 rounded-[var(--radius)] border border-border bg-surface p-6"
      data-testid="legal-page"
    >
      <p class="text-sm leading-relaxed text-text-2">{{ body }}</p>
    </div>
  </section>
</template>
