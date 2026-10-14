// reference/buttons/flex-cone/build.ts
// One flex cone key from the archetype (Author.arch) on a PETG body with
// the PIP buried stack. The archetype sits on the stack floor face and
// reports the body top it needs (metric host.top); the body rises to it.
// Two leads run on trace layer 1 from the key's routed terminals to the
// body's edges, each ending at a clip pad: the key net to the near edge,
// the common net to the far one. Conditionals live here (D-178).

import { defineBuild, type FaceFrame, type Feature, type Vec2 } from "@hackbuild/spec";
import { chase } from "./chase";

const ID = "flex-cone-key";
const up = (z: number): FaceFrame => ({ origin: [0, 0, z], normal: [0, 0, 1], u: [1, 0, 0] });

export const build = defineBuild(chase, (p, k) => {
  const c = (id: string): number => k.profile.constant(id).value;
  const skin = c("stack.skin"), trace = c("stack.trace"), iso = c("stack.iso"), overL2 = c("stack.overL2"), w = c("stack.traceWidth");
  const floor = skin + trace + iso + trace + overL2;
  const out = k.arch(ID, { origin: [0, 0, floor], normal: [0, 0, 1], u: [1, 0, 0] }, {});
  const top = out.metrics?.find((m) => m.id === `${ID}.0.host.top`)?.value;
  if (typeof top !== "number") throw new Error("flex-cone-key reported no host.top");
  const body = k.body("body", { role: "body", slot: 1, base: { route: "prism", outline: [k.ring.roundRect(p.W, p.H, p.r)], z: [0, top] } });

  const post = (tag: string): Vec2 => {
    const f = out.features.find((x) => x.id === `${ID}.0.conductor.post${tag}`);
    const ring = f !== undefined && f.kind === "conductor" && "path" in f.region ? f.region.path : [];
    const xs = ring.map((q) => q[0]), ys = ring.map((q) => q[1]);
    return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
  };
  const key = post(""), common = post("Common");
  const net = (tag: string): string => {
    const f = out.features.find((x) => x.id === `${ID}.0.conductor.post${tag}`);
    return f !== undefined && f.kind === "conductor" ? f.net : "";
  };
  const leads: Feature[] = [
    { kind: "conductor", id: "conductor.lead", body: "body", material: "cpla", net: net(""), region: { centreline: [key, [key[0], -p.H / 2]], face: up(skin) }, width: w, t: trace },
    { kind: "conductor", id: "conductor.leadCommon", body: "body", material: "cpla", net: net("Common"), region: { centreline: [common, [common[0], p.H / 2]], face: up(skin) }, width: w, t: trace },
    { kind: "pad", id: "pad.key", body: "body", net: net(""), size: [3, 3], for: "clip", note: `clip pad where the key lead meets the near edge at x ${key[0].toFixed(3)} mm (computed)` },
    { kind: "pad", id: "pad.common", body: "body", net: net("Common"), size: [3, 3], for: "clip", note: `clip pad where the common lead meets the far edge at x ${common[0].toFixed(3)} mm (computed)` },
  ];
  return k.part({
    id: "body", name: "FLEX CONE", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: false, carriesOffset: false, pose: "print" },
    bodies: [body, ...out.bodies],
    features: [...out.features, ...leads],
    metrics: out.metrics ?? [],
    assertions: [{ type: "apart", nets: [net(""), net("Common")] }],
  });
});
