<script setup lang="ts">
/**
 * ThemeProvider — wires the theme store to the OS media query and applies
 * the resolved class to <html>. Mounted once at the app root.
 */
import { useTheme } from "@/shared/composables/use-theme";
useTheme();
</script>

<template>
  <slot />
</template>
