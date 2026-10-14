// tools/slice/slice.mjs, the slicer half of the virtual print. The preset
// completion runs on a small profile tree made here, so it is held without
// Flash Studio. The full slice of keys flex-pair preset two runs only where
// Flash Studio is installed and is skipped as not run otherwise; there the
// 3MF it slices must carry the sha256 the generated print card names.
import { test } from "node:test";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import os from "node:os";
import { isAbsolute, join, relative } from "node:path";
import JSZip from "jszip";
import {
  DEFAULT_APP, DEFAULT_DATADIR_ROOT, ROOT, appPresent, assertOutDir, checkGate, completeProject, completed3mf, design3mf, flatten, freshDatadir, presetIndex, slice,
} from "../slice/slice.mjs";

const EPOCH_MS = 315532800 * 1000;

function profileTree(res = mkdtempSync(join(os.tmpdir(), "hbf-slice-res-"))) {
  const put = (rel, obj) => {
    const f = join(res, "profiles", rel);
    mkdirSync(join(f, ".."), { recursive: true });
    writeFileSync(f, JSON.stringify(obj));
  };
  put("Vend/machine/base.json", { name: "base m", nozzle_diameter: ["0.4", "0.4"], gcode_flavor: "klipper", printable_height: "250" });
  put("Vend/machine/m.json", { name: "M 0.4", inherits: "base m", printable_height: "300", type: "machine" });
  put("Vend/process/p.json", { name: "P 0.24", layer_height: "0.24", wall_loops: "2" });
  put("Vend/filament/common.json", { name: "fdm common", nozzle_temperature: ["200"], filament_type: ["PLA"] });
  put("Vend/filament/a.json", { name: "Fil A", inherits: "Lib A", nozzle_temperature: ["245", "250"] });
  put("Vend/filament/b.json", { name: "Fil B", inherits: "fdm common" });
  // the library has its own base with the same name; its child must resolve there
  put("OrcaFilamentLibrary/filament/base/common.json", { name: "fdm common", nozzle_temperature: ["190"], filament_type: ["LIB"] });
  put("OrcaFilamentLibrary/filament/lib.json", { name: "Lib A", inherits: "fdm common", filament_type: ["PETG"] });
  return res;
}

test("presets flatten child over parent, a library preset inherits from its own base", () => {
  const res = profileTree();
  try {
    const idx = presetIndex(res, "M 0.4");
    assert.equal(idx.vendor, "Vend");
    const m = flatten(idx, "machine", "M 0.4");
    assert.equal(m.values.printable_height, "300");
    assert.equal(m.values.gcode_flavor, "klipper");
    assert.deepEqual(m.files, ["profiles/Vend/machine/m.json", "profiles/Vend/machine/base.json"]);
    const a = flatten(idx, "filament", "Fil A");
    assert.deepEqual(a.values.nozzle_temperature, ["245", "250"]);
    assert.deepEqual(a.values.filament_type, ["PETG"]);
    assert.equal(a.files.at(-1), "profiles/OrcaFilamentLibrary/filament/base/common.json");
    const b = flatten(idx, "filament", "Fil B");
    assert.deepEqual(b.values.filament_type, ["PLA"]);
    assert.equal(flatten(idx, "filament", "nope"), undefined);
  } finally {
    rmSync(res, { recursive: true, force: true });
  }
});

test("the embedded keys win, gaps fill from presets, filament keys go one per slot", () => {
  const res = profileTree();
  try {
    const idx = presetIndex(res, "M 0.4");
    const embedded = { printer_settings_id: "M 0.4", print_settings_id: "P 0.24", filament_settings_id: ["Fil A", "Fil B", "Gone"], wall_loops: "3" };
    assert.throws(() => completeProject(embedded, idx), /slot 3 filament preset "Gone" is not bundled/);
    const done = completeProject(embedded, idx, { Gone: "Fil B" });
    assert.equal(done.config.wall_loops, "3");
    assert.equal(done.config.layer_height, "0.24");
    assert.equal(done.config.printable_height, "300");
    assert.deepEqual(done.config.nozzle_diameter, ["0.4", "0.4"]);
    assert.deepEqual(done.config.nozzle_temperature, ["245", "200", "200"]);
    assert.deepEqual(done.config.filament_settings_id, ["Fil A", "Fil B", "Gone"]);
    assert.deepEqual(done.substitutions, [{ slot: 3, named: "Gone", used: "Fil B" }]);
    assert.ok(!("inherits" in done.config) && !("name" in done.config));
    assert.ok(done.filled.includes("gcode_flavor") && !done.filled.includes("wall_loops"));
  } finally {
    rmSync(res, { recursive: true, force: true });
  }
});

