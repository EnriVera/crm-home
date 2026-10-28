<script setup lang="ts">
import { computed, ref } from "vue";
import { useAuth } from "~/shared/composables/use-auth";
import { PhEnvelope, PhInfo } from "~/shared/vendor/icons";

const { t } = useI18n();
const route = useRoute();
const { isLoading, errorMessage, clearError, requestOtp } = useAuth();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const email = ref("");
const validationError = ref<string | null>(null);

// The composable reports the failure as an i18n key and the view owns the
// copy, so both sources of failure read the same way inline (PRD-v4 §11.5).
const errorKey = computed(
  () => validationError.value ?? errorMessage.value ?? "",
);

async function onSubmit() {
  validationError.value = null;
  clearError();

  const value = email.value.trim();
  if (!EMAIL_PATTERN.test(value)) {
    validationError.value = "auth.errors.invalidEmail";
    return;
  }

  const sent = await requestOtp(value);
  if (!sent) return;

  // The redirect target travels with the flow so the visitor lands on the
  // page the guard interrupted (PRD-v4 §12.4).
  const redirect =
    typeof route.query.redirect === "string" ? route.query.redirect : undefined;

  await navigateTo({
    path: "/login-verification",
    query: { email: value, redirect },
  });
}
</script>

<template>
  <section class="w-full max-w-sm">
    <h1 class="text-xl font-semibold tracking-tight text-text">
      {{ t('auth.title') }}
    </h1>
    <p class="mt-1.5 text-sm text-text-2">{{ t('auth.subtitle') }}</p>

    <form class="mt-6 flex flex-col gap-4" novalidate @submit.prevent="onSubmit">
      <label class="flex flex-col gap-1.5">
        <span class="text-sm font-medium text-text">{{ t('auth.emailLabel') }}</span>
        <span class="relative block">
          <PhEnvelope
            :size="16"
            class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-2"
          />
          <input
            v-model="email"
            type="email"
            name="email"
            autocomplete="email"
            :placeholder="t('auth.emailPlaceholder')"
            class="h-11 w-full rounded-sm border border-border bg-surface pl-9 pr-3 text-sm text-text outline-none transition-colors placeholder:text-text-2 focus:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </span>
      </label>

      <p class="flex items-start gap-1.5 text-xs text-text-2">
        <PhInfo :size="14" class="mt-0.5 shrink-0" />
        <span>{{ t('auth.hint') }}</span>
      </p>

      <p v-if="errorKey" class="text-sm text-error" data-testid="login-error">
        {{ t(errorKey) }}
      </p>

      <button
        type="submit"
        :disabled="isLoading"
        class="w-full rounded bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition duration-100 ease-out hover:bg-accent-hover active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ isLoading ? t('auth.sending') : t('auth.sendCode') }}
      </button>
    </form>
  </section>
</template>
