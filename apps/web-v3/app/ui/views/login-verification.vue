<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useAuth } from "~/shared/composables/use-auth";
import { PhShieldCheck } from "~/shared/vendor/icons";
import { OtpInput } from "~/shared/vendor/otp-input";

const { t } = useI18n();
const route = useRoute();
const { isLoading, errorMessage, clearError, requestOtp, verifyOtp } = useAuth();

const RESEND_SECONDS = 30;

const code = ref("");
const isCodeComplete = ref(false);
const secondsLeft = ref(RESEND_SECONDS);
let resendTimer: ReturnType<typeof setInterval> | undefined;

const email = computed(() =>
  typeof route.query.email === "string" ? route.query.email : "",
);

const errorKey = computed(() => errorMessage.value ?? "");

const countdown = computed(() => {
  const total = Math.max(0, secondsLeft.value);
  const minutes = Math.floor(total / 60).toString().padStart(2, "0");
  const seconds = (total % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
});

const canResend = computed(() => secondsLeft.value <= 0);
const canVerify = computed(() => isCodeComplete.value && !isLoading.value);

// The redirect target comes from the URL, so only an internal path is a valid
// destination: a crafted ?redirect= must never send the visitor off site.
function internalTarget(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

function stopResendTimer() {
  if (resendTimer !== undefined) {
    clearInterval(resendTimer);
    resendTimer = undefined;
  }
}

function startResendTimer() {
  stopResendTimer();
  resendTimer = setInterval(() => {
    if (secondsLeft.value <= 0) {
      stopResendTimer();
      return;
    }
    secondsLeft.value -= 1;
  }, 1000);
}

function onCodeInput(value: string) {
  code.value = value;
  isCodeComplete.value = false;
  if (errorMessage.value) clearError();
}

// The six digits already parse as OtpDigits, so the code can be verified.
function onComplete(value: string) {
  code.value = value;
  isCodeComplete.value = true;
}

async function onVerify() {
  if (!canVerify.value) return;
  const verified = await verifyOtp({ email: email.value, code: code.value });
  if (!verified) {
    // The wrong code is cleared so the visitor types a fresh one.
    code.value = "";
    isCodeComplete.value = false;
    return;
  }
  await navigateTo(internalTarget(route.query.redirect) ?? "/dashboard");
}

async function onResend() {
  if (!canResend.value || isLoading.value) return;
  const sent = await requestOtp(email.value);
  if (!sent) return;
  secondsLeft.value = RESEND_SECONDS;
  startResendTimer();
}

onMounted(() => {
  if (!email.value) {
    // Without an email there is nothing to verify, so the visitor goes back to
    // the login form.
    void navigateTo("/login", { replace: true });
    return;
  }
  startResendTimer();
});

onUnmounted(stopResendTimer);
</script>

<template>
  <section class="w-full max-w-sm text-center">
    <div
      class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-50"
    >
      <PhShieldCheck :size="24" class="text-primary-600" />
    </div>

    <h1 class="mt-4 text-xl font-semibold tracking-tight text-text">
      {{ t('auth.verifyTitle') }}
    </h1>
    <p class="mt-1.5 text-sm text-text-2">
      {{ t('auth.otpSubtitle', { email }) }}
    </p>

    <div class="mt-6 flex justify-center">
      <!-- Verifying shows the skeleton of the six boxes instead of the boxes
           themselves (PRD-v4 §11.5). -->
      <div v-if="isLoading" class="flex items-center gap-2" aria-hidden="true">
        <span
          v-for="cell in 6"
          :key="cell"
          class="otp-shimmer h-12 w-10 rounded-sm border border-border"
        ></span>
      </div>
      <OtpInput
        v-else
        :model-value="code"
        :invalid="errorMessage !== null"
        :disabled="isLoading"
        @update:model-value="onCodeInput"
        @complete="onComplete"
      />
    </div>

    <p v-if="errorKey" class="mt-4 text-sm text-error" data-testid="otp-error">
      {{ t(errorKey) }}
    </p>

    <button
      type="button"
      :disabled="!canVerify"
      class="mt-6 w-full rounded bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition duration-100 ease-out hover:bg-accent-hover active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
      @click="onVerify"
    >
      {{ t('auth.verify') }}
    </button>

    <div class="mt-4 flex items-center justify-between gap-3 text-sm">
      <button
        v-if="canResend"
        type="button"
        class="text-primary-700 transition-colors hover:underline"
        @click="onResend"
      >
        {{ t('auth.resendReady') }}
      </button>
      <span v-else class="text-text-2">
        {{ t('auth.resend', { seconds: countdown }) }}
      </span>

      <RouterLink to="/login" class="text-primary-700 transition-colors hover:underline">
        ← {{ t('auth.backToLogin') }}
      </RouterLink>
    </div>
  </section>
</template>
