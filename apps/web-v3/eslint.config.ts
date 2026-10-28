import tsParser from "@typescript-eslint/parser";
import vue from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";

/**
 * Dependency-direction guards (PRD-v4 §11.4, §18).
 *
 * Guard 1 (vendor): third-party UI libraries enter the app only through the
 * wrappers in app/shared/vendor.
 * Guard 2 (domain): the bounded contexts stay pure TypeScript, with no framework
 * and no data layer. It is declared last so it wins over guard 1.
 */
const thirdPartyUiPackages = [
  "@phosphor-icons/vue",
  "vue-draggable-plus",
  // PRD-v4 names "vue-resizable-panels", but that npm name is a 0.0.1
  // placeholder; the real dependency is splitpanes (vendor wrapper §10.3).
  "splitpanes",
];

const thirdPartyUiGroups = ["@zag-js/*", "@unovis/*", "@tiptap/*"];

const frameworkPackages = [
  "vue",
  "vue-router",
  "#app",
  "#imports",
  "nuxt",
  "pinia",
  "@pinia/nuxt",
  "xstate",
  "@orpc/client",
  "@orpc/tanstack-query",
  "@tanstack/vue-query",
  "@zag-js/vue",
  "@zag-js/pin-input",
  "@zag-js/date-picker",
];

function vendorMessage(name: string) {
  return `Importing '${name}' is only allowed inside app/shared/vendor/<tool>/. Add a wrapper there and import from it (PRD-v4 §10.3).`;
}

function domainMessage(name: string) {
  return `app/domain/ must not import '${name}': the bounded contexts stay pure TypeScript (PRD-v4 §11.4).`;
}

export default [
  {
    ignores: [
      "node_modules/**",
      ".nuxt/**",
      ".output/**",
      "dist/**",
      "coverage/**",
    ],
  },
  {
    files: ["**/*.{ts,vue}"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: "latest",
        sourceType: "module",
        extraFileExtensions: [".vue"],
      },
    },
    plugins: { vue },
    rules: {
      ...vue.configs["flat/recommended"].rules,
    },
  },
  // Guard 1: third-party UI libraries live behind app/shared/vendor (PRD-v4 §10.3).
  {
    files: ["app/**/*.{ts,vue}"],
    ignores: ["app/shared/vendor/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: thirdPartyUiPackages.map((name) => ({
            name,
            message: vendorMessage(name),
          })),
          patterns: [
            {
              group: thirdPartyUiGroups,
              message:
                "Third-party UI libraries are only allowed inside app/shared/vendor/<tool>/ (PRD-v4 §10.3).",
            },
          ],
        },
      ],
    },
  },
  // Guard 2: app/domain/ has no framework and no data layer (PRD-v4 §11.4).
  {
    files: ["app/domain/**/*.{ts,vue}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [...frameworkPackages, ...thirdPartyUiPackages].map(
            (name) => ({
              name,
              message: domainMessage(name),
            }),
          ),
          patterns: [
            {
              group: thirdPartyUiGroups,
              message: domainMessage("@zag-js/*"),
            },
          ],
        },
      ],
    },
  },
];
