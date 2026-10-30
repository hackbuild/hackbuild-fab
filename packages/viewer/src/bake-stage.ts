/// <reference lib="dom" />
// The stage a ui bake mounts: one `<hb-viewer>` in the host, sized by the
// element itself and freed when it leaves the page (D-055). The bench shell
// of M09-T07 hands it parts and modes; until then it shows the empty void
// with the graph rule.

import { REVISION } from "three";
import { defineHbViewer, HB_VIEWER_TAG, type HbViewer } from "./hb-viewer.js";

export interface BakeStage {
  /** three's REVISION string, so a smoke can read which build was inlined. */
  readonly revision: string;
  readonly viewer: HbViewer;
  dispose(): void;
}

export function mountBakeStage(host: HTMLElement): BakeStage {
  defineHbViewer();
  const viewer = document.createElement(HB_VIEWER_TAG) as unknown as HbViewer;
  host.appendChild(viewer);
  return {
    revision: REVISION,
    viewer,
    dispose(): void {
      viewer.remove();
    },
  };
}
