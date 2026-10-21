// command chase.render, group look.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { ArtifactUri } from "../ids";

export interface ChaseRenderIO {
  /** screenshots false measures every view and stores no png; default true. */
  input: { chase: string; screenshots?: boolean };
  output: {
    /** The baked page in the store, hbf://artifact/<hash> (D-050). */
    url: string;
    /** One png per rail step and width, in views order; empty when screenshots is false. */
    shots: readonly ArtifactUri[];
    /** Per rail step, at 1280 then 390 px; one view "page" when the bench has no steps strip. */
    views: readonly {
      step: string;
      /** Viewport width, px. */
      width: number;
      /** Document scroll width, px (measured); over width is horizontal overflow. */
      scrollWidth: number;
      /** Focal pink elements after the structural set (measured); the budget is 1. */
      pinkFocal: number;
    }[];
    /** Console and page errors over the whole run. */
    consoleErrors: readonly string[];
    /** Requests whose url is not file: or data:. */
    network: readonly string[];
  };
}
