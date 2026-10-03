<script setup lang="ts">
import { useAuth } from "@/shared/composables/use-auth";
import { useT } from "@/shared/vendor/i18n";
import { Link } from "@/shared/vendor/router";
import { Icon } from "@/shared/vendor/icons";

// Destructure so the template auto-unwraps the ref. See app-shell.vue
// for the rationale.
const { profile } = useAuth();
const t = useT();
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-8">
    <header>
      <h1 class="text-2xl font-semibold tracking-tight">{{ t("nav.dashboard") }}</h1>
      <p class="mt-1 text-sm text-text-2">
        Welcome back<span v-if="profile">, {{ profile.name }}</span>.
      </p>
    </header>

    <section class="grid gap-4 sm:grid-cols-2">
      <article
        class="rounded-lg border border-zinc-200 bg-surface p-6 dark:border-zinc-800"
      >
        <div class="flex items-center gap-2 text-text-2">
          <Icon name="PhTimer" :size="18" />
          <h2 class="text-sm font-medium">Active timer</h2>
        </div>
        <p class="mt-3 text-sm text-text-2">
          No timer running. Start one from
          <Link to="/schedules" class="text-accent hover:underline">Schedule</Link>.
        </p>
      </article>

      <article
        class="rounded-lg border border-zinc-200 bg-surface p-6 dark:border-zinc-800"
      >
        <div class="flex items-center gap-2 text-text-2">
          <Icon name="PhCheckSquare" :size="18" />
          <h2 class="text-sm font-medium">Tasks</h2>
        </div>
        <p class="mt-3 text-sm text-sm text-text-2">
          No tasks yet. Create your first one from
          <Link to="/tasks" class="text-accent hover:underline">Tasks</Link>.
        </p>
      </article>
    </section>
  </div>
</template>
