// reference/electrical/pip-drive/build.ts
// One straight conductive PLA trace per declared net, built from the
// chase's scene.drive: each net a prism of its routed length with stubs,
// the trace width and the trace thickness, laid along x one pitch apart,
// circuit.solve prices the key paths from the same declaration and reads
// them at its own ports; it extracts nothing from these bodies. The posts
// and the switch are priced, not built. The routed stack itself is
// reference/electrical/pip-buried-route.

import { defineBuild, type DriveSceneDecl } from "@hackbuild/spec";
import { chase } from "./chase";

export const build = defineBuild(chase, (p, k) => {
  const drive: DriveSceneDecl = chase.scene.drive;
  const bodies = drive.nets.map((n, i) => k.body(`trace.${n.net}`, {
    role: "conductor", slot: 1,
    base: { route: "prism", outline: [k.ring.roundRect(n.lengthMm, drive.trace.widthMm, 0, [n.lengthMm / 2, -i * p.pitchMm])], z: [0, drive.trace.tMm] },
  }));
  return k.part({
    id: "drive", name: "PIP DRIVE", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: false, carriesOffset: false, pose: "print" },
    bodies, features: [], metrics: [], assertions: [],
  });
});
