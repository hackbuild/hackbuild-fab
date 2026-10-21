// designs/blocks/build.ts
// One BLOCKS part per build, release 1 cut (chase.ts header). Conditionals
// live here (D-178): which archetype runs, and every refusal.
//
// - wire: the blocks-wire archetype (Author.arch) lying on the bed, as
//   reference/conductors/blocks-wire places it. Ported on the blocks-html
//   standard only, so boss-v1 is refused.
// - stud: the blocks-stud archetype on a one stud brick (brickBody, 8 x 8
//   mm, corner 0.6), as reference/conductors/blocks-stud places it, at the
//   chosen standard.
//
// The brick standard has no default (D-087): a stud with standard "unset"
// is E_SCHEMA. A standard whose layer differs from the machine preset's is
// a LAYER warning, since the export layer must equal the standard.

import { commandError, defineBuild, qualify, type FaceFrame } from "@hackbuild/spec";
import { chase } from "./chase";

const STUD = "blocks-stud", WIRE = "blocks-wire";
/** BLOCKS pitch, mm: one stud cell (originals/blocks/files/src-extracted/blocks.js line 19). */
const PITCH = 8;
/** brickBody corner radius, mm (originals/blocks/files/src-extracted/parts.js line 56). */
const CORNER = 0.6;
/** Layer height of each standard, mm (boss.js line 5; blocks.js line 14). */
const LAYER = { "boss-v1": 0.24, "blocks-html": 0.2 } as const;

const up = (z: number): FaceFrame => ({ origin: [0, 0, z], normal: [0, 0, 1], u: [1, 0, 0] });

export const build = defineBuild(chase, (p, k) => {
  const machine = k.machine();
  const refuse = (got: string, expected: string, hint: string): never => {
    throw commandError({ code: "E_SCHEMA", path: "/standard", got, expected, hint });
  };
  if (p.part === "stud" && p.standard === "unset") {
    refuse(p.standard, "boss-v1 or blocks-html", "pick a brick standard for the stud; no print has chosen one yet (D-087)");
  }
  if (p.part === "wire" && p.standard === "boss-v1") {
    refuse(p.standard, "blocks-html or unset", "the wire is ported on the blocks-html standard only (packages/archetypes/src/blocks/wire.ts); pick blocks-html");
  }
  // The wire is blocks-html whatever the field says; the stud is what the field says.
  const std = p.standard === "boss-v1" ? "boss-v1" : "blocks-html";
  if (Math.abs(machine.layerHeight - LAYER[std]) > 1e-9) {
    k.warn("LAYER", `the ${std} standard prints at ${LAYER[std]} mm layers, the machine preset at ${machine.layerHeight} mm; the export layer must equal the standard (D-087)`);
  }
  const frame = { originOnAxis: false, carriesOffset: false, pose: "print" } as const;
  const standard = { id: "blocks.standard", value: std, ...qualify([]), note: "the brick standard this part is built on (D-087)", gate: "informational", group: "readouts" } as const;

  if (p.part === "wire") {
    const out = k.arch(WIRE, up(0), {
      shape: p.shape, len: p.len, core: p.core, coreW: p.coreW, sheathW: p.sheathW,
      endA: p.endA, endB: p.endB, radius: p.radius, amp: p.amp, period: p.period, pitch: p.pitch,
    });
    return k.part({
      id: "wire", name: "BLOCKS WIRE", process: "fdm", machine: machine.id, frame,
      bodies: [...out.bodies], features: [...out.features], metrics: [...(out.metrics ?? []), standard], assertions: [],
    });
  }

  const out = k.arch(STUD, up(p.H), { standard: std, peg: p.peg, base: 0, net: "S" });
  const body = k.body("body", { role: "body", slot: 1, base: { route: "prism", outline: [k.ring.roundRect(PITCH, PITCH, CORNER)], z: [0, p.H] } });
  return k.part({
    id: "body", name: "BLOCKS STUD", process: "fdm", machine: machine.id, frame,
    bodies: [body, ...out.bodies], features: [...out.features], metrics: [...(out.metrics ?? []), standard], assertions: [],
  });
});
