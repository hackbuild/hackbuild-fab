// M06-T09 originals rule for the COFFER entries (coffer-port, hex-key,
// resolver-dial): the port regenerates the original's numbers and outline
// point sets, read against test/legacy/coffer.json, which
// scripts/coffer-legacy.py records by running originals/coffer/files in
// place (never values this run writes). Outlines compare by the point set
// Hausdorff distance, legal 1e-6 mm.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { Vec2 } from "@hackbuild/spec";
import {
  COFFER_PORT_DEFAULTS, HEX_KEY_DEFAULTS, RESOLVER_DIAL_DEFAULTS,
  cofferApo, cofferGndRing, cofferGndTabs, cofferHausdorff, cofferHexlet, cofferNeighbourOffset, cofferOutline, cofferPortDerive, cofferPortPads, cofferUv,
  dialBand, dialBandRadii, dialBandWidth, dialDecodeAngle, hexKeyCentres, hexKeyDerive, resolverDialDerive,
} from "@hackbuild/archetypes";

type Rings = Vec2[][];
interface Legacy {
  P: Record<string, unknown>;
  portEdge: number;
  apothem: number;
  outline: { width: number; height: number; rings: Rings; tapeGate: boolean };
  seam: { pad: number; tab: number };
  neighbourOffset: Vec2[];
  edges: { e: number; pads: { u: number; xy: Vec2; rings: Rings }[]; tabs: { u: number; rings: Rings }[]; tabsSkipCentre: number }[];
  ring: { port: { rings: Rings }[]; m1: { rings: Rings }[] };
  tiles: Record<string, { gates: { ok: boolean; label: string; detail: string }[]; fail: number; usability: { net: string; area: number; inscribed: number }[]; portOrder: string[] }>;
  d1Bands: { net: string; raw: Rings; rStart: [number, number] }[];
  d1Widths: { a: number; w: number[] };
  k6Keys: { net: string; c: Vec2; area: number; rings: Rings }[];
}
const L = JSON.parse(readFileSync(new URL("legacy/coffer.json", import.meta.url), "utf8")) as Legacy;
const TOL = 1e-6;
const P = COFFER_PORT_DEFAULTS;

describe("coffer-port: the six-edge port standard", () => {
  test("params equal the interlock dict P (hexcore.py lines 22 to 43)", () => {
    const want = L.P as Record<string, number | number[]>;
    const pairs: [keyof typeof P, string][] = [["s", "s"], ["cornerR", "corner_r"], ["tapeW", "tape_w"], ["ringOut", "ring_out"], ["ringIn", "ring_in"], ["tabU", "tab_u"], ["tabLen", "tab_len"], ["tabV", "tab_v"], ["padU", "pad_u"], ["padW", "pad_w"], ["padH", "pad_h"], ["padV", "pad_v"], ["winU", "win_u"]];
    for (const [ours, theirs] of pairs) expect(P[ours], ours).toEqual(want[theirs]);
    expect(P.windows).toEqual([L.portEdge]);
  });

  test("apothem, outline bounds, tape gate and seam gaps", () => {
    const d = cofferPortDerive(P);
    expect(Math.abs(cofferApo(P.s) - L.apothem)).toBeLessThan(1e-12);
    expect(Math.abs(d["width"]!.value - L.outline.width)).toBeLessThan(TOL);
    expect(Math.abs(d["height"]!.value - L.outline.height)).toBeLessThan(TOL);
    expect(d["tapeMargin"]!.value >= 0).toBe(L.outline.tapeGate);
    expect(d["padSeamGap"]!.value).toBeCloseTo(L.seam.pad, 12);
    expect(d["tabSeamGap"]!.value).toBeCloseTo(L.seam.tab, 12);
    L.neighbourOffset.forEach((o, e) => {
      const ours = cofferNeighbourOffset(P, e);
      expect(Math.hypot(ours[0] - o[0], ours[1] - o[1]), `edge ${e}`).toBeLessThan(1e-9);
    });
  });

  test("outline point set within 1e-6 mm (hexagon, quad_segs 24)", () => {
    expect(cofferHausdorff(cofferOutline(P), L.outline.rings[0]!)).toBeLessThan(TOL);
  });

  test("every edge's six pad centres sit at uv(e, u, padV) and their outlines match within 1e-6 mm", () => {
    for (const edge of L.edges) {
      const pads = cofferPortPads(P, edge.e, ["a", "b", "c", "d", "e", "f"]);
      expect(pads.length).toBe(6);
      pads.forEach((p, i) => {
        const want = edge.pads[i]!;
        expect(p.u).toBe(want.u);
        const c = cofferUv(P, edge.e, p.u, P.padV);
        expect(Math.hypot(c[0] - want.xy[0], c[1] - want.xy[1]), `edge ${edge.e} pad ${i} slot`).toBeLessThan(1e-6);
        expect(cofferHausdorff(p.ring, want.rings[0]!), `edge ${edge.e} pad ${i}`).toBeLessThan(TOL);
      });
    }
  });

  test("ground tabs: flat-capped, three per edge, two where the centre is skipped, outlines within 1e-6 mm", () => {
    for (const edge of L.edges) {
      const tabs = cofferGndTabs(P, edge.e, false);
      expect(tabs.length).toBe(edge.tabs.length);
      tabs.forEach((t, i) => expect(cofferHausdorff(t.ring, edge.tabs[i]!.rings[0]!), `edge ${edge.e} tab ${i}`).toBeLessThan(TOL));
      expect(cofferGndTabs(P, edge.e, true).length).toBe(edge.tabsSkipCentre);
    }
  });

  test("ground ring with one window (port edge) and with two (M1, edges 2 and 5), each piece within 1e-6 mm", () => {
    for (const [windows, want] of [[[L.portEdge], L.ring.port], [[2, 5], L.ring.m1]] as const) {
      const ours = cofferGndRing(P, windows);
      expect(ours.length, `windows ${windows.join(",")}`).toBe(want.length);
      for (const w of want) {
        expect(w.rings.length, "a ring piece has no hole").toBe(1);
        const best = Math.min(...ours.map((o) => cofferHausdorff(o, w.rings[0]!)));
        expect(best, `windows ${windows.join(",")}`).toBeLessThan(TOL);
      }
    }
  });

  test("the original's port gates pass on every tile at defaults (gen_coffer.py gates)", () => {
    for (const [k, t] of Object.entries(L.tiles)) {
      expect(t.fail, k).toBe(0);
      for (const g of t.gates.filter((x) => /port slot|seam gap|fits 4 inch tape|gnd tabs edge/.test(x.label))) expect(g.ok, `${k} ${g.label}`).toBe(true);
    }
  });
});

