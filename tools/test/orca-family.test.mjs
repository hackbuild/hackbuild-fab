// tools/slice/orca-family.mjs, the Orca-family slicer driver. Every test
// here runs without a slicer installed: the table, the argument builder,
// probe on a path that does not exist, and preset resolution on a small
// resources tree made in the temp folder. No slice of orcaslicer,
// bambu-studio or snapmaker-orca runs here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { SLICERS, flatten, presetIndex, probe, sliceArgs } from "../slice/orca-family.mjs";
import * as slice from "../slice/slice.mjs";

test("the table holds the four Orca-family ids", () => {
  // typed here so a dropped or renamed id fails
  assert.deepEqual(Object.keys(SLICERS).sort(), ["bambu-studio", "flash-studio", "orcaslicer", "snapmaker-orca"]);
  for (const [id, e] of Object.entries(SLICERS)) {
    for (const k of ["app", "resources", "plist"]) assert.equal(typeof e[k], "string", `${id}.${k}`);
    assert.ok(e.versionRe instanceof RegExp, `${id}.versionRe`);
    assert.equal(typeof e.extraArgs, "function", `${id}.extraArgs`);
  }
  assert.equal(SLICERS["flash-studio"].versionRe.exec("Current Orca-Flashforge Version 2.3.2 build")?.[1], "2.3.2");
});

test("the args builder keeps the Flash Studio set and adds the Bambu Studio flags", () => {
  const o = { datadir: "/tmp/dd", outputDir: "/tmp/out", input: "/tmp/in.3mf", timeLimitS: 300 };
  const common = ["--datadir", "/tmp/dd", "--slice", "1", "--outputdir", "/tmp/out", "--debug", "3"];
  assert.deepEqual(sliceArgs("flash-studio", o), [...common, "/tmp/in.3mf"]);
  const bambu = sliceArgs("bambu-studio", o);
  assert.deepEqual(bambu, [...common, "--mstpp", "300", "/tmp/in.3mf"]);
  assert.equal(bambu.at(-1), "/tmp/in.3mf", "the 3MF stays last");
  assert.throws(() => sliceArgs("cura", o), /unknown slicer "cura"/);
});

test("probe of a missing app is available false and never throws", () => {
  const missing = join(os.tmpdir(), "hbf-orca-never-made", "MacOS", "x");
  for (const id of Object.keys(SLICERS)) {
    const p = probe(id, missing);
    assert.deepEqual(p, { id, available: false, path: missing, appVersion: "unknown", cliVersion: "unknown" });
  }
  // a directory where the executable should be is not an app either
  assert.equal(probe("orcaslicer", os.tmpdir()).available, false);
});

test("a BBL vendor tree resolves a machine preset by name", () => {
  const res = mkdtempSync(join(os.tmpdir(), "hbf-orca-res-"));
  try {
    const put = (rel, obj) => {
      const f = join(res, "profiles", rel);
      mkdirSync(join(f, ".."), { recursive: true });
      writeFileSync(f, JSON.stringify(obj));
    };
    put("Other/machine/o.json", { name: "Other 0.4", nozzle_diameter: ["0.6"] });
    put("BBL/machine/fdm_bbl_3dp_001_common.json", { name: "fdm_bbl_3dp_001_common", nozzle_diameter: ["0.4"], gcode_flavor: "marlin" });
    put("BBL/machine/a1.json", { name: "Bambu Lab A1 0.4 nozzle", inherits: "fdm_bbl_3dp_001_common", printable_height: "256" });
    put("BBL/process/p.json", { name: "0.20mm Standard @BBL A1", layer_height: "0.2" });
    const idx = presetIndex(res, "Bambu Lab A1 0.4 nozzle");
    assert.equal(idx.vendor, "BBL");
    const m = flatten(idx, "machine", "Bambu Lab A1 0.4 nozzle");
    assert.deepEqual(m.files, [join("profiles", "BBL", "machine", "a1.json"), join("profiles", "BBL", "machine", "fdm_bbl_3dp_001_common.json")]);
    assert.equal(m.values.printable_height, "256");
    assert.deepEqual(m.values.nozzle_diameter, ["0.4"]);
    assert.equal(flatten(idx, "process", "0.20mm Standard @BBL A1").values.layer_height, "0.2");
  } finally {
    rmSync(res, { recursive: true, force: true });
  }
});

test("slice.mjs re-exports the driver, one implementation of each", async () => {
  const driver = await import("../slice/orca-family.mjs");
  for (const name of ["presetIndex", "flatten", "completeProject", "completed3mf", "freshDatadir", "sliceArgs", "probe", "appPresent", "ownerProfileDirs"]) {
    assert.equal(slice[name], driver[name], name);
  }
  assert.equal(slice.DEFAULT_APP, SLICERS["flash-studio"].app);
});
