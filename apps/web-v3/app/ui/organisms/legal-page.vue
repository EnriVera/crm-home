<script setup lang="ts">
/**
 * An honest legal page for the texts that do not exist yet.
 *
 * The legal texts (terms, privacy, cookies) are written before the
 * production release. A bare "under construction" leaves the visitor on a
 * dead screen: this one says what is and is not in force, without
 * inventing clauses.
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
