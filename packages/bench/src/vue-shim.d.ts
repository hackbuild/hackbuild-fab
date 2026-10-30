// Single-file components compile in vite (bake, vitest). tools/vue-check.mjs
// type-checks their scripts and templates (vue-tsc on TypeScript 6); this
// shim only serves tsc -b, which sees each one as a component with untyped props.
declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<object, object, unknown>;
  export default component;
}
