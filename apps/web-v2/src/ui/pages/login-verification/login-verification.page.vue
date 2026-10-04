<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter, useSearch } from "@/shared/vendor/router";
import { useAuth } from "@/shared/composables/use-auth";
import { useT } from "@/shared/vendor/i18n";
import { Icon } from "@/shared/vendor/icons";
import { OtpInput } from "@/shared/vendor/zag";
import { toast } from "@/shared/vendor/toast";
import Button from "@/shared/ui/Button.vue";
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

/* ============================================================== */
/*  Resend timer (2 minutes between resends)                     */
/* ============================================================== */

const RESEND_COOLDOWN_SECONDS = 120;
const resendSecondsLeft = ref(RESEND_COOLDOWN_SECONDS);
const isResending = ref(false);
let resendIntervalId: ReturnType<typeof setInterval> | undefined;

const resendCountdown = computed(() => {
 const s = Math.max(0, resendSecondsLeft.value);
 const m = Math.floor(s / 60);
 const sec = s % 60;
 return `${m}:${sec.toString().padStart(2, "0")}`;
});

const canResend = computed(() => resendSecondsLeft.value <= 0 && !isResending.value);

function startResendTimer() {
 if (resendIntervalId !== undefined) return;
 resendIntervalId = setInterval(() => {
  if (resendSecondsLeft.value <= 0) {
   stopResendTimer();
   return;
  }
  resendSecondsLeft.value -= 1;
 }, 1000);
}

function stopResendTimer() {
 if (resendIntervalId !== undefined) {
  clearInterval(resendIntervalId);
  resendIntervalId = undefined;
 }
}

async function resendCode() {
 if (!canResend.value || !email.value) return;
 isResending.value = true;
 const result = await auth.requestOtp(email.value);
 isResending.value = false;
 if (!result.ok) {
  toast.error(t(errorKeyByCode[result.error.code] ?? "auth.errors.unknown"));
  return;
 }
 resendSecondsLeft.value = RESEND_COOLDOWN_SECONDS;
 startResendTimer();
 toast.success("Code sent. Check your inbox.");
}

onMounted(() => {
 startResendTimer();
});
onUnmounted(() => {
 stopResendTimer();
});
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
  <div class="mt-6 flex items-center justify-between gap-3">
   <Button
    variant="dark"
    size="sm"
    @click="backToLogin"
   >
    {{ t("auth.backToLogin") }}
   </Button>
   <Button
    variant="primary"
    size="sm"
    :disabled="!canResend"
    :loading="isResending"
    @click="resendCode"
   >
    <span v-if="canResend">{{ t("auth.resend") }}</span>
    <span v-else>{{ t("auth.resendIn", { time: resendCountdown }) }}</span>
   </Button>
  </div>
  <template #footer>
   <p class="text-xs text-text-2">Sent to {{ email || "(missing email)" }}</p>
  </template>
 </AuthLayout>
</template>
