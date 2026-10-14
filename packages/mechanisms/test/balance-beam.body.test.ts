// M06-T06, the originals rule for pin-free-balance-beam: the canonical
// original is STIPPLE R17b (lineage stipple.kin/r17b). Its body is the
// page's geomOf("link"), the DATA.parts.link ring extruded to DATA.P.T;
// reference/joints/balance-beam/expected/legacy.json holds that ring and
// the volume and bounding box of the mesh the page's own three.js builds,
// and link() at rest, half and full select for R17b and R17
// (test/legacy/record-balance-beam.mjs). The port's apply() and the
// reference build must regenerate all of it.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import type { ApplyIn, MechanismApplyOut, Vec2 } from "@hackbuild/spec";
import { BALANCE_BEAM_PARAMS, balanceBeamDerive, defaultsOf, mechanisms, type Values } from "@hackbuild/mechanisms";

interface Pose { zRow: number; zCol: number; thetaDeg: number; crown: number; rise: number }
interface Legacy {
  mechanism: string;
  source: { lineage: string; file: string; sha256: string };
  P: Record<string, number>;
  thicknessFlag: string;
  rings: { o: number[][]; h: number[][][] }[];
  body: { t: number; triangles: number; volume: number; bbox: { min: number[]; max: number[] } };
  poses: Pose[];
  r17: { lineage: string; sha256: string; sameLinkRings: boolean; T: number; STROKE: number; poses: Pose[] };
}
interface LineageRow { id: string; kind: string; source: string; sha256: string }

const root = new URL("../../../", import.meta.url);
const read = (p: string): string => readFileSync(new URL(p, root), "utf8");
const lineage = JSON.parse(read("lineage.json")) as LineageRow[];
const legacy = JSON.parse(read("reference/joints/balance-beam/expected/legacy.json")) as Legacy;
const build = JSON.parse(read("reference/joints/balance-beam/expected/build.json")) as { volumes: Record<string, number> };
const edit = JSON.parse(read("reference/joints/balance-beam/expected/edit.json")) as { pointer: string; from: number; to: number; expect: { changed: string[] } };
const profile = createProfileLookup(loadProfile());
const def = mechanisms.resolve("pin-free-balance-beam").def;
const TOL = 1e-6;

const place = (params: Values): MechanismApplyOut => def.apply!({
  draft: { id: "", name: "", process: "laser", machine: "sheet600", frame: { originOnAxis: false, carriesOffset: false, pose: "print" }, bodies: [], features: [] },
  face: { origin: [0, 0, 0], normal: [0, 0, 1], u: [1, 0, 0] }, params, profile,
} as ApplyIn<Values>);
const defaults = (): Values => (def.params["~standard"].validate({}) as { value: Values }).value;
const prism = (out: MechanismApplyOut) => out.bodies[0]!.base as { route: "prism"; outline: readonly (readonly Vec2[])[]; z: readonly [number, number] };

/** Largest vertex distance between two rings in either winding; Infinity when the counts differ. */
function ringGap(a: readonly (readonly number[])[], b: readonly (readonly number[])[]): number {
  if (a.length !== b.length) return Infinity;
  const worst = (x: readonly (readonly number[])[]): number => x.reduce((m, p, i) => Math.max(m, Math.abs(p[0]! - b[i]![0]!), Math.abs(p[1]! - b[i]![1]!)), 0);
  return Math.min(worst(a), worst([...a].reverse()));
}

/** Every difference between the port and a legacy record, as text. */
function regenerate(leg: Legacy): string[] {
  const bad: string[] = [];
  const out = place(defaults());
  const base = prism(out);
  if (out.bodies.length !== leg.rings.length) bad.push(`${out.bodies.length} bodies`);
  if (base.outline.length !== 1 + leg.rings[0]!.h.length) bad.push("ring count");
  if (ringGap(base.outline[0]!, leg.rings[0]!.o) > TOL) bad.push("outer ring");
  if (Math.abs(base.z[1] - base.z[0] - leg.body.t) > TOL) bad.push("thickness");
  const xs = base.outline[0]!.map((p) => p[0]);
  const ys = base.outline[0]!.map((p) => p[1]);
  const box = [Math.min(...xs), Math.min(...ys), base.z[0], Math.max(...xs), Math.max(...ys), base.z[1]];
  const want = [...leg.body.bbox.min, ...leg.body.bbox.max];
  // The page's bounding box is float32 (three.js BufferGeometry); 1e-6 mm covers its rounding of 7.6.
  if (box.some((v, i) => Math.abs(v - want[i]!) > TOL)) bad.push(`bbox ${JSON.stringify(box)}`);
  const P = leg.P;
  for (const pose of leg.poses) {
    const d = balanceBeamDerive({ ...defaultsOf(BALANCE_BEAM_PARAMS), zRow: pose.zRow, zCol: pose.zCol, stroke: P["STROKE"]!, crownR: P["CROWN_R"]!, crownTop: P["CROWN_TOP"]!, noseR: P["NOSE_R"]!, bossR: P["BOSS_R"]!, linkL: P["LINK_L"]!, rtFloor: P["RT_FLOOR"]!, ctFloor: P["CT_FLOOR"]! });
    if (Math.abs(d["crown"]!.value - pose.crown) > 1e-12) bad.push(`crown at ${pose.zRow},${pose.zCol}`);
    if (Math.abs(d["tilt"]!.value - pose.thetaDeg) > 1e-12) bad.push(`tilt at ${pose.zRow},${pose.zCol}`);
  }
  return bad;
}

