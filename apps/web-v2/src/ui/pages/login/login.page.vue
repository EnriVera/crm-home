<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter, useSearch } from "@/shared/vendor/router";
import { useAuth } from "@/shared/composables/use-auth";
import { useT } from "@/shared/vendor/i18n";
import Button from "@/shared/ui/Button.vue";
import AuthLayout from "@/ui/templates/auth-layout.vue";

const router = useRouter();
const search = useSearch({ from: "/login" });
const auth = useAuth();
const t = useT();

const email = ref("");
const isSubmitting = ref(false);
const errorMessage = ref<string | null>(null);

/**
 * Read the `redirect` query param. The (authed) layout guard sets it
 * to the URL the user was trying to visit when the session check
 * failed. We forward it through to /login-verification so the
 * verify step can return the user to the original page.
 *
 * Only accept relative paths starting with '/' (no scheme, no host)
 * to prevent open-redirect attacks via the query param.
 */
const redirect = computed<string | null>(() => {
  const raw = (search.value as { redirect?: string }).redirect;
  if (typeof raw !== "string" || !raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  return raw;
});

const redirectLabel = computed(() => redirect.value ?? "/dashboard");

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
 // Stash the email + redirect in the URL so /login-verification can
 // read them without another form. In production the email is a
 // one-time signed token; the redirect stays as a relative path.
 await router.navigate({
  to: "/login-verification",
  search: { email: email.value, redirect: redirect.value ?? undefined },
 });
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
  <div
   v-if="redirect"
   class="mt-4 flex items-center justify-end gap-2 text-xs text-text-2"
   data-testid="redirect-hint"
  >
   <span>You'll be redirected to</span>
   <code class="rounded-sm bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-text dark:bg-zinc-800">{{ redirectLabel }}</code>
  </div>
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
