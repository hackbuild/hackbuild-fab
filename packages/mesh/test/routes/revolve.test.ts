// M00-T05 step 5 and step 8 revolve parity: every revolve(rows, thetas)
// call TENON sweep.js makes over its 63 states, recorded by
// tools/legacy/tenon-revolve-dump.mjs in
// tools/corpus/mesh/tenon-revolve-calls.jsonl, replayed through the route.
// The fields are rebuilt from their recorded ids and params through the
// route's field registry, the column angles from thetaList(n, edges).
// TENON stored positions as float32, so the replay rounds the route's
// float64 positions the same way before the volume comparison (1e-9
// relative, computed). Every call then passes the mesh audit after the
// D-054 snap and weld the route emits, and every profile passes the four
// sweep.js profile checks.
//
// The whole dump is 448 calls and 53,315,256 triangles (counted from the
// dump); its replay passed 600 s at load 124 (measured, M-S exit A
// verifier round 1) and took 1239 s wall under vitest at load 14 to 16 on
// the owner's Apple M1, 8 cores, 16 GB (measured 2026-10-07), so
// `npm test` replays a bounded selection: the smallest call of each of the
// 63 states, the smallest call of each field id not yet covered, and call
// 276, the one call whose snap needs the weld (304 triangles dropped,
// computed). `npm run revolve:full -w packages/mesh` (HBF_REVOLVE_FULL=1)
// replays every call.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  audit, checkProfile, profileReport, RADIAL_FIELDS, radialField, revolveRows, revolveShape, signedVolume, snap, snapWeld, thetaList,
  type RadialField, type RevolveRow,
} from "../../src/index.js";

interface Call {
  readonly call: number;
  readonly case: number;
  readonly volume: number;
  readonly audit: { readonly degen: number; readonly bad: number };
  readonly profile: { readonly area: number; readonly cross: number; readonly neg: number; readonly back: number };
  readonly triangles: number;
  readonly vertices: number;
  readonly thetaN: number;
  readonly thetaEdges: number[];
  readonly thetaCount: number;
  readonly thetaSha256: string;
  readonly fields: { readonly id: string; readonly params: Record<string, number> }[];
  readonly rows: [number, number, number][];
}
interface Header {
  readonly header: true;
  readonly cases: number;
  readonly calls: number;
  readonly sweepSummary: string;
}

const lines = readFileSync(new URL("../../../../tools/corpus/mesh/tenon-revolve-calls.jsonl", import.meta.url), "utf8").trim().split("\n");
const header = JSON.parse(lines[0]!) as Header;
const calls = lines.slice(1).map((l) => JSON.parse(l) as Call);

/** Triangles the default replay may audit (computed budget; the 67-call selection ran in 12.7 s wall at load 26 on the owner's Apple M1, measured). */
const DEFAULT_TRIANGLE_BUDGET = 3_000_000;
/** The call whose D-054 snap puts two columns on one grid point (hash.ts snapWeld). */
const WELD_CALL = 276;
const FULL = process.env.HBF_REVOLVE_FULL === "1";

/** The bounded default selection, in dump order: one call per state, one per uncovered field id, and the weld call. */
function defaultSelection(all: readonly Call[]): Call[] {
  const smallest = (cs: readonly Call[]): Call => cs.reduce((a, b) => (b.triangles < a.triangles ? b : a));
  const picked = new Set<Call>();
  const cases = [...new Set(all.map((c) => c.case))];
  for (const k of cases) picked.add(smallest(all.filter((c) => c.case === k)));
  const fieldIds = [...new Set(all.flatMap((c) => c.fields.map((f) => f.id)))];
  for (const id of fieldIds) {
    if ([...picked].some((c) => c.fields.some((f) => f.id === id))) continue;
    picked.add(smallest(all.filter((c) => c.fields.some((f) => f.id === id))));
  }
  const weld = all.find((c) => c.call === WELD_CALL);
  if (weld !== undefined) picked.add(weld);
  return all.filter((c) => picked.has(c));
}
const replayed = FULL ? calls : defaultSelection(calls);

function replayRows(c: Call): RevolveRow[] {
  const made: RadialField[] = c.fields.map((f) => radialField(f.id).make(f.params));
  return c.rows.map(([r, z, k]) => ({ r, z, f: k < 0 ? null : made[k]! }));
}

