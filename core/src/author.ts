// The Author lives in packages/pipeline, shared with a baked bench
// (D-264). canon.ts loads first so the archetype registry Author.arch
// places from carries sim's click solver in core and in the build sandbox.

import "./canon.js";

export { AUTHOR_CIRCLE_SEGMENTS, AUTHOR_CORNER_SEGMENTS, deriveTargets, machineView, makeAuthor } from "@hackbuild/pipeline";
