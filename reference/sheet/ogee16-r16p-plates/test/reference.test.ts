// reference/sheet/ogee16-r16p-plates: build.ts against expected/ and
// against sources it did not write. The goldens are canonical JSON (RFC
// 8785); HBF_ACCEPT_SHEET=1 rewrites them after the diff is read. hbf
// parity has no sheet path and no chase kind is a plate layout (D-126), so
// this test holds the goldens until M10 (README.md). Each plate 3MF is read
// back with the packages/3mf reader and audited here on its written build
// items: the item transforms applied to the written vertices, pairwise XY
// separation, the bed margin and the build height. Each file then goes
// through tools/py/validate_3mf.py --overlap. The CHK-LNT-03 fixture, the
// build-it page's own PARTS_TBL, is read from the original in
// buildit-originals.test.ts.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, test } from "vitest";
import { canonicalize } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { readEntries } from "@hackbuild/3mf";
import { build, type PlatesBuild } from "../build";

const ROOT = new URL("../../../../", import.meta.url);
const ROOT_PATH = fileURLToPath(ROOT);
const DIR = "reference/sheet/ogee16-r16p-plates";
const ACCEPT = process.env["HBF_ACCEPT_SHEET"] === "1";
const read = (rel: string): string => readFileSync(new URL(rel, ROOT), "utf8");

function pin(name: string, fresh: unknown): void {
  const at = new URL(`${DIR}/expected/${name}`, ROOT);
  if (ACCEPT) {
    mkdirSync(new URL(`${DIR}/expected/`, ROOT), { recursive: true });
    writeFileSync(at, `${canonicalize(fresh)}\n`);
    return;
  }
  expect(existsSync(at), `${DIR}/expected/${name} is not committed; HBF_ACCEPT_SHEET=1 npx vitest run ${DIR}`).toBe(true);
  expect(canonicalize(fresh), `${DIR}/expected/${name} moved; read the diff, then HBF_ACCEPT_SHEET=1 npx vitest run ${DIR}`).toBe(readFileSync(at, "utf8").trimEnd());
}

const legacy = JSON.parse(read("packages/nest/records/ogee16-plates-legacy.json")) as {
  result: Record<"knobs" | "servos", { gap4: { plates: number; pieces: number; labels: string[] }; autoGap: { gap: number; plates: number } }>;
};

let b: PlatesBuild;
beforeAll(async () => {
  b = await build(createProfileLookup(loadProfile()));
}, 300_000);

describe("ogee16-r16p-plates goldens", () => {
  test("layout.json and artifacts.json equal expected/", () => {
    pin("layout.json", b.layout);
    pin("artifacts.json", b.artifacts);
  });

  test("equal for equal input: a second build writes the same bytes", async () => {
    const again = await build(createProfileLookup(loadProfile()));
    expect(again.artifacts).toEqual(b.artifacts);
  }, 300_000);
});

interface Item { objectid: string; m: number[] }
interface Box { lo: [number, number, number]; hi: [number, number, number] }

