// M07-T13, the sparrow evaluation, held to sources outside the code under
// test: a real sparrow solution committed as a fixture (the native CLI at
// the pinned commit, SLUG acrylic, seed 1, strip 1), read back here with a
// general rotation matrix instead of the quarter-turn table of
// to-instance.mjs; jagua-rs 1.0.0's own rule for min_item_separation (items
// grow by half, the strip shrinks by half, src/io/import.rs); the committed
// record packages/nest/records/sparrow-eval.json; and the verdict file,
// whose table must carry the record's numbers. Nothing here runs sparrow.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
// to-instance.mjs registers the resolve hook @hackbuild/nest needs, so it loads first
const { QUARTER_TURNS, outerRing, quarterOf, readSolution, stripFrame, toInstance } = await import("../sparrow/to-instance.mjs");
const { extentOf, layoutHash, ringsById } = await import("@hackbuild/nest");
const { slugSheetsScene, SLUG_STOCKS } = await import(pathToFileURL(path.join(ROOT, "packages/nest/scenes/slug-sheets.ts")).href);

const json = (rel) => JSON.parse(readFileSync(path.join(ROOT, rel), "utf8"));
const fixture = json("tools/sparrow/fixtures/slug-acrylic-strip1.json");
const record = json("packages/nest/records/sparrow-eval.json");
const verdict = readFileSync(path.join(ROOT, "docs/explanation/nest-sparrow-evaluation.md"), "utf8");
const SETS = ["slug-ply", "slug-acrylic", "ogee16-r16"];

const scene = slugSheetsScene();
const acrylic = scene.request.items.filter((it) => it.stock === SLUG_STOCKS.acrylic);
const boxesOf = (items) => items.flatMap((it) => {
  const e = extentOf(it.rings);
  return Array.from({ length: it.qty }, (_, copy) => ({ id: it.id, copy, w: e.w, h: e.h }));
});

test("the strip keeps the sheet margin under jagua-rs's separation rule", () => {
  // a part's real outline sits at least gap from the strip edge (gap/2 growth plus gap/2 inset);
  // shifted by margin - gap it sits at least margin from the sheet edge
  for (const [margin, gap, H, W] of [[6, 4, 400, 600], [4, 4, 400, 600], [10, 3, 610, 1220]]) {
    const f = stripFrame({ sheet: [W, H], margin, gap });
    assert.equal(f.shift + gap, margin);
    assert.equal(f.stripHeight - gap + f.shift, H - margin, "top edge");
    assert.equal(f.cut + f.shift, W - margin, "far edge");
  }
  assert.deepEqual(stripFrame({ sheet: [600, 400], margin: 6, gap: 4 }), { stripHeight: 396, cut: 592, shift: 2, sheet: [600, 400], margin: 6, gap: 4 });
  assert.throws(() => stripFrame({ sheet: [600, 400], margin: 2, gap: 4 }), /margin 2 below gap 4/);
});

test("quarter turns only; sparrow's -180 is a half turn", () => {
  assert.deepEqual([0, 90, -180, 180, 270, -90, 450.0004].map(quarterOf), [0, 90, 180, 180, 270, 270, 90]);
  assert.throws(() => quarterOf(45), /not a quarter turn/);
});

