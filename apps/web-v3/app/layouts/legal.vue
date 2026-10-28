<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div class="min-h-screen bg-bg text-text">
    <header class="border-b border-border">
      <div class="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
        <span class="text-sm font-semibold">{{ t('app.name') }}</span>
        <NuxtLink to="/" class="text-sm text-text-2 transition-colors hover:text-accent">
          Volver al inicio
        </NuxtLink>
      </div>
    </header>

    <main class="mx-auto max-w-3xl px-4 py-10">
      <RouterView />
    </main>
  </div>
</template>
