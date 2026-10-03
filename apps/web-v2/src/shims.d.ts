/**
 * shims.d.ts — TypeScript declarations for the runtime modules that TS
 * cannot infer from JS source. The Vue SFC declaration is the standard
 * stub that lets `import Foo from "./Foo.vue"` resolve to a Vue component
 * type. The CSS module declaration lets `import styles from "./x.module.css"`
 * resolve when we need it.
 */
declare module "*.vue" {
 import type { DefineComponent } from "vue";
 const component: DefineComponent<
  Record<string, unknown>,
  Record<string, unknown>,
  unknown
 >;
 export default component;
}

declare module "*.module.css" {
 const classes: Record<string, string>;
 export default classes;
}