describe("pin-free-balance-beam regenerates STIPPLE R17b's link", () => {
  test("typed, its canonical original pinned to the lineage row the record read", () => {
    expect(def.status).toBe("typed");
    expect(def.reference).toEqual(["joints/balance-beam"]);
    const o = def.original![0]!;
    expect(o.sha256).toBe(legacy.source.sha256);
    const row = lineage.find((r) => r.id === legacy.source.lineage)!;
    expect(row.kind).toBe("canonical");
    expect(row.sha256).toBe(o.sha256);
    expect(row.source.endsWith(`stipple/${o.file}`)).toBe(true);
  });

  test("the ring, thickness, bounding box and link() poses regenerate", () => {
    expect(legacy.thicknessFlag).toBe("T");
    expect(legacy.body.t).toBe(legacy.P["T"]);
    expect(regenerate(legacy)).toEqual([]);
  });

  test("the reference build's meshed volume is the page's mesh volume within 1e-3 mm3, 188 triangles each", () => {
    const got = build.volumes["pin-free-balance-beam.0.link"]!;
    expect(Math.abs(got - legacy.body.volume)).toBeLessThan(1e-3);
    expect(legacy.body.triangles).toBe(188);
  });

  test("printed precision: half select rise 2.500 mm and tilt 24.624 deg, the page's TILT_MAX", () => {
    const half = legacy.poses[1]!;
    const d = balanceBeamDerive(defaults());
    expect(d["halfSelectRise"]!.value.toFixed(3)).toBe(half.rise.toFixed(3));
    expect(d["tiltMax"]!.value.toFixed(3)).toBe("24.624");
    expect(Math.abs(d["tiltMax"]!.value - legacy.P["TILT_MAX"]!)).toBeLessThan(1e-6);
  });

  test("params round trip: the def's defaults are R17b's DATA.P, t included", () => {
    const d = defaults();
    const P = legacy.P;
    expect([d["stroke"], d["crownR"], d["crownTop"], d["noseR"], d["bossR"], d["linkL"], d["rtFloor"], d["ctFloor"], d["t"]]).toEqual(
      [P["STROKE"], P["CROWN_R"], P["CROWN_TOP"], P["NOSE_R"], P["BOSS_R"], P["LINK_L"], P["RT_FLOOR"], P["CT_FLOOR"], P["T"]]);
    expect(place(d).warnings).toEqual([]);
  });

  test("edit stroke 5.0 to 4.8 gives R17's link() numbers on R17's identical ring", () => {
    expect(legacy.r17.sameLinkRings).toBe(true);
    const d = balanceBeamDerive({ ...defaults(), stroke: legacy.r17.STROKE, zRow: legacy.r17.STROKE });
    const half = legacy.r17.poses[1]!;
    expect(Math.abs(d["halfSelectRise"]!.value - half.rise)).toBeLessThan(1e-12);
    expect(Math.abs(d["tiltMax"]!.value - half.thetaDeg)).toBeLessThan(1e-12);
    expect([d["halfSelectRise"]!.value.toFixed(3), d["tiltMax"]!.value.toFixed(3)]).toEqual(["2.400", "23.578"]);
  });

  test("edit t 1.5 to 1.6 moves only the link body, its depth by 0.1 mm", () => {
    expect([edit.pointer, edit.from, edit.to]).toEqual(["/t", 1.5, 1.6]);
    expect(edit.expect.changed).toEqual(["pin-free-balance-beam.0.link"]);
    const z = prism(place({ ...defaults(), t: edit.to })).z;
    expect(z[1] - z[0]).toBeCloseTo(1.6, 12);
  });

  test("a param the ring was drawn at warns that the body does not follow it", () => {
    const w = place({ ...defaults(), noseR: 2.5 }).warnings!;
    expect(w.map((x) => [x.code, x.param])).toEqual([["LINK_OUTLINE", "/noseR"]]);
  });

  test("a perturbed legacy value fails: one vertex by 2e-6 mm, one pose crown by 1e-9 mm", () => {
    const vertex: Legacy = { ...legacy, rings: [{ ...legacy.rings[0]!, o: legacy.rings[0]!.o.map((q, j) => (j === 7 ? [q[0]!, q[1]! + 2e-6] : q)) }] };
    expect(regenerate(vertex)).toContain("outer ring");
    const crown: Legacy = { ...legacy, poses: legacy.poses.map((p, i) => (i === 1 ? { ...p, crown: p.crown + 1e-9 } : p)) };
    expect(regenerate(crown).some((s) => s.startsWith("crown"))).toBe(true);
  });
});
