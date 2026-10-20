// The registry generator frame (tools/gen/registries.mjs) against a temp
// root holding fixture generator modules, plus the shared helpers in
// tools/gen/lib.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exportedConst, frozenThenSorted, generatorFiles, jsonText, readFragments } from "../gen/lib.mjs";

const frame = join(import.meta.dirname, "..", "gen", "registries.mjs");

function tempRoot(modules) {
  const root = mkdtempSync(join(tmpdir(), "hbf-gen-"));
  const dir = join(root, "tools", "gen", "registries");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "README.md"), "not a module\n");
  for (const [file, src] of modules) writeFileSync(join(dir, file), src);
  return root;
}

const run = (root, ...args) => spawnSync(process.execPath, [frame, `--root=${root}`, ...args], { encoding: "utf8" });

// A fixture module gathering fragments/<name>/*.txt into out/<name>.txt.
const gatherer = (name) => `
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
export const name = ${JSON.stringify(name)};
export function outputs(root) {
  const dir = join(root, "fragments", name);
  const parts = existsSync(dir) ? readdirSync(dir).sort().map((f) => readFileSync(join(dir, f), "utf8")) : [];
  return [{ path: "out/" + name + ".txt", text: parts.join("") }];
}
`;

test("write mode creates each output; --check is then fresh", () => {
  const root = tempRoot([["alpha.mjs", gatherer("alpha")], ["beta.mjs", gatherer("beta")]]);
  try {
    mkdirSync(join(root, "fragments", "alpha"), { recursive: true });
    writeFileSync(join(root, "fragments", "alpha", "b.txt"), "two\n");
    writeFileSync(join(root, "fragments", "alpha", "a.txt"), "one\n");
    const w = run(root);
    assert.equal(w.status, 0, w.stderr);
    assert.equal(readFileSync(join(root, "out", "alpha.txt"), "utf8"), "one\ntwo\n");
    assert.equal(readFileSync(join(root, "out", "beta.txt"), "utf8"), "");
    const c = run(root, "--check");
    assert.equal(c.status, 0, c.stderr);
    assert.match(c.stdout, /2 generators, 2 outputs, all fresh/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("--check exits 1 naming the stale path and its --only fix, and writes nothing", () => {
  const root = tempRoot([["alpha.mjs", gatherer("alpha")], ["beta.mjs", gatherer("beta")]]);
  try {
    assert.equal(run(root).status, 0);
    writeFileSync(join(root, "out", "beta.txt"), "hand edit\n");
    const c = run(root, "--check");
    assert.equal(c.status, 1);
    assert.equal(c.stderr.trim(), "stale: out/beta.txt. run node tools/gen/registries.mjs --only=beta");
    assert.equal(readFileSync(join(root, "out", "beta.txt"), "utf8"), "hand edit\n");
    rmSync(join(root, "out", "alpha.txt"));
    const missing = run(root, "--check");
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /stale: out\/alpha\.txt\. run node tools\/gen\/registries\.mjs --only=alpha/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("--only runs one module; an unknown name exits 2", () => {
  const root = tempRoot([["alpha.mjs", gatherer("alpha")], ["beta.mjs", gatherer("beta")]]);
  try {
    const o = run(root, "--only=beta");
    assert.equal(o.status, 0, o.stderr);
    assert.ok(existsSync(join(root, "out", "beta.txt")));
    assert.ok(!existsSync(join(root, "out", "alpha.txt")));
    assert.equal(run(root, "--check", "--only=beta").status, 0);
    assert.equal(run(root, "--check").status, 1);
    const bad = run(root, "--only=gamma");
    assert.equal(bad.status, 2);
    assert.match(bad.stderr, /no generator named gamma\. known: alpha, beta/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("modules run in file name order whatever the directory order", () => {
  // End to end only: node on unix lists a directory in byte order already,
  // so the sort itself is held by the generatorFiles test below.
  const names = ["m4", "m1", "m6", "m2", "m5", "m3", "m8", "m7"];
  const logger = (n) => `
import { appendFileSync } from "node:fs";
import { join } from "node:path";
export const name = ${JSON.stringify(n)};
export function outputs(root) {
  appendFileSync(join(root, "order.log"), name + "\\n");
  return [];
}
`;
  const root = tempRoot(names.map((n) => [`${n}.mjs`, logger(n)]));
  try {
    const r = run(root);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(readFileSync(join(root, "order.log"), "utf8"), [...names].sort().join("\n") + "\n");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an empty registries dir exits 0 in both modes", () => {
  const root = tempRoot([]);
  try {
    assert.equal(run(root).status, 0);
    const c = run(root, "--check");
    assert.equal(c.status, 0, c.stderr);
    assert.match(c.stdout, /0 generators, 0 outputs, all fresh/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("contract errors exit 2: shared output path, path outside root, missing outputs, unknown flag", () => {
  const twin = (n) => `export const name = ${JSON.stringify(n)};\nexport const outputs = () => [{ path: "out/one.txt", text: "x" }];\n`;
  const cases = [
    [[["a.mjs", twin("a")], ["b.mjs", twin("b")]], [], /out\/one\.txt is written by both a and b/],
    [[["a.mjs", `export const name = "a";\nexport const outputs = () => [{ path: "../x.txt", text: "x" }];\n`]], [], /outside the root/],
    [[["a.mjs", `export const name = "a";\n`]], [], /exports no outputs\(root\) function/],
    [[], ["--chek"], /unknown argument --chek/],
  ];
  for (const [mods, args, re] of cases) {
    const root = tempRoot(mods);
    try {
      const r = run(root, ...args);
      assert.equal(r.status, 2, r.stderr);
      assert.match(r.stderr, re);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test("the repo's own registries are fresh", () => {
  const r = spawnSync(process.execPath, [frame, "--check"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
});

test("generatorFiles keeps .mjs modules in byte order whatever order it is handed", () => {
  assert.deepEqual(generatorFiles(["m4.mjs", "README.md", "B.mjs", "m1.mjs", ".x.mjs", "a.mjs", "m10.mjs"]), ["B.mjs", "a.mjs", "m1.mjs", "m10.mjs", "m4.mjs"]);
});

test("readFragments sorts by file name and skips other extensions and dotfiles", () => {
  const dir = mkdtempSync(join(tmpdir(), "hbf-frag-"));
  try {
    for (const f of ["b.json", "a.json", ".c.json", "d.txt"]) writeFileSync(join(dir, f), f);
    assert.deepEqual(readFragments(dir, ".json").map((f) => [f.id, f.text]), [["a", "a.json"], ["b", "b.json"]]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("jsonText is two-space JSON with one trailing newline", () => {
  assert.equal(jsonText({ a: [1] }), '{\n  "a": [\n    1\n  ]\n}\n');
});

test("frozenThenSorted keeps the frozen order, drops absent frozen ids, sorts the rest, refuses duplicates", () => {
  assert.deepEqual(frozenThenSorted(["z", "b", "y", "a"], ["y", "gone", "b"]), ["y", "b", "a", "z"]);
  assert.throws(() => frozenThenSorted(["a", "a"], []), /duplicate id in a/);
});

test("exportedConst reads the one export, prefers the typed one, and refuses a guess", () => {
  assert.equal(exportedConst("export const crankYoke = refusedMechanism({\n", "MechanismDef"), "crankYoke");
  assert.equal(exportedConst("export const helper = 1;\nexport const rotor: MechanismDef<Values> = {\n", "MechanismDef"), "rotor");
  assert.throws(() => exportedConst("export const a = 1;\nexport const b = 2;\n", "MechanismDef"), /found 2 exports and 0/);
  assert.throws(() => exportedConst("const a = 1;\n", "MechanismDef"), /found 0 exports/);
});