/** The written model: vertices per mesh object, components per object, build items with their transforms. */
function boxesOf(model: string): { boxes: Box[]; items: Item[] } {
  const verts = new Map<string, number[][]>();
  for (const m of model.matchAll(/<object id="(\d+)"[^>]*>\s*<mesh>\s*<vertices>([\s\S]*?)<\/vertices>/g)) {
    verts.set(m[1]!, [...m[2]!.matchAll(/<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"\/>/g)].map((v) => [Number(v[1]), Number(v[2]), Number(v[3])]));
  }
  const comps = new Map<string, { id: string; m: number[] }[]>();
  for (const m of model.matchAll(/<object id="(\d+)"[^>]*>\s*<components>([\s\S]*?)<\/components>/g)) {
    comps.set(m[1]!, [...m[2]!.matchAll(/<component objectid="(\d+)"[^>]*transform="([^"]+)"/g)].map((c) => ({ id: c[1]!, m: c[2]!.split(" ").map(Number) })));
  }
  const items = [...model.matchAll(/<item objectid="(\d+)"[^>]*transform="([^"]+)"/g)].map((m) => ({ objectid: m[1]!, m: m[2]!.split(" ").map(Number) }));
  // 3MF Core: a point is a row vector times the 4 x 3 matrix m00 m01 m02 m10 ... m32
  const apply = (m: number[], [x, y, z]: number[]): number[] => [
    x! * m[0]! + y! * m[3]! + z! * m[6]! + m[9]!, x! * m[1]! + y! * m[4]! + z! * m[7]! + m[10]!, x! * m[2]! + y! * m[5]! + z! * m[8]! + m[11]!,
  ];
  const boxes = items.map((it) => {
    const lo: [number, number, number] = [Infinity, Infinity, Infinity], hi: [number, number, number] = [-Infinity, -Infinity, -Infinity];
    for (const c of comps.get(it.objectid) ?? []) {
      for (const v of verts.get(c.id) ?? []) {
        const p = apply(it.m, apply(c.m, v));
        for (let k = 0; k < 3; k++) {
          lo[k] = Math.min(lo[k]!, p[k]!);
          hi[k] = Math.max(hi[k]!, p[k]!);
        }
      }
    }
    return { lo, hi };
  });
  return { boxes, items };
}

describe("each plate 3MF read back (computed)", () => {
  test("41 files: knobs 20 plates of 124 pieces, servos 21 of 119, one part type per file", () => {
    expect(b.files.filter((f) => f.drive === "knobs")).toHaveLength(legacy.result.knobs.gap4.plates);
    expect(b.files.filter((f) => f.drive === "servos")).toHaveLength(legacy.result.servos.gap4.plates);
    expect(b.files).toHaveLength(41);
    for (const f of b.files) expect(f.name.length, f.name).toBeLessThanOrEqual(56);
  });

  test("items do not overlap, keep the 4 mm gap, sit inside the 10 mm margin and the 256 mm height; file name quantity equals its items", async () => {
    const [W, H] = b.layout["sheet"] as [number, number];
    const margin = b.layout["margin"] as number;
    const perDrive: Record<string, number> = {};
    for (const f of b.files) {
      const entries = await readEntries(f.bytes);
      const model = entries["3D/3dmodel.model"];
      expect(typeof model, f.name).toBe("string");
      const { boxes, items } = boxesOf(model as string);
      expect(new Set(items.map((i) => i.objectid)).size, f.name).toBe(1);
      expect(f.name).toMatch(new RegExp(`-x${items.length}\\.3mf$`));
      perDrive[f.drive] = (perDrive[f.drive] ?? 0) + items.length;
      for (const q of boxes) {
        expect(q.lo[0], f.name).toBeGreaterThanOrEqual(margin - 1e-6);
        expect(q.lo[1], f.name).toBeGreaterThanOrEqual(margin - 1e-6);
        expect(q.hi[0], f.name).toBeLessThanOrEqual(W - margin + 1e-6);
        expect(q.hi[1], f.name).toBeLessThanOrEqual(H - margin + 1e-6);
        expect(q.lo[2], f.name).toBe(0);
        expect(q.hi[2], f.name).toBeLessThanOrEqual(256);
      }
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const A = boxes[i]!, B = boxes[j]!;
          const sep = Math.max(B.lo[0] - A.hi[0], A.lo[0] - B.hi[0], B.lo[1] - A.hi[1], A.lo[1] - B.hi[1]);
          expect(sep, `${f.name} items ${i} and ${j}`).toBeGreaterThanOrEqual(4 - 1e-6);
        }
      }
    }
    expect(perDrive).toEqual({ knobs: legacy.result.knobs.gap4.pieces, servos: legacy.result.servos.gap4.pieces });
  }, 300_000);

  test("artifact hashes are the bytes build.ts wrote", () => {
    for (const f of b.files) expect(createHash("sha256").update(f.bytes).digest("hex")).toBe(b.artifacts["3mf"]![f.name]);
  });
});

// Each plate through tools/py/validate_3mf.py --overlap --json. Python runs through uv (RULES.md
// Verification); a host without uv fails here, never skips. CHK-PRT-03 compares parts inside one
// object and, with two or more build items, every pair of items as placed (the "#build" row). A
// plate places each copy as its own build item, so a plate of n copies must report n(n-1)/2 pairs
// (the parts of an item are one body per copy here) and 0 mm3 between them; before the build rule
// the validator compared 0 pairs on every plate and passed stacked copies (M07 audit).
// HBF_PLATES_OUT=<dir> keeps the written plates in that directory for a person to open.
const KEEP = process.env["HBF_PLATES_OUT"];
const UV = spawnSync("uv", ["--version"], { encoding: "utf8" }).status === 0;
interface OverlapRow { id: string; verdict: string; measured: number; target: { path?: string }; extra?: { items?: number; pairs?: number } }
describe("every plate 3MF passes validate_3mf.py --overlap", () => {
  test("exit 0 on all 41 files, every pair of build items compared", () => {
    expect(UV, "uv is not on PATH: the plate overlap check did not run").toBe(true);
    const dir = KEEP ?? mkdtempSync(join(tmpdir(), "hbf-plates-"));
    mkdirSync(dir, { recursive: true });
    try {
      const failed: string[] = [];
      let pairs = 0;
      for (const f of b.files) {
        const file = join(dir, f.name);
        writeFileSync(file, f.bytes);
        const v = spawnSync("uv", ["run", "--project", "tools/py", "tools/py/validate_3mf.py", "--overlap", "--json", file],
          { cwd: ROOT_PATH, encoding: "utf8", timeout: 300_000, maxBuffer: 64 * 1024 * 1024 });
        if (v.status !== 0) { failed.push(`${f.name}: exit ${String(v.status)} ${v.stdout}${v.stderr}`); continue; }
        const rows = (JSON.parse(v.stdout) as { results: OverlapRow[] }).results.filter((r) => r.id === "CHK-PRT-03");
        const build = rows.filter((r) => r.target.path?.endsWith("#build") === true);
        const n = Number(/-x(\d+)\.3mf$/.exec(f.name)?.[1] ?? "1");
        if (n < 2) { if (build.length !== 0) failed.push(`${f.name}: one copy but a build row`); continue; }
        const row = build[0];
        if (build.length !== 1 || row === undefined) { failed.push(`${f.name}: ${String(n)} copies and no build row`); continue; }
        if (row.extra?.items !== n || row.extra.pairs !== (n * (n - 1)) / 2 || row.measured !== 0 || row.verdict !== "pass") {
          failed.push(`${f.name}: build row ${JSON.stringify(row)}`);
        }
        pairs += row.extra?.pairs ?? 0;
      }
      expect(failed).toEqual([]);
      // knobs 945 and servos 933 pairs (computed from the plate quantities: 1 + 6 + 6 + 3 x 120 + 496 + 36 + ...).
      expect(pairs).toBe(1878);
    } finally {
      if (KEEP === undefined) rmSync(dir, { recursive: true, force: true });
    }
  }, 900_000);
});
