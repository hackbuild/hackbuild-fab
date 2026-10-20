// --import parses `path#N` into ImportSpec.pieces (R1-rails-import-06). A
// # with anything but digits after it stays in the path, so a file named
// with a # still imports and a malformed count reaches the schema as
// written. The range check (an integer at least 1) is part.build's.

import { describe, expect, it } from "vitest";
import { readImports } from "../src/main.js";

describe("--import pieces", () => {
  it("sets pieces from path#N and leaves it absent without one", () => {
    expect(readImports("a.stl#2,b.glb")).toEqual([
      { path: "a.stl", format: "stl", as: "body", pieces: 2 },
      { path: "b.glb", format: "glb", as: "body" },
    ]);
  });

  it("keeps a # inside the name when no count follows it", () => {
    expect(readImports("a#b.stl")).toEqual([{ path: "a#b.stl", format: "stl", as: "body" }]);
  });

  it("does not read a count with trailing text", () => {
    const [spec] = readImports("a.stl#2x") as Record<string, unknown>[];
    expect(spec).toEqual({ path: "a.stl#2x", format: "stl#2x", as: "body" });
    expect(spec).not.toHaveProperty("pieces");
  });

  it("passes a zero count through for part.build to refuse", () => {
    expect(readImports(" plate.stl#0 ")).toEqual([{ path: "plate.stl", format: "stl", as: "body", pieces: 0 }]);
  });
});