test("an item enters by its one outer ring, repeats dropped; two outers are refused", () => {
  const sq = (x, y, s) => [[x, y], [x + s, y], [x + s, y + s], [x, y + s]];
  assert.deepEqual(outerRing([sq(2, 2, 2), [[0, 0], [10, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]), [[0, 0], [10, 0], [10, 10], [0, 10]]);
  assert.throws(() => outerRing([sq(0, 0, 2), sq(5, 5, 2)]), /2 rings at depth 0/);
});

test("a root that carries parts in its holes is its own item; the others share one", () => {
  const ring = [[0, 0], [10, 0], [10, 10], [0, 10]];
  const roots = [{ id: "a", copy: 0 }, { id: "a", copy: 1 }, { id: "a", copy: 2 }, { id: "b", copy: 0 }];
  const inners = new Map([["a\u00001", [{ id: "c", copy: 0 }]]]);
  const { instance, classes } = toInstance("t", roots, () => [ring], { gap: 4, stripHeight: 400 }, inners);
  assert.deepEqual(classes.map((c) => [c.part, c.boxes.map((b) => b.copy)]), [["a", [0, 2]], ["a", [1]], ["b", [0]]]);
  assert.deepEqual(instance.items.map((it) => [it.id, it.demand]), [[0, 2], [1, 1], [2, 1]]);
  assert.deepEqual(instance.items[0].orientation, { rotation: { mode: "discrete", angles: [0, 90, 180, 270] } });
  assert.equal(instance.min_item_separation, 4);
});

test("SLUG acrylic as an instance equals the one sparrow solved, at f32", () => {
  const frame = stripFrame({ sheet: scene.request.sheet, margin: scene.request.margin, gap: scene.request.gap });
  const { instance } = toInstance(fixture.name, boxesOf(acrylic), ringsById(acrylic), frame, new Map());
  assert.equal(instance.strip_height, fixture.strip_height);
  assert.equal(instance.min_item_separation, fixture.min_item_separation);
  assert.equal(instance.items.length, fixture.items.length);
  instance.items.forEach((it, i) => {
    const f = fixture.items[i];
    assert.deepEqual([it.id, it.demand, it.orientation], [f.id, f.demand, f.orientation]);
    assert.deepEqual(it.shape.data.map(([x, y]) => [Math.fround(x), Math.fround(y)]), f.shape.data.map(([x, y]) => [Math.fround(x), Math.fround(y)]));
  });
  assert.deepEqual(QUARTER_TURNS, [0, 90, 180, 270]);
});

test("the solution reads back to the corners a rotation matrix gives, and to the record's layoutHash", () => {
  const frame = stripFrame({ sheet: scene.request.sheet, margin: scene.request.margin, gap: scene.request.gap });
  const ringsOf = ringsById(acrylic);
  const { classes } = toInstance(fixture.name, boxesOf(acrylic), ringsOf, frame, new Map());
  const placed = readSolution(fixture, classes, ringsOf);
  assert.equal(placed.length, fixture.solution.layout.placed_items.length);
  // independent: rotate each item's outline by its angle with cos and sin, translate, take the bbox corner
  const corners = fixture.solution.layout.placed_items.map((pi) => {
    const a = (pi.transformation.rotation * Math.PI) / 180;
    const [tx, ty] = pi.transformation.translation;
    const pts = ringsOf(classes[pi.item_id].part).flat().map(([x, y]) => [Math.cos(a) * x - Math.sin(a) * y + tx, Math.sin(a) * x + Math.cos(a) * y + ty]);
    return [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1]))];
  }).sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const got = placed.map((p) => p.at).sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  got.forEach((c, i) => {
    assert.ok(Math.abs(c[0] - corners[i][0]) < 1e-6 && Math.abs(c[1] - corners[i][1]) < 1e-6, `corner ${i}: ${c} against ${corners[i]}`);
  });
  for (const p of placed) {
    for (const [x, y] of p.outer) {
      assert.ok(y >= frame.gap - 1e-3 && y <= frame.stripHeight - frame.gap + 1e-3, `y ${y} outside the strip`);
      assert.ok(x >= frame.gap - 1e-3 && x <= frame.cut + 1e-9, `x ${x} past the cut`);
    }
  }
  // one strip holds the set, so the sheet layout is the strip shifted onto the sheet
  const placements = placed.map((p) => ({ id: p.box.id, copy: p.box.copy, sheet: 0, at: [p.at[0] + frame.shift, p.at[1] + frame.shift], rot: p.rot }));
  const run = record.sets["slug-acrylic"].sparrow.runs.find((r) => r.seed === 1 && r.run === 1);
  assert.equal(run.sheets, 1);
  assert.equal(layoutHash(placements), run.layoutHash);
});

test("the record holds each set's sheets, wall times and two layoutHashes per seed", () => {
  assert.ok(["built", "failed"].includes(record.build.status));
  if (record.build.status === "built") {
    assert.equal(record.build.sparrow.commit, /SPARROW_COMMIT="([0-9a-f]{40})"/.exec(readFileSync(path.join(ROOT, "tools/sparrow/build.sh"), "utf8"))[1]);
    assert.ok(record.build.wasm.bake.withinLimit && record.build.wasm.wasm.bytes > 0);
  }
  for (const name of SETS) {
    const s = record.sets[name];
    assert.ok(Number.isInteger(s.fill.sheets) && s.fill.sheets > 0, name);
    assert.ok(s.fill.wallMs.values.length > 0, name);
    for (const seed of s.sparrow.settings.seeds) {
      const runs = s.sparrow.runs.filter((r) => r.seed === seed);
      assert.equal(runs.length, 2, `${name} seed ${seed}`);
      assert.deepEqual(s.sparrow.perSeed[seed].layoutHashes, runs.map((r) => r.layoutHash));
      for (const r of runs) {
        assert.ok(Number.isInteger(r.sheets) && r.wallMs > 0 && r.holds, `${name} seed ${seed} run ${r.run}`);
        assert.equal(r.pieces, s.input.pieces, `${name}: every piece placed`);
      }
    }
  }
});

