// reference/fit/window-channel/build.ts
// A prism block in slot 1 and two `window` features through it along +y.
// Each window's face is the plane y 0 with u along x, so v = normal x u
// points down -z and a face point (x, y) lands at part (x0 + x, z = -y): the
// outlines below negate z. The channel floor and roof and the gable's walls
// sit on layer tops (MachineView.layer); the gable's roof rises 45 degrees
// to its apex, half its width over the wall top.

import { commandError, defineBuild, type FaceFrame, type Feature, type Ring, type Vec2 } from "@hackbuild/spec";
import { chase } from "./chase";

const r4 = (v: number): number => Math.round(v * 1e4) / 1e4;
const rect = (x0: number, y0: number, x1: number, y1: number): Ring => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
/** The window face at x0: the plane y 0, normal +y, u +x. */
const faceAt = (x0: number): FaceFrame => ({ origin: [x0, 0, 0], normal: [0, 1, 0], u: [1, 0, 0] });

export const build = defineBuild(chase, (p, k) => {
  const m = k.machine("ffc5p");
  const thk = r4(m.layer(p.thk));
  const c0 = r4(m.layer(p.chanFloor)), c1 = r4(m.layer(p.chanFloor + p.chanH));
  const g0 = c0, g1 = r4(m.layer(c0 + p.gableWall)), apex = r4(g1 + p.gableW / 2);
  if (Math.max(c1, apex) > thk - 2 * m.layerHeight) {
    throw commandError({
      code: "E_SCHEMA", path: "/thk", got: thk, expected: `at least ${r4(Math.max(c1, apex) + 2 * m.layerHeight)} mm`,
      hint: "leave two layers over the channel roof and the gable apex; make the block thicker or the windows lower",
    });
  }
  const xs = [-p.w / 4, p.w / 4] as const;
  const block = k.body("block", { role: "body", slot: 1, material: "petg", base: { route: "prism", outline: [rect(-p.w / 2, -p.d / 2, p.w / 2, p.d / 2)], z: [0, thk] } });
  const gable: Ring = ([[-p.gableW / 2, g0], [p.gableW / 2, g0], [p.gableW / 2, g1], [0, apex], [-p.gableW / 2, g1]] as Vec2[]).map(([x, z]): Vec2 => [x, -z]);
  const features: Feature[] = [
    { kind: "window", id: "window.channel", body: block.id, roof: "flat", face: faceAt(xs[0]), outline: rect(-p.chanW / 2, -c1, p.chanW / 2, -c0), note: "BAIL's buried cord channel" },
    { kind: "window", id: "window.gable", body: block.id, roof: "gabled", roofAngleDeg: 45, face: faceAt(xs[1]), outline: gable, note: "45 degree gabled window" },
  ];
  return k.part({ id: "window-channel", name: "window channel", process: "fdm", machine: "ffc5p", bodies: [block], features });
});