/** A zip as the packages/3mf writer makes one: file entries only, no folder entries, every date at the card epoch. */
async function writerLikeZip() {
  const z = new JSZip();
  const o = { createFolders: false, date: new Date(EPOCH_MS) };
  z.file("3D/3dmodel.model", "<model/>", o);
  z.file("Metadata/project_settings.config", JSON.stringify({ a: 1 }), o);
  z.file("Metadata/model_settings.config", "<config/>", o);
  return { names: Object.keys(z.files), bytes: await z.generateAsync({ type: "uint8array" }) };
}

test("the completed 3MF changes only project_settings, keeps entry order and adds no folder entry", async () => {
  const { names, bytes } = await writerLikeZip();
  const out = await JSZip.loadAsync(await completed3mf(bytes, { a: 1, b: 2 }));
  assert.deepEqual(Object.keys(out.files), names);
  assert.ok(Object.keys(out.files).every((n) => !n.endsWith("/")), "no folder entries");
  assert.equal(await out.file("3D/3dmodel.model").async("string"), "<model/>");
  assert.deepEqual(JSON.parse(await out.file("Metadata/project_settings.config").async("string")), { a: 1, b: 2 });
  for (const e of Object.values(out.files)) assert.equal(e.date.getTime(), EPOCH_MS, `${e.name} date`);
});

test("the completed 3MF bytes do not move with the clock", async () => {
  const { bytes } = await writerLikeZip();
  const Real = globalThis.Date;
  const shift = 400 * 86400e3;
  class Later extends Real {
    constructor(...a) {
      if (a.length === 0) super(Real.now() + shift);
      else super(...a);
    }
    static now() {
      return Real.now() + shift;
    }
  }
  const a = await completed3mf(bytes, { a: 1 });
  globalThis.Date = Later;
  let b;
  try {
    b = await completed3mf(bytes, { a: 1 });
  } finally {
    globalThis.Date = Real;
  }
  assert.deepEqual(Buffer.from(b), Buffer.from(a));
});

