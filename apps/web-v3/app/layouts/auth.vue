<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div class="flex min-h-screen flex-col bg-bg text-text">
    <main class="flex flex-1 items-center justify-center px-4 py-12">
      <div class="w-full max-w-md rounded-lg border border-border bg-surface p-8">
        <RouterView />
      </div>
    </main>

    <footer class="border-t border-border px-4 py-4">
      <nav class="flex flex-wrap items-center justify-center gap-4 text-sm" aria-label="Páginas legales">
        <NuxtLink to="/terms" class="text-text-2 transition-colors hover:text-accent">
          {{ t('legal.terms') }}
        </NuxtLink>
        <NuxtLink to="/privacy" class="text-text-2 transition-colors hover:text-accent">
          {{ t('legal.privacy') }}
        </NuxtLink>
        <NuxtLink to="/cookies" class="text-text-2 transition-colors hover:text-accent">
          {{ t('legal.cookies') }}
        </NuxtLink>
      </nav>
    </footer>
  </div>
</template>
