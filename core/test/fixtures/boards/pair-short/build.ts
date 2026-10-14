// core/test/fixtures/boards/pair-short/build.ts
import type { BoardDraft } from "@hackbuild/board";

export function build(): BoardDraft {
  return { backend: "direct", generator: "./gen.py" };
}
