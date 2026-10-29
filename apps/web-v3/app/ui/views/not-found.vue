<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <section class="mx-auto w-full max-w-3xl">
    <h1 class="text-2xl font-semibold tracking-tight text-text">
      {{ t('notFound.title') }}
    </h1>
    <p class="mt-2 text-text-2">{{ t('notFound.body') }}</p>
    <NuxtLink
      to="/dashboard"
      class="mt-4 inline-block text-sm font-medium text-accent hover:underline"
    >
      {{ t('notFound.back') }}
    </NuxtLink>
  </section>
</template>
