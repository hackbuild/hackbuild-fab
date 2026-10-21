// command view.render, group look.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { ViewMode } from "../bench";
import type { ArtifactUri } from "../ids";


export interface ViewRenderIO {
  input: {
    target: string;
    mode: ViewMode;
    /** Image width and height, px. */
    size?: readonly [number, number];
  };
  output: { artifact: ArtifactUri };
}