test("a datadir never lands in the owner's slicer profile and is always new", () => {
  // the five folder names Flash Studio and its Orca lineage keep a profile in, typed here so a dropped name fails
  for (const name of ["Flash Studio", "FlashStudio", "Orca-Flashforge", "OrcaSlicer", "Orca-Flashforge-Studio"]) {
    const owner = join(os.homedir(), "Library", "Application Support", name);
    assert.throws(() => freshDatadir(owner), /overlaps the owner's slicer profile/, name);
    assert.throws(() => freshDatadir(join(owner, "x")), /overlaps the owner's slicer profile/, name);
  }
  const root = mkdtempSync(join(os.tmpdir(), "hbf-slice-dd-"));
  try {
    const a = freshDatadir(root);
    const b = freshDatadir(root);
    assert.notEqual(a, b);
    assert.ok(existsSync(a) && existsSync(b));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("slice writes only under the evidence folder or the temp folder", async () => {
  await assert.rejects(slice({ input: { file: "x.3mf" }, outDir: join(ROOT, "reference/keys/flex-pair/out/sim") }), /writes only under/);
  // a case variant of the gated folder on a case-insensitive volume, and a relative path in the repo
  assert.throws(() => assertOutDir(join(ROOT, "Reference/keys/flex-pair/OUT")), /writes only under/);
  assert.throws(() => assertOutDir("security/run3"), /writes only under/);
  assert.throws(() => assertOutDir("--load-settings=evil"), /writes only under/);
  assertOutDir(join(os.tmpdir(), "hbf-slice-never-made", "x"));
});

test("the check gate refuses a failing build unless allowed, and records it", () => {
  const worst = (rs) => (rs.some((r) => r.verdict === "fail") ? "fail" : "pass");
  const rs = [{ id: "CHK-B", verdict: "fail" }, { id: "CHK-A", verdict: "pass" }, { id: "CHK-B", verdict: "fail" }];
  assert.throws(() => checkGate(rs, worst, { what: "d" }), /^Error: not run: d fails CHK-B; fix the build or pass --allow-failing$/);
  assert.deepEqual(checkGate(rs, worst, { allowFailing: true }), { worst: "fail", ran: 3, failed: ["CHK-B"], allowFailing: true });
  assert.deepEqual(checkGate(rs.slice(1, 2), worst), { worst: "pass", ran: 1, failed: [], allowFailing: false });
});

test("a --design build runs its checks before any byte is sliced", async () => {
  const d = await design3mf("reference/keys/flex-pair", "two");
  assert.ok(d.checks.ran > 0, "checks ran");
  assert.deepEqual(d.checks.failed, []);
  assert.notEqual(d.checks.worst, "fail");
});

/** A stand-in slicer in the app layout slice() reads: MacOS/<exe> beside Resources/profiles. */
function stubApp(exit) {
  const t = mkdtempSync(join(os.tmpdir(), "hbf-slice-stub-"));
  mkdirSync(join(t, "MacOS"));
  profileTree(join(t, "Resources"));
  const exe = join(t, "MacOS", "stub");
  writeFileSync(exe, `#!/bin/sh\nwhile [ $# -gt 0 ]; do if [ "$1" = "--outputdir" ]; then out="$2"; fi; shift; done\nprintf '; partial\\n' > "$out/plate_1.gcode"\nexit ${exit}\n`);
  chmodSync(exe, 0o755);
  return { t, exe };
}

async function stubSlice(exit) {
  const { t, exe } = stubApp(exit);
  try {
    const z = new JSZip();
    const o = { createFolders: false, date: new Date(EPOCH_MS) };
    z.file("3D/3dmodel.model", "<model/>", o);
    z.file("Metadata/project_settings.config", JSON.stringify({ printer_settings_id: "M 0.4", print_settings_id: "P 0.24", filament_settings_id: ["Fil A", "Fil B"] }), o);
    const file = join(t, "in.3mf");
    writeFileSync(file, await z.generateAsync({ type: "uint8array" }));
    return await slice({ input: { file }, outDir: relative(process.cwd(), join(t, "out")), app: exe, datadirRoot: join(t, "dd"), timeLimitS: 30 });
  } finally {
    rmSync(t, { recursive: true, force: true });
  }
}

test("a slicer that exits non-zero is a failed run even when it left G-code", async () => {
  const r = await stubSlice(139);
  assert.equal(r.exitCode, 139);
  assert.notEqual(r.gcode, null, "the partial G-code is recorded");
  assert.equal(r.status, "failed");
  // every path the slicer receives is absolute, so none can read as an option
  const argv = r.command.slice(1);
  for (const opt of ["--datadir", "--outputdir"]) assert.ok(isAbsolute(argv[argv.indexOf(opt) + 1]), opt);
  assert.ok(isAbsolute(argv.at(-1)), "the 3MF path");
  const ok = await stubSlice(0);
  assert.equal(ok.status, "sliced");
});

test("slice refuses a time limit that is not a positive number", async () => {
  await assert.rejects(slice({ input: { file: "x.3mf" }, outDir: join(os.tmpdir(), "hbf-x"), timeLimitS: Number.NaN }), /positive number of seconds/);
  await assert.rejects(slice({ input: { file: "x.3mf" }, outDir: join(os.tmpdir(), "hbf-x"), timeLimitS: 0 }), /positive number of seconds/);
});

test("keys flex-pair preset two slices headless in Flash Studio", async (t) => {
  if (!appPresent()) {
    t.skip(`not run: no Flash Studio executable at ${DEFAULT_APP}`);
    return;
  }
  const out = mkdtempSync(join(os.tmpdir(), "hbf-slice-out-"));
  try {
    const r = await slice({
      input: { design: "reference/keys/flex-pair", preset: "two" },
      outDir: out,
      datadirRoot: DEFAULT_DATADIR_ROOT,
      filamentMap: { "Generic TPU @FF C5P": "Generic TPU-95A @FF C5P" },
      timeLimitS: 300,
    });
    const card = readFileSync(join(ROOT, "reference/keys/flex-pair/README.md"), "utf8").match(/file: out\/flex-pair-two\.3mf, (\d+) bytes, sha256 ([0-9a-f]{64})/);
    assert.ok(card, "the print card names the bytes");
    assert.equal(r.input3mf.bytes, Number(card[1]));
    assert.equal(r.input3mf.sha256, card[2]);
    assert.equal(r.exitCode, 0, `slicer exit ${r.exitCode} signal ${r.signal}`);
    assert.equal(r.status, "sliced");
    assert.ok(r.datadir.startsWith(DEFAULT_DATADIR_ROOT));
    const g = readFileSync(r.gcode.path, "utf8");
    const total = Number(g.match(/^; total layer number: (\d+)$/m)?.[1]);
    assert.equal((g.match(/^;LAYER_CHANGE$/gm) ?? []).length, total);
    for (const tool of ["T0", "T1", "T2", "T3"]) assert.ok(new RegExp(`^${tool}$`, "m").test(g), `${tool} is used`);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("killing slice.mjs kills the slicer it started", async () => {
  const t = mkdtempSync(join(os.tmpdir(), "hbf-slice-kill-"));
  try {
    mkdirSync(join(t, "MacOS"));
    profileTree(join(t, "Resources"));
    const exe = join(t, "MacOS", "stub");
    writeFileSync(exe, `#!/bin/sh\necho $$ > "${join(t, "pid")}"\nexec /bin/sleep 60\n`);
    chmodSync(exe, 0o755);
    const z = new JSZip();
    const o = { createFolders: false, date: new Date(EPOCH_MS) };
    z.file("3D/3dmodel.model", "<model/>", o);
    z.file("Metadata/project_settings.config", JSON.stringify({ printer_settings_id: "M 0.4", print_settings_id: "P 0.24", filament_settings_id: ["Fil A"] }), o);
    writeFileSync(join(t, "in.3mf"), await z.generateAsync({ type: "uint8array" }));
    const cli = join(ROOT, "tools/slice/slice.mjs");
    const node = spawn(process.execPath, [cli, join(t, "in.3mf"), join(t, "out"), "--app", exe, "--datadir-root", join(t, "dd"), "--time-limit", "120"], { stdio: "ignore" });
    const alive = (pid) => {
      try {
        process.kill(pid, 0);
        return true;
      } catch {
        return false;
      }
    };
    let pid;
    for (let i = 0; i < 200 && pid === undefined; i++) {
      await new Promise((r) => setTimeout(r, 50));
      if (existsSync(join(t, "pid"))) pid = Number(readFileSync(join(t, "pid"), "utf8"));
    }
    try {
      assert.ok(pid > 0 && alive(pid), "the stub slicer started");
      const closed = new Promise((r) => node.on("close", r));
      node.kill("SIGTERM");
      await closed;
      for (let i = 0; i < 40 && alive(pid); i++) await new Promise((r) => setTimeout(r, 50));
      assert.equal(alive(pid), false, `stub slicer ${pid} outlived slice.mjs`);
    } finally {
      if (pid > 0 && alive(pid)) process.kill(pid, "SIGKILL");
      if (node.exitCode === null && node.signalCode === null) node.kill("SIGKILL");
    }
  } finally {
    rmSync(t, { recursive: true, force: true });
  }
});

test("a 3MF past the D-166 entry limit is refused before anything is sliced", async () => {
  const z = new JSZip();
  const o = { createFolders: false, date: new Date(EPOCH_MS) };
  z.file("Metadata/project_settings.config", "{}", o);
  for (let i = 0; i < 4097; i++) z.file(`x/${i}`, "", o);
  const bytes = await z.generateAsync({ type: "uint8array" });
  await assert.rejects(completed3mf(bytes, {}), (e) => e.hbf?.code === "E_SCHEMA" && e.hbf?.path === "/zip/entries");
  const { t, exe } = stubApp(0);
  try {
    writeFileSync(join(t, "in.3mf"), bytes);
    await assert.rejects(slice({ input: { file: join(t, "in.3mf") }, outDir: join(t, "out"), app: exe, datadirRoot: join(t, "dd") }), (e) => e.hbf?.path === "/zip/entries");
    assert.equal(existsSync(join(t, "out", "gcode")), false, "the slicer never ran");
  } finally {
    rmSync(t, { recursive: true, force: true });
  }
});
