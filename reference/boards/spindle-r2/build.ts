// reference/boards/spindle-r2/build.ts
// A board build names its backend and generator; core runs the generator
// through uv with the epoch in force and validates the record it writes
// (packages/board directSuccess, M08-T06).

import type { BoardDraft } from "@hackbuild/board";

export function build(): BoardDraft {
  return { backend: "direct", generator: "./gen.py" };
}
