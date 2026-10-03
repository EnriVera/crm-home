<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "@/shared/vendor/router";
import { useAuth } from "@/shared/composables/use-auth";
import { useT } from "@/shared/vendor/i18n";
import { Icon } from "@/shared/vendor/icons";
import { toast } from "@/shared/vendor/toast";
import AuthLayout from "@/ui/templates/auth-layout.vue";

const router = useRouter();
const auth = useAuth();
const t = useT();

const email = ref("");
const isSubmitting = ref(false);
const errorMessage = ref<string | null>(null);

const errorKeyByCode: Record<string, string> = {
  validation: "auth.errors.invalidEmail",
  rate_limited: "auth.errors.rateLimited",
  unknown: "auth.errors.unknown",
};

async function onSubmit() {
  errorMessage.value = null;
  isSubmitting.value = true;
  const result = await auth.requestOtp(email.value);
  isSubmitting.value = false;
  if (!result.ok) {
    errorMessage.value = t(errorKeyByCode[result.error.code] ?? "auth.errors.unknown");
    return;
  }
  // Stash the email in the URL so /login-verification can read it
  // without another form. In production this is a one-time signed token.
  await router.navigate({ to: "/login-verification", search: { email: email.value } });
  toast.success("Code sent. Check your inbox.");
}
</script>

<template>
  <AuthLayout>
    <h2 class="mb-1 text-lg font-semibold tracking-tight">Sign in</h2>
    <p class="mb-6 text-sm text-text-2">
      We'll email you a 6-digit code. No passwords.
    </p>
    <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
      <label class="flex flex-col gap-1.5">
        <span class="text-sm font-medium">{{ t("auth.emailLabel") }}</span>
        <input
          v-model="email"
          type="email"
          required
          autocomplete="email"
          :placeholder="t('auth.emailPlaceholder')"
          class="h-10 rounded-md border border-zinc-200 bg-surface px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 dark:border-zinc-800"
        />
      </label>
      <p v-if="errorMessage" class="text-xs text-red-600">{{ errorMessage }}</p>
      <button
        type="submit"
        :disabled="isSubmitting"
        class="flex h-10 items-center justify-center gap-2 rounded-md bg-accent px-3 text-sm font-medium text-accent-fg transition disabled:opacity-50"
      >
        <Icon v-if="isSubmitting" name="PhCircleNotch" :size="16" class="animate-spin" />
        <span>{{ t("auth.requestOtp") }}</span>
      </button>
    </form>
    <template #footer>
      <p class="text-xs text-text-2">
        By continuing you accept the
        <a class="text-accent hover:underline" href="/terms">Terms</a>,
        <a class="text-accent hover:underline" href="/privacy">Privacy</a> and
        <a class="text-accent hover:underline" href="/cookies">Cookies</a>.
      </p>
    </template>
  </AuthLayout>
</template>
