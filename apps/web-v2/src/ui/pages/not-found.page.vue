<script setup lang="ts">
import { Link } from "@/shared/vendor/router";
</script>

<template>
  <div class="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
    <p class="text-sm font-medium text-text-2">404</p>
    <h1 class="text-2xl font-semibold tracking-tight">Page not found</h1>
    <p class="max-w-sm text-sm text-text-2">
      The page you were looking for doesn't exist or has moved.
    </p>
    <Link to="/dashboard" class="text-sm text-accent hover:underline">
      Go to dashboard
    </Link>
  </div>
</template>
