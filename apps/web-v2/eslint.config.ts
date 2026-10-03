import vue from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";
import importPlugin from "eslint-plugin-import";
import tsParser from "@typescript-eslint/parser";

/**
 * Dependency-direction rules from PRD-v3 §5.1, calibrated per
 * day-of-judgment fix B-005.
 *
 * The blocked list is **only third-party UI / state-management
 * packages**. Framework primitives (`vue`, `pinia`, `effect`,
 * `xstate`) are allowed wherever the layer needs them: `pinia` in
 * `src/stores/**`, `vue` in `src/shared/composables/**` and
 * `src/stores/**`, etc. The vendor rule's job is to keep UI / client
 * libraries out of business logic, not to gate the framework.
 *
 * Each blocked package has ONE legitimate home — its wrapper under
 * `src/shared/vendor/<tool>/`. Anything else triggers a lint error
 * that the build script will fail on.
 */
const vendorOnlyPackages = [
  // Data layer
  "@tanstack/vue-query",
  "@orpc/client",
  "@orpc/tanstack-query",
  // Forms
  "vee-validate",
  "@vee-validate/zod",
  // UI / icons / i18n / toast
  "@phosphor-icons/vue",
  "vue-sonner",
  "vue-i18n",
  // Charts / rich text / drag / resizable (vendor wrappers wrap them)
  "@unovis/vue",
  "@tiptap/vue-3",
  "vue-draggable-plus",
  "vue-resizable-panels",
  // Zag
  "@zag-js/vue",
  "@zag-js/accordion",
  "@zag-js/checkbox",
  "@zag-js/date-picker",
  "@zag-js/dialog",
  "@zag-js/menu",
  "@zag-js/pin-input",
  "@zag-js/popover",
  "@zag-js/select",
  "@zag-js/switch",
  "@zag-js/tabs",
  "@zag-js/tooltip",
];

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      ".output/**",
      "src/router/routeTree.gen.ts",
      "**/*.vue.d.ts",
      "tests/**",
    ],
  },
  {
    files: ["**/*.{ts,tsx,vue}"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: "latest",
        sourceType: "module",
        extraFileExtensions: [".vue"],
      },
    },
    plugins: { import: importPlugin, vue },
    rules: {
      ...vue.configs["flat/recommended"].rules,
    },
  },
  // ---- Vendor encapsulation (PRD-v3 §4 deltas item 2) ----
  // Third-party UI / client packages are forbidden outside the vendor tree.
  {
    files: ["src/**/*.{ts,tsx,vue}"],
    ignores: ["src/shared/vendor/**/*", "src/router/routeTree.gen.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: vendorOnlyPackages.map((name) => ({
            name,
            message:
              `Importing '${name}' is only allowed inside src/shared/vendor/<tool>/. ` +
              `Add a wrapper in src/shared/vendor/<tool>/index.ts and import from there.`,
          })),
        },
      ],
    },
  },
  // The vendor tree itself imports its libs directly.
  {
    files: ["src/shared/vendor/**/*.{ts,tsx,vue}"],
    rules: { "no-restricted-imports": "off" },
  },
  // ---- domain/ purity (PRD-v3 §4 deltas item 1) ----
  // Pinned at the bottom of the list so it takes precedence over the
  // vendor rule: domain must never depend on ANY third-party.
  {
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            ...vendorOnlyPackages.map((name) => ({
              name,
              message: `domain/ must not depend on third-party '${name}'.`,
            })),
            { name: "xstate", message: "domain/ must not depend on xstate." },
            { name: "effect", message: "domain/ must not depend on effect." },
          ],
        },
      ],
    },
  },
  // ---- application/ purity ----
  {
    files: ["src/application/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            ...vendorOnlyPackages.map((name) => ({
              name,
              message: `application/ must not depend on third-party '${name}'.`,
            })),
            {
              name: "xstate",
              message: "application/ must not depend on xstate.",
            },
            {
              name: "effect",
              message: "application/ must not depend on effect.",
            },
          ],
        },
      ],
    },
  },
];
