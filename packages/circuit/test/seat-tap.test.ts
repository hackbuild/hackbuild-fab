// K-04: a press-fit board seat is a read path terminal. A port with a seat
// tap (PortFeature.tap) ends its net's read path at the tapped conductor,
// so a net that never reaches the body outline still has a path from the
// board pin to the key contact. Each case is built through packages/mesh
// runStages and extracted from the built bodies, and the same draft runs
// through the build time 1D graph (path1d, solveKeys). Without the taps the
// same geometry has no terminal: the 1D path throws E_REF and extraction
// prices nothing.

import { describe, expect, test } from "vitest";
import type {
  ConductorFeature, ContactFeature, Feature, HookupDecl, MeshRef, PartDraft, PortFeature, PortTap, Ring, Vec2,
} from "@hackbuild/spec";
import { isThrownCommandError } from "@hackbuild/spec";
import { assemblePart, runStages, type MeshData } from "@hackbuild/mesh";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { mcuPinRow } from "@hackbuild/catalog";
import { extractNets, pressedPath, pressedPathOf, solveKeys, tapMismatch, type Extraction } from "../src/index";

const profile = createProfileLookup(loadProfile());
const Z0 = 0.72;
const FACE = (z: number) => ({ origin: [0, 0, z] as const, normal: [0, 0, 1] as const, u: [1, 0, 0] as const });
const rect = (x0: number, y0: number, x1: number, y1: number): Ring => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const circle = (r: number, c: Vec2, n = 24): Ring =>
  Array.from({ length: n }, (_, i): Vec2 => [c[0] + r * Math.cos((2 * Math.PI * (i + 0.5)) / n), c[1] + r * Math.sin((2 * Math.PI * (i + 0.5)) / n)]);

interface Disc { readonly id: string; readonly net: string; readonly at: Vec2; readonly r: number }
interface Line { readonly id: string; readonly net: string; readonly from: Vec2; readonly to: Vec2 }
// Discs stand past the traces at both faces, as PIP's posts and bumps run past a band, so no disc face lies inside a trace.
const W = 1.4, T = 0.72, EZ = 0.02, BUMP_T = T + 0.2;

// Two keys, a branched GND return and an ADC net, every net seated on a
// bump well inside the plate: no centreline end reaches the outline.
const discs: Disc[] = [
  { id: "c.bumpK1", net: "K1", at: [2, 4], r: 0.85 }, { id: "c.colK1", net: "K1", at: [20, 4], r: 1 },
  { id: "c.bumpK2", net: "K2", at: [2, 8], r: 0.85 }, { id: "c.colK2", net: "K2", at: [28, 8], r: 1 },
  { id: "c.bumpG", net: "GND", at: [2, 0], r: 0.85 }, { id: "c.colG1", net: "GND", at: [24, 0], r: 1 }, { id: "c.colG2", net: "GND", at: [30, 0], r: 1 },
  { id: "c.bumpW", net: "W", at: [2, -4], r: 0.85 }, { id: "c.postW", net: "W", at: [22, -4], r: 0.8 },
];
const lines: Line[] = [
  { id: "c.sigK1", net: "K1", from: [2, 4], to: [20, 4] },
  { id: "c.sigK2", net: "K2", from: [2, 8], to: [28, 8] },
  { id: "c.busA", net: "GND", from: [2, 0], to: [24, 0] },
  { id: "c.busB", net: "GND", from: [23, 0], to: [30, 0] },
  { id: "c.wA", net: "W", from: [2, -4], to: [12, -4] },
  { id: "c.wB", net: "W", from: [11, -4], to: [22, -4] },
];

const tapOf = (conductor: string, at: Vec2, pin: string): PortTap =>
  ({ conductor, at: [at[0], at[1], Z0 + BUMP_T], board: "rp2040-zero", mcu: "rp2040", pin, contact: "bump", pressMm: 0.3 });

function draftOf(taps: boolean): PartDraft {
  const port = (id: string, net: string, type: PortFeature["type"], tap: PortTap): PortFeature =>
    ({ kind: "port", id, net, type, interface: "digital", ...(taps ? { tap } : {}) });
  const contact = (id: string, a: string, b: string): ContactFeature => ({ kind: "contact", id, a, b, forceMinN: 1, maxOhm: 1e6 });
  const features: Feature[] = [
    ...discs.map((d): ConductorFeature => ({ kind: "conductor", id: d.id, material: "cpla", net: d.net, width: 2 * d.r, t: BUMP_T + EZ, region: { path: circle(d.r, d.at), face: FACE(Z0 - EZ) } })),
    ...lines.map((l): ConductorFeature => ({ kind: "conductor", id: l.id, material: "cpla", net: l.net, width: W, t: T, region: { centreline: [l.from, l.to], face: FACE(Z0) } })),
    contact("contact.key1", "c.colK1", "c.colG1"),
    contact("contact.key2", "c.colK2", "c.colG2"),
    port("port.K1", "K1", "signal", tapOf("c.bumpK1", [2, 4], "GP8")),
    port("port.K2", "K2", "signal", tapOf("c.bumpK2", [2, 8], "GP7")),
    port("port.GND", "GND", "gnd", tapOf("c.bumpG", [2, 0], "GND")),
    port("port.W", "W", "signal", tapOf("c.bumpW", [2, -4], "GP26")),
  ];
  return {
    id: "seat-tap", name: "seat tap", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: false, carriesOffset: true, pose: "print" },
    bodies: [
      { id: "plate", role: "body", slot: 1, material: "petg", base: { route: "prism", outline: [rect(-2, -8, 34, 12)], z: [0, 3] } },
      ...discs.map((d) => ({ id: d.id, role: "conductor" as const, slot: 2, material: "cpla", base: { route: "prism" as const, outline: [circle(d.r, d.at)], z: [Z0 - EZ, Z0 + BUMP_T] as const } })),
      ...lines.map((l) => ({
        id: l.id, role: "conductor" as const, slot: 2, material: "cpla",
        base: { route: "prism" as const, outline: [rect(l.from[0], l.from[1] - W / 2, l.to[0], l.to[1] + W / 2)], z: [Z0, Z0 + T] as const },
      })),
    ],
    features,
  };
}

