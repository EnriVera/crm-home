<script setup lang="ts">
/**
 * AuthLayout — public layout for /login and /login-verification.
 * Uses the system theme (PRD-v2 §6.8). One centered card.
 */
</script>

<template>
  <main class="flex min-h-full items-center justify-center bg-bg p-6">
    <div class="w-full max-w-sm">
      <header class="mb-6 flex items-center justify-center gap-2">
        <div class="h-8 w-8 rounded-md bg-accent" />
        <h1 class="text-lg font-semibold tracking-tight">CRM-Home</h1>
      </header>
      <div
        class="rounded-lg border border-zinc-200 bg-surface p-6 shadow-none dark:border-zinc-800"
      >
        <slot />
      </div>
      <footer class="mt-6 text-center text-xs text-text-2">
        <slot name="footer" />
      </footer>
    </div>
  </main>
</template>
