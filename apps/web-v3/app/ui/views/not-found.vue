<script setup lang="ts">
const { t } = useI18n();
</script>

<template>
  <section data-testid="not-found">
    <h1 class="text-xl font-semibold tracking-tight text-text">
      {{ t("notFound.title") }}
    </h1>
    <p class="mt-2 text-sm text-text-2">{{ t("notFound.body") }}</p>
    <NuxtLink
      to="/dashboard"
      class="mt-4 inline-block text-sm font-medium text-accent hover:underline"
    >
      {{ t("notFound.back") }}
    </NuxtLink>
  </section>
</template>
