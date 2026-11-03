// command view.render, group look.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { ViewMode } from "../bench.js";
import type { ArtifactUri } from "../ids.js";


export interface ViewRenderIO {
  input: {
    target: string;
    mode: ViewMode;
    /** Image width and height, px; a number is a square of that side. */
    size?: readonly [number, number] | number;
  };
  output: { artifact: ArtifactUri };
}