describe("revolve route against TENON sweep.js", () => {
  it("replays the whole recorded sweep: 63 states, every call", () => {
    expect(header.cases).toBe(63);
    expect(calls.length).toBe(header.calls);
    expect(header.sweepSummary.startsWith("cases 63 fails 0")).toBe(true);
    console.log(`tenon revolve calls ${calls.length} over ${header.cases} states (counted from the dump)`);
  });

  it("the default replay covers every state, every field id and the weld call inside the triangle budget", () => {
    const sel = defaultSelection(calls);
    expect(new Set(sel.map((c) => c.case)).size).toBe(header.cases);
    expect(new Set(sel.flatMap((c) => c.fields.map((f) => f.id)))).toEqual(new Set(calls.flatMap((c) => c.fields.map((f) => f.id))));
    expect(sel.some((c) => c.call === WELD_CALL)).toBe(true);
    const tris = sel.reduce((n, c) => n + c.triangles, 0);
    console.log(`default revolve replay ${sel.length} of ${calls.length} calls, ${tris} triangles (computed); full replay ${FULL}`);
    expect(tris).toBeLessThanOrEqual(DEFAULT_TRIANGLE_BUDGET);
  });

  it("the weld call drops 304 zero-area triangles under the D-054 snap", () => {
    const c = calls.find((x) => x.call === WELD_CALL)!;
    expect(c.case).toBe(38);
    const mesh = revolveRows(replayRows(c), thetaList(c.thetaN, c.thetaEdges));
    expect((mesh.triangles.length - snapWeld(mesh).triangles.length) / 3).toBe(304);
  });

  it("registers every field the sweep used", () => {
    const used = new Set(calls.flatMap((c) => c.fields.map((f) => f.id)));
    for (const id of used) expect(RADIAL_FIELDS.has(id)).toBe(true);
  });

  it("reproduces each replayed call: thetas equal, volume within 1e-9 relative, audit clean, profile checks pass", () => {
    let failures = 0;
    let worst = 0;
    for (const c of replayed) {
      const thetas = thetaList(c.thetaN, c.thetaEdges);
      const thetaSha = createHash("sha256").update(new Uint8Array(Float64Array.from(thetas).buffer)).digest("hex");
      const rows = replayRows(c);
      const mesh = revolveRows(rows, thetas);
      const f32 = { positions: mesh.positions.map((v) => Math.fround(v)), triangles: mesh.triangles };
      const rel = Math.abs(signedVolume(f32) - c.volume) / Math.abs(c.volume);
      worst = Math.max(worst, rel);
      const a = audit(snapWeld(mesh));
      const p = profileReport(rows);
      const ok =
        thetas.length === c.thetaCount && thetaSha === c.thetaSha256 &&
        mesh.triangles.length / 3 === c.triangles && mesh.positions.length / 3 === c.vertices &&
        rel <= 1e-9 && a.ok && c.audit.bad === 0 && c.audit.degen === 0 &&
        p.cross === c.profile.cross && p.neg === c.profile.neg && p.back === c.profile.back && Math.abs(p.area - c.profile.area) <= 1e-9 * Math.abs(c.profile.area);
      if (!ok) {
        failures++;
        console.log(`call ${c.call} case ${c.case}: thetas ${thetas.length}/${c.thetaCount} ${thetaSha === c.thetaSha256}, rel ${rel}, audit ${JSON.stringify(a)}, profile ${JSON.stringify(p)} vs ${JSON.stringify(c.profile)}`);
      }
      checkProfile(rows);
    }
    console.log(`revolve calls replayed ${replayed.length} of ${calls.length}, failures ${failures}, worst volume relative ${worst.toExponential(2)} (computed)`);
    expect(failures).toBe(0);
  }, FULL ? 1_800_000 : 60_000);
});

describe("revolve shape declaration", () => {
  it("revolves a tube with an external thread field, snapped and manifold", () => {
    const mesh = revolveShape({
      route: "revolve",
      profile: [[4, 0], [6, 0], [6, 10], [4, 10]],
      segments: 64,
      field: { id: "tenon.thread.external", params: { z0: 1, z1: 9, pitch: 2, starts: 1, depth: 0.6, chamferHi: 1 } },
    });
    expect(audit(mesh).ok).toBe(true);
    for (const v of mesh.positions) expect(snap(v)).toBe(v);
  });

  it("places the revolve on a declared axis", () => {
    const m = revolveShape({ route: "revolve", profile: [[0, 0], [2, 0], [2, 4], [0, 4]], segments: 32, axis: { origin: [10, 0, 1], dir: [1, 0, 0] } });
    let minX = Infinity;
    let maxX = -Infinity;
    for (let i = 0; i < m.positions.length; i += 3) {
      minX = Math.min(minX, m.positions[i]!);
      maxX = Math.max(maxX, m.positions[i]!);
    }
    expect([minX, maxX]).toEqual([10, 14]);
    expect(audit(m).ok).toBe(true);
  });

  it("refuses a self-intersecting profile with E_SCHEMA", () => {
    let code = "";
    try {
      revolveShape({ route: "revolve", profile: [[1, 0], [3, 2], [3, 0], [1, 2]] });
    } catch (e) {
      code = (e as { hbf?: { code: string } }).hbf?.code ?? "";
    }
    expect(code).toBe("E_SCHEMA");
  });

  it("refuses an unknown field with E_REF", () => {
    let code = "";
    try {
      revolveShape({ route: "revolve", profile: [[1, 0], [3, 0], [3, 2], [1, 2]], field: { id: "knurl", params: {} } });
    } catch (e) {
      code = (e as { hbf?: { code: string } }).hbf?.code ?? "";
    }
    expect(code).toBe("E_REF");
  });

  it("puts a column pair 0.04 deg apart at each feature edge", () => {
    const t = thetaList(8, [Math.PI / 3]);
    const near = t.filter((a) => Math.abs(a - Math.PI / 3) < 0.001);
    expect(near.length).toBe(2);
    expect(near[1]! - near[0]!).toBeCloseTo((0.04 * Math.PI) / 180, 12);
  });
});
