<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { PhCheck } from "~/shared/vendor/icons";

const { t } = useI18n();

const prefersDark = ref(false);
let schemeQuery: MediaQueryList | undefined;

const highlights = ["brand.task", "brand.timer", "brand.finance"];

function onSchemeChange(event: MediaQueryListEvent) {
  prefersDark.value = event.matches;
}

onMounted(() => {
  // Public pages follow the operating system preference (PRD-v4 §6.8); the
  // rest of the app follows the preference stored in the account.
  schemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  prefersDark.value = schemeQuery.matches;
  schemeQuery.addEventListener("change", onSchemeChange);
});

onUnmounted(() => {
  schemeQuery?.removeEventListener("change", onSchemeChange);
});
</script>

<template>
  <div
    class="auth-shell relative flex min-h-screen flex-col overflow-hidden bg-bg text-text"
    :class="{ dark: prefersDark }"
    :style="{
      '--auth-tint': prefersDark
        ? 'var(--color-primary-900)'
        : 'var(--color-primary-50)',
    }"
  >
    <!-- The catalogue puts a very subtle green radial tint on the top left
         corner of the public pages (PRD-v4 §8.2). -->
    <div
      class="pointer-events-none absolute inset-0"
      style="background-image: radial-gradient(circle at top left, var(--auth-tint), transparent 60%)"
      aria-hidden="true"
    ></div>

    <main class="relative flex flex-1 items-center justify-center px-4 py-10">
      <div class="grid w-full max-w-5xl items-center gap-10 md:grid-cols-2">
        <section class="hidden md:block">
          <div class="flex items-center gap-2.5">
            <span
              class="flex h-9 w-9 items-center justify-center rounded bg-accent text-sm font-bold text-accent-fg"
            >
              C
            </span>
            <span class="text-sm font-semibold text-text">{{ t('app.name') }}</span>
          </div>

          <h1 class="mt-8 text-3xl font-semibold tracking-tight text-text">
            {{ t('brand.headline') }}
          </h1>
          <p class="mt-3 max-w-sm text-sm text-text-2">{{ t('brand.subtitle') }}</p>

          <ul class="mt-8 space-y-3">
            <li v-for="item in highlights" :key="item" class="flex items-start gap-3">
              <span
                class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-50"
              >
                <PhCheck :size="14" weight="bold" class="text-primary-600" />
              </span>
              <span class="text-sm text-text-2">{{ t(item) }}</span>
            </li>
          </ul>
        </section>

        <section
          class="mx-auto w-full max-w-sm rounded-lg border border-border bg-surface p-8"
        >
          <RouterView />
        </section>
      </div>
    </main>

    <footer class="relative border-t border-border px-4 py-4">
      <nav
        class="flex flex-wrap items-center justify-center gap-4 text-sm"
        :aria-label="t('legal.navLabel')"
      >
        <NuxtLink
          to="/terms"
          class="text-text-2 transition-colors hover:text-accent"
        >
          {{ t('legal.terms.label') }}
        </NuxtLink>
        <NuxtLink
          to="/privacy"
          class="text-text-2 transition-colors hover:text-accent"
        >
          {{ t('legal.privacy.label') }}
        </NuxtLink>
        <NuxtLink
          to="/cookies"
          class="text-text-2 transition-colors hover:text-accent"
        >
          {{ t('legal.cookies.label') }}
        </NuxtLink>
      </nav>
    </footer>
  </div>
</template>

<style scoped>
/* Page entry fade (PRD-v4 §11.5 #1). */
.auth-shell {
  animation: auth-enter 180ms ease-out both;
}

@keyframes auth-enter {
  from {
    opacity: 0;
    transform: translateY(4px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-shell {
    animation: none;
  }
}
</style>
