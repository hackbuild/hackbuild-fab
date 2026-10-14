// reference/electrical/capricate-touch/build.ts
// The four electrode discs and the minimal trace, built from the chase's
// scene.series: each electrode a prism of its diameter and thickness, on
// one row at the layout pitch, and each lead a straight prism of its
// length, width and thickness, laid along x one pitch below the row, as it
// prints along the flow. circuit.solve prices the nets from the same
// declaration; it extracts nothing from these bodies.

import { defineBuild } from "@hackbuild/spec";
import { chase } from "./chase";

export const build = defineBuild(chase, (p, k) => {
  const series = chase.scene.series;
  const electrodes = series.electrodes.map((e, i) => k.body(e.id, {
    role: "conductor", slot: 1,
    base: { route: "prism", outline: [k.ring.circle(e.diameterMm / 2, [i * p.pitchMm, 0])], z: [0, e.tMm] },
  }));
  const leads = series.leads.map((l, i) => k.body(l.id, {
    role: "conductor", slot: 1,
    base: { route: "prism", outline: [k.ring.roundRect(l.lengthMm, l.widthMm, 0, [l.lengthMm / 2, -(i + 1) * p.pitchMm])], z: [0, l.tMm] },
  }));
  return k.part({
    id: "touch", name: "CAPRICATE TOUCH", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: false, carriesOffset: false, pose: "print" },
    bodies: [...electrodes, ...leads],
    features: [], metrics: [], assertions: [],
  });
});
