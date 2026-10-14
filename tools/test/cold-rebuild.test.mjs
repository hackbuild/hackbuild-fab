// tools/cold-rebuild.mjs (M04-T10): the comparison reads every reference's
// committed expected/ files, a changed build, mesh or report hash prints
// "fail" with both hashes, and the leak scan finds a path inside a stored
// object, a zip entry included.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readdirSync, existsSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";
import { FOREIGN, boardExpectedOf, compareLine, expectedOf, parityLine, pathLeaks } from "../cold-rebuild.mjs";
import { boardReferences } from "../determinism/hashes.mjs";

const root = join(import.meta.dirname, "..", "..");

function refs() {
  const out = [];
  for (const area of readdirSync(join(root, "reference")).sort()) {
    const ad = join(root, "reference", area);
    if (!existsSync(ad) || area.startsWith(".")) continue;
    for (const id of readdirSync(ad).sort()) if (existsSync(join(ad, id, "chase.ts"))) out.push(`reference/${area}/${id}`);
  }
  return out;
}

test("every reference has expected build and report hashes and a whole-second epoch", async () => {
  const all = refs();
  assert.ok(all.length > 0);
  const boards = await boardReferences();
  assert.ok(boards.has("reference/boards/spindle-r1") && boards.has("reference/boards/wiring-tang-r5"));
  assert.ok(!boards.has("reference/keys/click-spring-window"));
  for (const r of all) {
    if (boards.has(r)) {
      const b = boardExpectedOf(join(root, r));
      assert.match(b.buildHash, /^[0-9a-f]{64}$/, r);
      assert.ok(Object.values(b.artifactHashes).length > 0, `${r} has artifact hashes`);
      for (const h of Object.values(b.artifactHashes)) assert.match(h, /^[0-9a-f]{64}$/, r);
      continue;
    }
    const e = expectedOf(join(root, r));
    assert.match(e.buildHash, /^[0-9a-f]{64}$/, r);
    assert.match(e.reportHash, /^[0-9a-f]{64}$/, r);
    assert.ok(Object.keys(e.meshHashes).length > 0, `${r} has mesh hashes`);
    assert.ok(Number.isSafeInteger(e.sourceDateEpoch), r);
  }
});

test("the comparison passes the golden itself and fails each hash that moves", () => {
  const want = expectedOf(join(root, "reference/keys/click-spring-window"));
  const same = { buildHash: want.buildHash, meshHashes: { ...want.meshHashes }, reportHash: want.reportHash };
  const ok = compareLine("r", "cold", same, want);
  assert.equal(ok.ok, true);
  assert.equal(ok.line, "r cold build ok mesh ok report ok");
  const flip = (h) => `${h[0] === "0" ? "1" : "0"}${h.slice(1)}`;
  const b = compareLine("r", "cold", { ...same, buildHash: flip(want.buildHash) }, want);
  assert.equal(b.ok, false);
  assert.match(b.line, /build fail [0-9a-f]{12} want [0-9a-f]{12} mesh ok report ok$/);
  const [first] = Object.keys(want.meshHashes);
  const m = compareLine("r", "cold", { ...same, meshHashes: { ...want.meshHashes, [first]: flip(want.meshHashes[first]) } }, want);
  assert.equal(m.ok, false);
  assert.match(m.line, new RegExp(`mesh fail ${first} `));
  const { [first]: _gone, ...fewer } = want.meshHashes;
  assert.equal(compareLine("r", "cold", { ...same, meshHashes: fewer }, want).ok, false);
  const r = compareLine("r", "cold", { ...same, reportHash: flip(want.reportHash) }, want);
  assert.equal(r.ok, false);
  assert.match(r.line, /report fail/);
});

test("a board line passes only when parity finds every golden equal", () => {
  const files = [{ file: "build.json", status: "equal" }, { file: "artifacts.json", status: "equal" }];
  assert.deepEqual(parityLine("r", "cold", { ok: true, accepted: false, files }), { ok: true, line: "r cold parity ok" });
  const moved = parityLine("r", "cold", { ok: false, accepted: false, files: [files[0], { file: "artifacts.json", status: "differs" }] });
  assert.deepEqual(moved, { ok: false, line: "r cold parity fail artifacts.json differs" });
  assert.equal(parityLine("r", "warm", { ok: true, accepted: true, files: [{ file: "build.json", status: "written" }] }).ok, false);
});

test("the foreign environment is the card's", () => {
  assert.deepEqual(FOREIGN, { TZ: "Pacific/Chatham", LANG: "tr_TR.UTF-8", LC_ALL: "tr_TR.UTF-8" });
});

test("the leak scan finds a path in json and inside a deflated zip entry", async () => {
  const dir = mkdtempSync(join(tmpdir(), "cold-test-"));
  try {
    const store = join(dir, "store");
    mkdirSync(join(store, "builds"), { recursive: true });
    writeFileSync(join(store, "builds", "a.json"), JSON.stringify({ target: "reference/keys/x" }));
    assert.deepEqual(await pathLeaks([store], ["/secret/home"]), []);
    writeFileSync(join(store, "builds", "b.json"), JSON.stringify({ target: "/secret/home/x" }));
    const zip = new JSZip();
    zip.file("Metadata/x.json", "a".repeat(200) + "/secret/home/y" + "a".repeat(200), { compression: "DEFLATE" });
    writeFileSync(join(store, "c.3mf"), await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }));
    const inflate = async (bytes) => {
      const z = await JSZip.loadAsync(bytes);
      const out = {};
      for (const f of Object.values(z.files)) if (!f.dir) out[f.name] = await f.async("string");
      return out;
    };
    const plain = await pathLeaks([store], ["/secret/home"]);
    assert.equal(plain.length, 1, "deflated text is invisible without the inflater");
    const found = await pathLeaks([store], ["/secret/home"], inflate);
    assert.equal(found.length, 2);
    assert.ok(found.some((l) => l.includes("b.json")) && found.some((l) => l.includes("c.3mf")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
