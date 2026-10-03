<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter, useSearch } from "@/shared/vendor/router";
import { useAuth } from "@/shared/composables/use-auth";
import { useT } from "@/shared/vendor/i18n";
import { Icon } from "@/shared/vendor/icons";
import { OtpInput } from "@/shared/vendor/zag";
import { toast } from "@/shared/vendor/toast";
import AuthLayout from "@/ui/templates/auth-layout.vue";

const router = useRouter();
const search = useSearch({ from: "/login-verification" });
const auth = useAuth();
const t = useT();

const code = ref("");
const isSubmitting = ref(false);
const errorMessage = ref<string | null>(null);

const email = computed(() => (search.value as { email?: string }).email ?? "");

const errorKeyByCode: Record<string, string> = {
  validation: "auth.errors.otpInvalid",
  unauthenticated: "auth.errors.otpInvalid",
  rate_limited: "auth.errors.rateLimited",
  unknown: "auth.errors.unknown",
};

async function onComplete(value: string) {
  errorMessage.value = null;
  isSubmitting.value = true;
  const result = await auth.verifyOtp({ email: email.value, code: value });
  isSubmitting.value = false;
  if (!result.ok) {
    errorMessage.value = t(errorKeyByCode[result.error.code] ?? "auth.errors.unknown");
    return;
  }
  // Boot the auth state to fetch the profile before navigating.
  // The boot already ran at app start (src/app/boot.ts → bootAuth in
  // main.ts). After verifyOtp succeeds, refresh the session+profile
  // so the dashboard sees the new cookie-backed identity.
  await auth.getSession();
  toast.success("Signed in.");
  await router.navigate({ to: "/dashboard" });
}

function backToLogin() {
  void router.navigate({ to: "/login" });
}
</script>

<template>
  <AuthLayout>
    <h2 class="mb-1 text-lg font-semibold tracking-tight">
      {{ t("auth.verifyTitle") }}
    </h2>
    <p class="mb-6 text-sm text-text-2">
      {{ t("auth.verifyHelper") }}
    </p>
    <div class="flex flex-col items-center gap-6">
      <OtpInput
        v-model="code"
        :auto-focus="true"
        :invalid="errorMessage !== null"
        @complete="onComplete"
      />
      <p v-if="errorMessage" class="text-xs text-red-600">{{ errorMessage }}</p>
      <p v-if="isSubmitting" class="flex items-center gap-2 text-xs text-text-2">
        <Icon name="PhCircleNotch" :size="14" class="animate-spin" />
        <span>Verifying</span>
      </p>
    </div>
    <button
      type="button"
      class="mt-6 w-full text-center text-sm text-accent hover:underline"
      @click="backToLogin"
    >
      {{ t("auth.backToLogin") }}
    </button>
    <template #footer>
      <p class="text-xs text-text-2">Sent to {{ email || "(missing email)" }}</p>
    </template>
  </AuthLayout>
</template>
