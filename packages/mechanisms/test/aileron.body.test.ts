// aileron-differential bodies (M06-T06 step 5, the originals rule): the
// record test/legacy/stanchion-bodies.json is cad.py lines 217 to 282 run
// through its own build_printed() (record-stanchion-bodies.py). This test
// holds the record to the original's shipped exports, read here as binary
// STL with no help from the recorder, and holds the entry candidate while
// the kernel has no route for the pushrod's icosphere ball ends and every
// route snaps to the 1/1024 mm grid cad.py does not sit on.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { mechanisms } from "@hackbuild/mechanisms";
import { originalPath } from "../../../tools/test-support/originals-root.js";

const orig = (rel: string): string => originalPath(`stanchion/${rel}`);
const root = new URL("../../../", import.meta.url);

interface Summary { volume: number; bboxMin: number[]; bboxMax: number[]; faces: number; watertight: boolean }
interface BodyRow { built: Summary; export: Summary & { file: string; sha256: string } }
const record = JSON.parse(readFileSync(new URL("packages/mechanisms/test/legacy/stanchion-bodies.json", root), "utf8")) as {
  source: { file: string; sha256: string; command: string };
  bodies: Record<string, BodyRow>;
};
const sums = (): Map<string, string> => new Map(readFileSync(orig("SHA256SUMS"), "utf8").trim().split("\n").map((l) => {
  const [h, f] = l.split(/\s+/);
  return [f!, h!] as const;
}));
const sha = (b: Buffer): string => createHash("sha256").update(b).digest("hex");

/** Volume by the divergence theorem and bounds of a binary STL, float32 vertices widened to float64. */
function stl(buf: Buffer): Summary {
  const n = buf.readUInt32LE(80);
  let vol = 0;
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < n; i++) {
    const o = 84 + i * 50 + 12;
    const v = [0, 1, 2].map((k) => [0, 1, 2].map((c) => buf.readFloatLE(o + k * 12 + c * 4)));
    const [a, b, c] = v as [number[], number[], number[]];
    vol += (a[0]! * (b[1]! * c[2]! - b[2]! * c[1]!) - a[1]! * (b[0]! * c[2]! - b[2]! * c[0]!) + a[2]! * (b[0]! * c[1]! - b[1]! * c[0]!)) / 6;
    for (const p of v) for (let c2 = 0; c2 < 3; c2++) { lo[c2] = Math.min(lo[c2]!, p[c2]!); hi[c2] = Math.max(hi[c2]!, p[c2]!); }
  }
  return { volume: vol, bboxMin: lo, bboxMax: hi, faces: n, watertight: true };
}

describe("aileron-differential bodies regenerate from cad.py", () => {
  const def = mechanisms.resolve("aileron-differential").def;
  const cad = def.original?.find((o) => o.file === "files/src/cad.py");

  test("the record ran the pinned cad.py", () => {
    expect(cad?.sha256).toBe(record.source.sha256);
    expect(sha(readFileSync(orig("files/src/cad.py")))).toBe(record.source.sha256);
    expect(sums().get("files/src/cad.py")).toBe(record.source.sha256);
  });

  test.each(["yaw_plate", "gimbal_cross", "cam_carrier", "pushrod"])("%s: cad.py's body equals the shipped export", (name) => {
    const row = record.bodies[name]!;
    const buf = readFileSync(orig(row.export.file));
    expect(sha(buf)).toBe(row.export.sha256);
    expect(sums().get(row.export.file)).toBe(row.export.sha256);
    const s = stl(buf);
    expect(s.faces).toBe(row.built.faces);
    // float32 export against the float64 build: 1e-3 mm3 on volume, 1e-4 mm on bounds.
    expect(Math.abs(s.volume - row.built.volume)).toBeLessThan(1e-3);
    for (let c = 0; c < 3; c++) {
      expect(Math.abs(s.bboxMin[c]! - row.built.bboxMin[c]!)).toBeLessThan(1e-4);
      expect(Math.abs(s.bboxMax[c]! - row.built.bboxMax[c]!)).toBeLessThan(1e-4);
    }
    expect(row.built.watertight).toBe(true);
  });

  test("the entry stays candidate and names the blocker until a port builds these bodies", () => {
    expect(def.status).toBe("candidate");
    expect(def.statusReason).toMatch(/icosphere/);
    expect(def.statusReason).toMatch(/1\/1024 mm/);
    expect(def.reference).toEqual([]);
  });
});
