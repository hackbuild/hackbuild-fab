// featureMaterial (core/src/commands/param-bindings.ts, D-248): the material
// constraints.query reads for a feature. A conductor names its own material
// while its body is the host it is partitioned from, so the host's material
// must never price a conductor.

import { describe, expect, test } from "vitest";
import type { Part } from "@hackbuild/spec";
import { featureMaterial } from "../src/commands/param-bindings.js";

const part = {
  bodies: [
    { id: "host", material: "pla" },
    { id: "pad", material: "tpu95" },
  ],
  features: [
    { kind: "conductor", id: "trace", body: "host", material: "cpla-protopasta" },
    { kind: "pocket", id: "seat", body: "pad" },
    { kind: "bore", id: "hole" },
  ],
} as unknown as Part;

describe("featureMaterial", () => {
  test("a conductor reads its declared material, not its host body's", () => {
    expect(featureMaterial(part, "trace")).toBe("cpla-protopasta");
  });
  test("a feature with no material reads its body's", () => {
    expect(featureMaterial(part, "seat")).toBe("tpu95");
  });
  test("a feature with no body reads the first body's, as does an unknown id", () => {
    expect(featureMaterial(part, "hole")).toBe("pla");
    expect(featureMaterial(part, "nothing")).toBe("pla");
  });
});
