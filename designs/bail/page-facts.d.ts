// The virtual module tools/bake/bake.mjs gives a page build bundle (D-264).

declare module "hbf:facts" {
  import type { PageFacts } from "@hackbuild/pipeline";
  export const facts: PageFacts;
}
