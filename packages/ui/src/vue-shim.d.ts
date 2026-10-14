// Single-file components compile in vite (bake, vitest); tsc sees each one
// as a component with untyped props. Nothing type-checks SFC scripts or
// templates yet: vue-tsc is not installed against TypeScript 7.
declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<object, object, unknown>;
  export default component;
}