describe("hex-key: the K6 hexlets", () => {
  test("centres, across flats 18.53 and every key outline within 1e-6 mm (hexlet, quad_segs 20)", () => {
    const K = HEX_KEY_DEFAULTS;
    const cs = hexKeyCentres(K);
    expect(hexKeyDerive(K)["acrossFlats"]!.value.toFixed(2)).toBe("18.53");
    cs.forEach((c, i) => {
      const want = L.k6Keys[i]!;
      expect(c.net).toBe(want.net);
      expect(Math.hypot(c.c[0] - want.c[0], c.c[1] - want.c[1])).toBeLessThan(1e-9);
      expect(cofferHausdorff(cofferHexlet(c.c, K.s, K.r, K.flat), want.rings[0]!), want.net).toBeLessThan(TOL);
    });
  });

  test("the original's K6 gates and finger-scale rows: narrowest key 18.37 mm, smallest 298.5 mm2, clearance 1.024 mm K1 to K2", () => {
    const t = L.tiles["K6"]!;
    expect(t.portOrder).toEqual(["K4", "K3", "K5", "K6", "K2", "K1"]);
    expect(Math.min(...t.usability.map((u) => u.area)).toFixed(1)).toBe("298.5");
    expect(Math.min(...t.usability.map((u) => u.inscribed)).toFixed(2)).toBe("18.37");
    expect(t.gates.find((g) => g.label === "min net clearance")?.detail).toBe("1.024 mm (min 1.00)  K1|K2");
  });
});

describe("resolver-dial: the D1 four-phase bands", () => {
  const D = RESOLVER_DIAL_DEFAULTS;
  test("each raw band (polar_band, 300 steps) within 1e-6 mm of the original before its 0.3 mm smoothing", () => {
    L.d1Bands.forEach((b, k) => {
      expect(cofferHausdorff(dialBand(D, k), b.raw[0]!), b.net).toBeLessThan(TOL);
      const [r0, r1] = dialBandRadii(D, D.a0, k);
      expect(Math.abs(r0 - b.rStart[0]) + Math.abs(r1 - b.rStart[1])).toBeLessThan(1e-12);
    });
  });

  test("band widths at 131.2 deg 4.14, 6.79, 6.61, 3.96 mm decode back to 131.2 deg; sweep 305, blind 55", () => {
    const w = [0, 1, 2, 3].map((k) => dialBandWidth(D, L.d1Widths.a, k)) as [number, number, number, number];
    w.forEach((x, k) => expect(Math.abs(x - L.d1Widths.w[k]!)).toBeLessThan(1e-12));
    expect(w.map((x) => x.toFixed(2))).toEqual(["4.14", "6.79", "6.61", "3.96"]);
    expect(dialDecodeAngle(w).toFixed(1)).toBe("131.2");
    const d = resolverDialDerive(D);
    expect(d["sweep"]!.value).toBe(305);
    expect(d["blind"]!.value).toBe(55);
  });

  test("the original's D1 rows: clearance 1.040 mm D2 to D3, narrowest 6.16 mm (D2), smallest 169.2 mm2 (the crescents)", () => {
    const t = L.tiles["D1"]!;
    expect(t.portOrder).toEqual(["L1", "D1", "D2", "D3", "D4", "L2"]);
    expect(t.gates.find((g) => g.label === "min net clearance")?.detail).toBe("1.040 mm (min 1.00)  D2|D3");
    expect(Math.min(...t.usability.map((u) => u.inscribed)).toFixed(2)).toBe("6.16");
    expect(Math.min(...t.usability.map((u) => u.area)).toFixed(1)).toBe("169.2");
  });
});
