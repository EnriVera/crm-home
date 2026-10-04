<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "@/shared/vendor/router";
import { useAuth } from "@/shared/composables/use-auth";
import { useT } from "@/shared/vendor/i18n";
import Button from "@/shared/ui/Button.vue";
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
 // The post-login destination is held in the redirect store (set
 // by the (authed) layout guard). It survives this route change
 // because Pinia is app-scoped, so the verification page reads it
 // directly. No URL param, no hint UI.
 await router.navigate({ to: "/login-verification", search: { email: email.value } });
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
   <Button
    type="submit"
    size="md"
    variant="primary"
    :loading="isSubmitting"
    class="w-full"
   >
    {{ t("auth.requestOtp") }}
   </Button>
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
