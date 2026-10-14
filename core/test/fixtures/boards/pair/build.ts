// core/test/fixtures/boards/pair/build.ts
import type { BoardDraft } from "@hackbuild/board";

export function build(): BoardDraft {
  return { backend: "direct", generator: "./gen.py" };
}
