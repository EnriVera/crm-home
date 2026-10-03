<script setup lang="ts">
/**
 * App.vue — the root component. Mounts the providers, then renders
 * the active route through the TanStack Router. Boot (auth, i18n,
 * theme) happens in main.ts BEFORE this component mounts.
 */
import { RouterProvider } from "@/shared/vendor/router";
import { router } from "@/router";
import ThemeProvider from "./providers/theme-provider.vue";
import I18nProvider from "./providers/i18n-provider.vue";
import ToastProvider from "./providers/toast-provider.vue";
</script>

<template>
  <ThemeProvider>
    <I18nProvider>
      <ToastProvider />
      <RouterProvider :router="router" />
    </I18nProvider>
  </ThemeProvider>
</template>
