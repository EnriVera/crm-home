import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  // PRD-v4 §11.2 (D-v4-1): the product lives behind a login, so the app is a SPA.
  ssr: false,
  // PRD-v4 §12: every route lives in app/router/routes.ts, never in a pages/
  // folder. The pages MODULE stays enabled because it is what consumes
  // app/router.options.ts and registers RouterView + the router middleware;
  // with `pages: false` Nuxt 4.6 short-circuits `isPagesEnabled()` and ignores
  // router.options entirely (dist/index.mjs:2120), leaving the app unrouted.
  // No app/pages/ dir exists, so file-based scanning yields zero routes and the
  // table comes solely from router.options.ts -> routes.ts (§12.6 still holds).
  pages: true,

  compatibilityDate: "2025-07-15",

  modules: ["@pinia/nuxt", "@nuxtjs/i18n"],

  css: ["~/assets/css/tokens.css", "~/assets/css/main.css"],

  vite: {
    plugins: [tailwindcss()],
    // The vendor wrappers are imported by lazy routes (the dashboard pulls
    // @orpc/client, the login layout pulls vue-sonner). Without pre-bundling,
    // Vite discovers them at runtime, re-optimizes and reloads the app
    // mid-mount: the boot then fails with "withDirectives can only be used
    // inside render functions" and "Cannot read properties of null".
    optimizeDeps: {
      include: [
        "@orpc/client",
        "@orpc/client/fetch",
        "@phosphor-icons/vue",
        "vue-sonner",
      ],
    },
  },

  imports: {
    // Auto-imports stay inside the app; the modules below add their own presets.
    dirs: ["composables", "utils", "shared/composables"],
    // Third-party libraries never enter through auto-imports: each one has a
    // wrapper in app/shared/vendor. The machine-enforced guard is the eslint
    // rule in eslint.config.ts (PRD-v4 §11.4/§18); Nuxt's imports config has
    // no per-package exclusion switch.
  },

  devtools: {
    enabled: true,
  },

  // Telemetría de Nuxt apagada a nivel proyecto. Sin esto, el módulo
  // @nuxt/telemetry pide consent interactivo por stdin la primera vez
  // (consola.prompt) y el arranque queda colgado en ese paso: el navegador
  // muestra "setting up @nuxt/telemetry · step 2/7" sin avanzar. Con una
  // terminal sin TTY el prompt nunca se responde y el dev server no levanta.
  telemetry: false,

  typescript: {
    strict: true,
  },

  app: {
    head: {
      title: "CRM-HOME",
      htmlAttrs: { lang: "es" },
    },
  },

  i18n: {
    // Spanish-only v1: messages inline in i18n/i18n.config.ts. File-based
    // lazy locales cross a Vite JSON virtual module that chokes on the space
    // in the repo path, so the scaffold inlines them.
    locales: [{ code: "es" }],
    defaultLocale: "es",
    strategy: "no_prefix",
    // The translation-directive optimizer breaks locale bundles in this
    // stack (module's own v9 warning); off until v10 removes the feature.
    bundle: { optimizeTranslationDirective: false },
  },
});
