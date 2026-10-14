// reference/sensors/rotary-pot/build.ts
// One printed rotary pot from the archetype (Author.arch) on the top face of
// a PLA plate one TANG face thick, the face underside printed up. The rotor
// stands on the bed beside the plate, 6 mm clear of it (the original's plate
// margin, 05_design.js line 184). Clip pads sit at the archetype's stub
// and wiper ends, where the host's buses would meet them.
// Conditionals live here (D-178).

import { defineBuild, type FaceFrame, type Feature, type Vec2 } from "@hackbuild/spec";
import { chase } from "./chase";

const ID = "printed-rotary-pot";
const up = (z: number): FaceFrame => ({ origin: [0, 0, z], normal: [0, 0, 1], u: [1, 0, 0] });

export const build = defineBuild(chase, (p, k) => {
  const layer = k.profile.machine("ffc5p").presets[0]?.layer ?? 0;
  const t = 13 * layer;
  const tipR = 12.5;
  const out = k.arch(ID, up(t), { rotorAt: [p.W / 2 + 6 + tipR, 0] });
  const at = (id: string): Vec2 => {
    const m = out.metrics?.find((x) => x.id === `${ID}.0.pot.terminal.${id}`)?.value;
    const [u, v] = String(m).split(" ").map(Number);
    return [u ?? 0, v ?? 0];
  };
  const net = (id: string): string => {
    const f = out.features.find((x) => x.id === `${ID}.0.port.${id}`);
    return f !== undefined && f.kind === "port" ? f.net : "";
  };
  const v33 = at("v33"), gnd = at("gnd"), wiper = at("wiper");
  const plate = k.body("plate", { role: "body", slot: 1, base: { route: "prism", outline: [[[-p.W / 2, -p.H / 2], [p.W / 2, -p.H / 2], [p.W / 2, p.H / 2], [-p.W / 2, p.H / 2]]], z: [0, t] } });
  // Clip pads at the archetype's three ends: where the original's 3V3 and GND buses meet the
  // stubs (04_design.js lines 208 to 211) and the wiper lead's end (line 226). No lead is drawn
  // over a stub: a lead crossing a stub's square end at its angle leaves slivers the stage 8
  // union refuses (finding, M06-T09 build notes).
  const pad = (id: string, n: string, at: Vec2): Feature => (
    { kind: "pad", id: `pad.${id}`, body: "plate", net: n, size: [1, 1], for: "clip", note: `clip pad at the ${id} end, u ${at[0].toFixed(3)} v ${at[1].toFixed(3)} mm (computed)` }
  );
  return k.part({
    id: "plate", name: "ROTARY POT", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: false, carriesOffset: false, pose: "print" },
    bodies: [plate, ...out.bodies],
    features: [
      ...out.features,
      pad("v33", net("v33"), v33), pad("gnd", net("gnd"), gnd), pad("wiper", net("wiper"), wiper),
    ],
    metrics: out.metrics ?? [],
    assertions: [{ type: "apart", nets: [net("v33"), net("gnd"), net("wiper")] }],
  });
});