async function extract(draft: PartDraft): Promise<Extraction> {
  const staged = await runStages({ draft, profile });
  const built = assemblePart(draft, staged);
  const byHash = new Map<string, MeshData>(staged.bodies.map((b, i) => [built.part.bodies[i]!.mesh.hash, b.mesh]));
  return extractNets({ part: built.part, profile, itemTransform: built.itemTransform, mesh: (ref: MeshRef) => byHash.get(ref.hash) });
}

const hook = (port: string, pin: string): HookupDecl =>
  ({ port, mcu: "rp2040", pin, read: { model: "charge-release", drive: "high", driveUs: 30, waitUs: 3500, waitSource: "default" } }) as HookupDecl;

describe("seat taps end read paths at the board pin (K-04)", () => {
  test("extraction: every net starts at its tap, with no lead on the outline", async () => {
    const ex = await extract(draftOf(true));
    expect(ex.warnings.map((w) => w.code)).toEqual([]);
    for (const t of ex.taps) expect(t.piece, t.terminal).not.toBeNull();
    const net = (id: string) => ex.nets.find((n) => n.id === id)!;
    expect(net("K1").resistance.map((r) => r.terminals)).toEqual([["port.K1", "contact.key1"]]);
    expect(net("K1").resistance[0]!.preview.segments.map((s) => s.direction)).toEqual(["through", "along", "through"]);
    // The tap is a press contact of cPLA on the board pin, unpriced until a coupon row exists.
    expect(net("K1").unpricedContacts).toEqual(["port.K1"]);
    // An ADC net with no contact runs to its farthest conductor, the terminal post.
    expect(net("W").resistance.map((r) => r.terminals)).toEqual([["port.W", "c.postW"]]);
    expect(net("W").resistance[0]!.preview.segments).toHaveLength(4);
    // The branched return prices one pair per contact.
    const g = net("GND").resistance;
    expect(g.map((r) => r.terminals)).toEqual([["port.GND", "contact.key1"], ["port.GND", "contact.key2"]]);
    expect(g[1]!.preview.ohm).toBeGreaterThan(g[0]!.preview.ohm);
  });

  test("a press on the second key prices its own return pair", async () => {
    const ex = await extract(draftOf(true));
    const draft = draftOf(true);
    const port = draft.features.find((f) => f.id === "port.K2") as PortFeature;
    const got = pressedPathOf(draft, ex.nets, port);
    if (!("path" in got)) throw new Error(got.reason);
    expect(got.warning).toBeUndefined();
    const k2 = ex.nets.find((n) => n.id === "K2")!, gnd = ex.nets.find((n) => n.id === "GND")!;
    expect(got.path.pathOhm).toBeCloseTo(k2.totalOhm[1] + gnd.resistance[1]!.preview.ohm, 6);
  });

  test("without the taps the same geometry has no terminal to tap", async () => {
    const ex = await extract(draftOf(false));
    expect(ex.taps.map((t) => t.at)).toEqual([null, null, null, null]);
    expect(ex.warnings.filter((w) => w.code === "TAP_NO_LEAD").map((w) => w.text.split(":")[0])).toEqual(["port.K1", "port.K2", "port.GND", "port.W"]);
  });

  test("build time 1D path: tap to contact to tap; E_REF without the taps", () => {
    const p = pressedPath(draftOf(true), "port.K1", profile);
    expect(p.terminals).toEqual(["port.K1", "port.GND"]);
    expect(p.legs.map((l) => l.conductor)).toEqual(["c.bumpK1", "c.sigK1", "c.colK1", "c.colG1", "c.busA", "c.bumpG"]);
    expect(p.taps.map((t) => t?.pin)).toEqual(["GP8", "GND"]);
    let err: unknown;
    try {
      pressedPath(draftOf(false), "port.K1", profile);
    } catch (e) {
      err = e;
    }
    expect(isThrownCommandError(err) && err.hbf.code).toBe("E_REF");
  });

  test("the hookup must read the pin the seat lands on the net", () => {
    const draft = draftOf(true);
    expect(tapMismatch(draft.features, "K1", { mcu: "rp2040", pin: "GP8" })).toBeNull();
    expect(tapMismatch(draft.features, "K1", { mcu: "rp2040", pin: "GP7" })).toMatch(/lands on rp2040-zero pin GP8/);
    expect(tapMismatch(draft.features, "K1", { mcu: "esp32c3", pin: "GP8" })).toMatch(/carries rp2040/);
    const ok = solveKeys({ part: draft, hookup: [hook("port.K1", "GP8")], profile, mcu: (id) => mcuPinRow(id) });
    expect(ok.points.map((p) => p.pin)).toEqual(["GP8"]);
    // A press contact at each seated end, never a clip.
    expect(ok.points[0]!.contacts.map((c) => c.kind)).toEqual(["press", "press", "press", "press"]);
    const bad = solveKeys({ part: draft, hookup: [hook("port.K1", "GP7")], profile, mcu: (id) => mcuPinRow(id) });
    expect(bad.points).toEqual([]);
    expect(bad.warnings.map((w) => w.code)).toEqual(["HOOKUP_TAP"]);
  });
});
