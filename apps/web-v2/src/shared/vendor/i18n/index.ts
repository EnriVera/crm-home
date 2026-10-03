/**
 * vue-i18n wrapper — the only place that imports vue-i18n.
 */
import { createI18n, useI18n } from "vue-i18n";

export const i18n = createI18n({
  legacy: false,
  locale: "en",
  fallbackLocale: "en",
  messages: {
    en: {
      auth: {
        emailLabel: "Email",
        // Placeholder is a visual hint; cannot contain '@' because
        // vue-i18n's tokenizer treats '@' as the start of a linked
        // message reference (@:key, @.modifier:key) and throws
        // 'Invalid linked format' on a bare '@'.
        emailPlaceholder: "name at work.com",
        requestOtp: "Send code",
        verifyTitle: "Enter the code we sent",
        verifyHelper: "Check your inbox. The code is 6 digits and expires in 10 minutes.",
        otpLabel: "Code",
        verifyCta: "Verify",
        backToLogin: "Use a different email",
        resendCode: "Send a new code",
        signOut: "Sign out",
        signedInAs: "Signed in as {name}",
        errors: {
          invalidEmail: "Enter a valid email address.",
          otpInvalid: "The code is incorrect.",
          otpExpired: "The code expired. Request a new one.",
          otpMaxAttempts: "Too many attempts. Request a new code.",
          rateLimited: "Wait a minute before requesting another code.",
          unknown: "Something went wrong. Try again.",
        },
        legal: "By continuing you accept the {terms}, {privacy} and {cookies}.",
      },
      nav: {
        dashboard: "Dashboard",
        tasks: "Tasks",
        tasksConfig: "Tasks config",
        schedules: "Schedule",
        clients: "Clients",
        config: "Config",
      },
      common: {
        loading: "Loading",
        empty: "Nothing here yet",
        error: "Something went wrong",
        retry: "Retry",
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        confirm: "Confirm",
      },
    },
  },
});

export function useT() {
  const { t } = useI18n();
  return t;
}
