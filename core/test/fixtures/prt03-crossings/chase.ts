// core/test/fixtures/prt03-crossings/chase.ts: a 20 mm square PETG pad
// 2 mm tall with a tower 78 mm tall standing on it, the tower's square
// footprint turned 0.3 rad so each of its edges crosses a pad edge at a
// point off the 1/1024 mm grid (packages/mesh test/union-volume.test.ts).
// The two bodies never overlap; the snapped solid differs from them by
// more than the CHK-PRT-03 ceiling, the kernel's union does not.

import { defineChase } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "prt03-crossings", kind: "single", name: "CROSSINGS", version: 1, chase: 2,
    kernels: ["geom", "mesh", "3mf"], machines: ["ffc5p"], license: "MIT",
  },
  materials: [
    { slot: 1, material: "petg", role: "body", label: "body", preview: "#F4F1EA" },
  ],
  params: [
    { id: "tower", label: "TOWER", live: "commit", fields: [
      { id: "H", type: "mm", label: "height", range: [40, 100], step: 1, default: 80 },
    ] },
  ],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }],
  assertions: [],
});