test("the verdict states adopt or do not adopt and its table carries the record's numbers", () => {
  assert.match(verdict, /^Verdict: (do not adopt|adopt)\./m);
  if (record.build.status === "built") {
    const b = record.build;
    for (const fact of [`features only_final_svg\`, ${b.native.seconds} s`, `binary ${b.native.binary.bytes} bytes`, `(\`${b.wasm.wasm.sha256.slice(0, 16)}\`)`, `(\`${b.native.binary.sha256.slice(0, 16)}\`)`, `| wasm size | ${b.wasm.wasm.bytes} bytes, ${b.wasm.bake.base64Bytes} as base64, glue ${b.wasm.glue.bytes} bytes`, `| load | ${b.wasm.loadMs.mean} ms mean`, `wasm links ${b.wasm.closure.crates} crates`]) {
      assert.ok(verdict.replace(/\n\s*/g, " ").includes(fact), `verdict lacks the build fact ${fact}`);
    }
  }
  for (const name of SETS) {
    const s = record.sets[name];
    const sheets = s.sparrow.settings.seeds.map((seed) => s.sparrow.runs.filter((r) => r.seed === seed).map((r) => r.sheets).join(" and ")).join("; ");
    const hashes = s.sparrow.settings.seeds.map((seed) => (s.sparrow.perSeed[seed].equal ? "equal" : "differ")).join("; ");
    const wall = (Math.max(...s.sparrow.runs.map((r) => r.wallMs)) / 1000).toFixed(0);
    const row = `| ${name} | ${s.input.pieces} | ${s.fill.sheets} | ${sheets} | ${s.fill.wallMs.mean} | ${wall} | ${hashes} |`;
    assert.ok(verdict.includes(row), `verdict table lacks the row ${row}`);
    const span = (xs) => (Math.min(...xs) === Math.max(...xs) ? `${xs[0]}` : `${Math.min(...xs)} to ${Math.max(...xs)}`);
    const lengths = `| ${name} | ${s.fill.usedLength} | ${span(s.sparrow.runs.map((r) => r.oneStripLength))} | ${span(s.sparrow.runs.map((r) => r.usedLength))} |`;
    assert.ok(verdict.includes(lengths), `verdict lengths table lacks the row ${lengths}`);
  }
});

// M07 audit: the record's hashes held only in the folder they were built
// in. The wasm embedded the work path, cargo hashed the wrapper's sparrow
// path dependency by its absolute path into the crate id, ld64 folded the
// object paths into LC_UUID, and sparrow's Cargo.lock is not tracked at
// the pinned commit, so a fresh checkout could not build --locked at all.
// tools/sparrow/repro.sh builds in two folders of different depth and
// writes "reproducible"; the build key must be the second of those builds.
test("two clean builds in different folders give equal native, wasm and glue bytes", () => {
  const r = record.reproducible;
  assert.ok(r, "no reproducible key: run bash tools/sparrow/repro.sh");
  assert.ok(r.foldersDiffer && r.depths[0] !== r.depths[1], "the two folders differ in depth");
  for (const k of ["native", "wasm", "glue"]) {
    assert.equal(r[k].sha256[0], r[k].sha256[1], `${k} differs between the folders`);
    assert.deepEqual(r[k].workPathsInBytes, [0, 0], `${k} names its build folder`);
  }
  assert.equal(r.equal, true);
  assert.equal(record.build.native.binary.sha256, r.native.sha256[1]);
  assert.equal(record.build.wasm.wasm.sha256, r.wasm.sha256[1]);
  assert.equal(record.build.wasm.glue.sha256, r.glue.sha256[1]);
});

test("build.sh remaps paths, pins the native lock and keeps sparrow inside the wrapper's root", async () => {
  const { createHash } = await import("node:crypto");
  const sh = readFileSync(path.join(ROOT, "tools/sparrow/build.sh"), "utf8");
  assert.match(sh, /--remap-path-prefix=\$WORK=/);
  assert.match(sh, /--remap-path-prefix=\$CARGO_HOME_DIR=/);
  assert.match(sh, /-oso_prefix,\$WORK\//);
  const pinned = /NATIVE_LOCK_SHA256="([0-9a-f]{64})"/.exec(sh)?.[1];
  const lock = readFileSync(path.join(ROOT, "tools/sparrow/native/Cargo.lock"));
  assert.equal(createHash("sha256").update(lock).digest("hex"), pinned);
  assert.match(lock.toString("utf8"), /name = "jagua-rs"\nversion = "1\.0\.0"/);
  assert.match(readFileSync(path.join(ROOT, "tools/sparrow/wasm/Cargo.toml"), "utf8"), /^sparrow = \{ path = "sparrow" \}$/m);
  for (const k of ["native", "wasm"]) assert.match(record.build[k].rustflags, /--remap-path-prefix=<work>=/);
});
