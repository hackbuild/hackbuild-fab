// The nets part.build hands CHK-NET-29 carry the node capacitance
// circuit.solve's chargePort uses: pin inputCap plus the along legs of the
// read path at the profile trace rule (PIP model.js:418). Before, the build
// path used the pin's 7 pF alone, so one check id gave two ceilings for one
// net (finding D-04). The expected C is summed here from the path legs and
// the profile rows, never from the code under test.

import { describe, expect, test } from "vitest";
import type { Author, FitClassId, HookupDecl, MachineView, McuPinSpec, PartDraft, Ring, Vec2 } from "@hackbuild/spec";
import { createProfileLookup, layerIndex, layerTop, loadProfile, snapLayer } from "@hackbuild/profile";
import { mcuPinRow } from "@hackbuild/catalog";
import { traceCapRule } from "@hackbuild/circuit";
import { build, chase, type FlexPairParams } from "../../../spec/fixtures/keys-flex-pair";
import { skeletonNets } from "../src/index";

const tables = loadProfile();

const circle = (r: number, at: Vec2 = [0, 0], segments = 64): Ring =>
  Array.from({ length: segments }, (_, i) => [at[0] + r * Math.cos((2 * Math.PI * i) / segments), at[1] + r * Math.sin((2 * Math.PI * i) / segments)] as const);

const roundRect = (w: number, h: number, r: number, at: Vec2 = [0, 0]): Ring => {
  const corners: readonly Vec2[] = [[w / 2 - r, -h / 2 + r], [w / 2 - r, h / 2 - r], [-w / 2 + r, h / 2 - r], [-w / 2 + r, -h / 2 + r]];
  const out: Vec2[] = [];
  corners.forEach(([cx, cy], c) => {
    for (let i = 0; i <= 8; i += 1) {
      const a = ((c - 1 + i / 8) * Math.PI) / 2;
      out.push([at[0] + cx + r * Math.cos(a), at[1] + cy + r * Math.sin(a)]);
    }
  });
  return out;
};

function testAuthor(): Author {
  const profile = createProfileLookup(tables);
  const p = profile.preset("ffc5p");
  const machine: MachineView = {
    id: "ffc5p", layerHeight: p.layer, firstLayer: p.firstLayer, lineWidth: p.lineWidth,
    layer: (z) => snapLayer(p, z), layerTop: (i) => layerTop(p, i), layerIndex: (z) => layerIndex(p, z), line: (n) => n * p.lineWidth,
  };
  const unused = (name: string) => () => { throw new Error(`${name} is outside the M-S slice`); };
  return {
    profile, machine: () => machine,
    ring: { roundRect, circle, offset: unused("ring.offset") },
    body: (id, o) => ({ id, role: o.role, slot: o.slot, base: o.base, material: o.material ?? chase.materials.find((m) => m.slot === o.slot)?.material ?? "" }),
    part: (o) => ({ ...o, frame: { originOnAxis: false, carriesOffset: false, pose: "print", ...o.frame } }) as ReturnType<Author["part"]>,
    fit: (id) => id as FitClassId, derive: (_id, value) => value, bind: (f) => f, warn: () => undefined,
    face: (id, frame) => ({ id, frame }), applied: () => [], arch: unused("arch"), mech: unused("mech"),
  };
}

describe("skeleton net capacitance is the circuit.solve trace rule", () => {
  test("each read net's capToGndPf is pin inputCap plus along legs at the profile pF per mm plus the fixed pF", async () => {
    const row = chase.presets[0]!;
    const params: FlexPairParams = { W: 60, H: 30, r: 4, keys: row.params.keys.map((k) => ({ ...k })), w: 1.4, pads: "clip" };
    const part = (await build(params, testAuthor())) as PartDraft;
    const mcu = (m: string): McuPinSpec => mcuPinRow(m);
    const profile = createProfileLookup(tables);
    const { nets } = skeletonNets(part, chase.hookup as readonly HookupDecl[], profile, mcu);
    const rule = traceCapRule(createProfileLookup(tables));
    const read = nets.filter((n) => n.resistance.length > 0);
    expect(read.length).toBeGreaterThan(0);
    for (const n of read) {
      const hookup = (chase.hookup as readonly HookupDecl[]).find((h) => n.terminals.includes(h.port))!;
      const pinPf = mcuPinRow(hookup.mcu).inputCap.value;
      const alongMm = n.resistance[0]!.preview.segments.filter((s) => s.direction === "along").reduce((a, s) => a + s.lengthMm, 0);
      expect(alongMm).toBeGreaterThan(0);
      expect(n.capToGndPf).toBeCloseTo(pinPf + alongMm * rule.perMmPf.value + rule.fixedPf.value, 9);
      expect(n.capToGndPf).toBeGreaterThan(pinPf);
    }
  });
});
