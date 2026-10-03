<script setup lang="ts">
/**
 * ToastProvider — mounts the vue-sonner toaster. Exactly one toaster in
 * the app, mounted at the root.
 */
import { Toaster } from "@/shared/vendor/toast";
</script>

<template>
  <Toaster
    position="top-right"
    :toast-options="{
      classes: {
        toast:
          'bg-surface text-text border border-zinc-200 dark:border-zinc-800 shadow-none rounded-md',
        title: 'text-text',
        description: 'text-text-2',
      },
    }"
  />
</template>
