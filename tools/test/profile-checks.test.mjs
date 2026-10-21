// tools/slice/profile-checks.mjs on fixture objects only: no slicer, no
// G-code. One case per branch of SLC-BED, SLC-SLOTS and SLC-FOREIGN. The
// fixtures copy the shapes slice.mjs passes: completeProject().config
// (per-slot filament keys as string lists), its presets file chains and
// substitutions, and analyze.py's a_missing.foreign rows.
import { test } from "node:test";
import assert from "node:assert/strict";
import { FOREIGN_FAIL_MM2, profileChecks } from "../slice/profile-checks.mjs";

const chain = (n) => [`profiles/Flashforge/filament/${n}.json`, "profiles/Flashforge/filament/fdm_filament_common.json"];

function clean() {
  return {
    completed: {
      curr_bed_type: "Textured PEI Plate",
      support_multi_bed_types: "1",
      default_bed_type: "",
      filament_settings_id: ["Generic PETG @FF C5P", "Generic PLA @FF C5P"],
      textured_plate_temp: ["70", "55"],
      textured_plate_temp_initial_layer: ["70", "55"],
    },
    presets: { machine: ["m.json"], process: ["p.json"], filaments: [chain("petg"), chain("pla")] },
    substitutions: [],
    analysis: { a_missing: { foreign: [] } },
    slots: [1, 2],
  };
}

const byId = (rows, id) => rows.find((r) => r.id === id);

test("all clean: three rows pass, every one computed", () => {
  const rows = profileChecks(clean());
  assert.deepEqual(rows.map((r) => [r.id, r.verdict]), [["SLC-BED", "pass"], ["SLC-SLOTS", "pass"], ["SLC-FOREIGN", "pass"]]);
  for (const r of rows) assert.equal(r.qualifier, "computed");
  assert.equal(byId(rows, "SLC-BED").value, "Textured PEI Plate");
});

test("bed unset fails SLC-BED", () => {
  const f = clean();
  delete f.completed.curr_bed_type;
  const r = byId(profileChecks(f), "SLC-BED");
  assert.equal(r.verdict, "fail");
  assert.match(r.reason, /curr_bed_type unset/);
});

test("a bed the machine preset does not allow fails SLC-BED", () => {
  const f = clean();
  f.completed.support_multi_bed_types = "0";
  f.completed.default_bed_type = "Cool Plate";
  const r = byId(profileChecks(f), "SLC-BED");
  assert.equal(r.verdict, "fail");
  assert.match(r.reason, /not allowed/);
  // the single plate the preset names is allowed
  f.completed.curr_bed_type = "Cool Plate";
  f.completed.cool_plate_temp = ["60", "60"];
  f.completed.cool_plate_temp_initial_layer = ["60", "60"];
  assert.equal(byId(profileChecks(f), "SLC-BED").verdict, "pass");
});

test("a zero plate temperature in one slot fails SLC-BED", () => {
  const f = clean();
  f.completed.textured_plate_temp = ["70", "0"];
  const r = byId(profileChecks(f), "SLC-BED");
  assert.equal(r.verdict, "fail");
  assert.match(r.reason, /slot 2 textured_plate_temp 0/);
});

test("a substitution warns SLC-SLOTS with the named and used presets", () => {
  const f = clean();
  f.substitutions = [{ slot: 2, named: "Hackbuild cPLA", used: "Generic PLA @FF C5P" }];
  const r = byId(profileChecks(f), "SLC-SLOTS");
  assert.equal(r.verdict, "warn");
  assert.match(r.reason, /slot 2 named "Hackbuild cPLA", used "Generic PLA @FF C5P"/);
});

test("an unresolved slot fails SLC-SLOTS", () => {
  const f = clean();
  f.presets.filaments = [chain("petg"), []];
  assert.equal(byId(profileChecks(f), "SLC-SLOTS").verdict, "fail");
  // a chase slot the 3MF names no filament for fails too
  const g = clean();
  g.slots = [1, 2, 3];
  const r = byId(profileChecks(g), "SLC-SLOTS");
  assert.equal(r.verdict, "fail");
  assert.match(r.reason, /slot 3 names no filament preset/);
});

const foreign = (area) => ({ layer: 40, z_mid: 8.1, body: "stick", tool: "T2", kind: "replaced", deposited_by: ["T0"], roles: {}, area_mm2: area, width_mm: 0.8, at: [0, 0] });

test("a foreign region of exactly 1.0 mm2 fails SLC-FOREIGN", () => {
  assert.equal(FOREIGN_FAIL_MM2, 1.0);
  const f = clean();
  f.analysis = { a_missing: { foreign: [foreign(1.0)] } };
  const r = byId(profileChecks(f), "SLC-FOREIGN");
  assert.equal(r.verdict, "fail");
  assert.deepEqual(r.value, { regions: 1, failing: 1, largest_mm2: 1.0 });
});

test("a foreign region of 0.5 mm2 warns SLC-FOREIGN", () => {
  const f = clean();
  f.analysis = { a_missing: { foreign: [foreign(0.5)] } };
  assert.equal(byId(profileChecks(f), "SLC-FOREIGN").verdict, "warn");
});

test("no analysis leaves SLC-FOREIGN not run", () => {
  const f = clean();
  f.analysis = undefined;
  assert.equal(byId(profileChecks(f), "SLC-FOREIGN").verdict, "not run");
});
