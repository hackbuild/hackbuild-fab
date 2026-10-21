// Profile correctness checks on a virtual slice (PLAN.md 3.5 row 1): the
// bed type, every material slot resolved to a bundled preset, and no
// foreign tool regions in the analyzed G-code. Pure: every input is an
// object slice.mjs already holds, so the tests run on fixtures with no
// slicer installed. Every row is computed from slicer config or G-code,
// never measured from a part.

/**
 * The per-filament plate temperature key for each Orca plate name. Key
 * names: Flash Studio 1.7.14 bundle, Contents/Resources/profiles/Flashforge/
 * filament/fdm_filament_common.json lines 6 to 29 (cool, eng, hot,
 * textured), Flashforge/filament/Flashforge PETG Pro @FF C5.json for
 * textured_cool_plate_temp and OrcaFilamentLibrary/filament/base/
 * fdm_filament_abs.json for supertack_plate_temp (grep, 2026-10-20).
 * Plate names: D-226 and the strings in the Flash Studio executable. The
 * name to key pairing follows the OrcaSlicer bed type enum (vendor source,
 * not read here, so inferred); tools/py/orca3mf.py line 734 writes the
 * same six keys.
 */
export const PLATE_TEMP_KEYS = Object.freeze({
  "Cool Plate": "cool_plate_temp",
  "Engineering Plate": "eng_plate_temp",
  "High Temp Plate": "hot_plate_temp",
  "Textured PEI Plate": "textured_plate_temp",
  "Textured Cool Plate": "textured_cool_plate_temp",
  "Supertack Plate": "supertack_plate_temp",
});

/**
 * A foreign region this large or larger fails SLC-FOREIGN; smaller ones
 * warn. 1.0 mm2, inferred: a grading choice with no coupon behind it. The
 * TOGGLE tilt-stick bridge of 1.248 mm2 (computed) sits above it, so that
 * slice fails until the owner accepts the bridge.
 */
export const FOREIGN_FAIL_MM2 = 1.0;

const row = (id, verdict, value, reason) => ({ id, verdict, value, qualifier: "computed", reason });

const asList = (v) => (Array.isArray(v) ? v : v === undefined || v === null ? [] : [v]);

function bedCheck(completed) {
  const bed = typeof completed.curr_bed_type === "string" ? completed.curr_bed_type : "";
  if (bed === "") return row("SLC-BED", "fail", null, "curr_bed_type unset in the completed config; the slicer falls back to its default plate. write it from the machine preset slicer.bedType");
  const multi = String(completed.support_multi_bed_types ?? "") === "1";
  const def = typeof completed.default_bed_type === "string" ? completed.default_bed_type : "";
  if (!multi && def !== bed) {
    return row("SLC-BED", "fail", bed, `bed ${bed} not allowed by the machine preset: support_multi_bed_types is not 1 and default_bed_type is ${def === "" ? "empty" : def}`);
  }
  const key = PLATE_TEMP_KEYS[bed];
  if (key === undefined) return row("SLC-BED", "fail", bed, `bed ${bed} is no known plate; one of ${Object.keys(PLATE_TEMP_KEYS).join(", ")}`);
  const bad = [];
  for (const k of [key, `${key}_initial_layer`]) {
    const temps = asList(completed[k]);
    const n = Math.max(temps.length, asList(completed.filament_settings_id).length);
    for (let i = 0; i < n; i++) {
      const t = Number(temps[i]);
      if (!(Number.isFinite(t) && t > 0)) bad.push(`slot ${i + 1} ${k} ${temps[i] ?? "missing"}`);
    }
  }
  if (bad.length > 0) return row("SLC-BED", "fail", bed, `plate temperature zero or missing for ${bed}: ${bad.join("; ")}`);
  return row("SLC-BED", "pass", bed, `bed ${bed} allowed (${multi ? "support_multi_bed_types 1" : "default_bed_type"}); every slot has ${key} and ${key}_initial_layer over 0`);
}

function slotsCheck(completed, presets, substitutions, slots) {
  const names = asList(completed.filament_settings_id);
  const chain = asList(presets?.filaments);
  const want = slots === undefined || slots === null ? names.length : slots.length;
  const value = { slots: want, named: names.length };
  const unresolved = [];
  for (let i = 0; i < want; i++) {
    const n = names[i];
    if (typeof n !== "string" || n === "") unresolved.push(`slot ${i + 1} names no filament preset`);
    else if (!Array.isArray(chain[i]) || chain[i].length === 0) unresolved.push(`slot ${i + 1} "${n}" resolved to no bundled preset`);
  }
  if (names.length > want) unresolved.push(`${names.length} filament presets for ${want} material slots`);
  if (unresolved.length > 0) return row("SLC-SLOTS", "fail", value, `${unresolved.join("; ")}; name a bundled preset or pass --filament-map`);
  const subs = asList(substitutions);
  if (subs.length > 0) {
    return row("SLC-SLOTS", "warn", { ...value, substitutions: subs }, `sliced with a stand-in preset: ${subs.map((s) => `slot ${s.slot} named "${s.named}", used "${s.used}"`).join("; ")}; bundle the named preset or accept the stand-in`);
  }
  return row("SLC-SLOTS", "pass", value, `${want} of ${want} material slots resolved by flatten, no substitution`);
}

function foreignCheck(analysis) {
  if (analysis === undefined || analysis === null) return row("SLC-FOREIGN", "not run", null, "no analysis json; run tools/py/gcode/analyze.py and pass its slice.json with --analysis");
  const rows = analysis.a_missing?.foreign;
  if (!Array.isArray(rows)) return row("SLC-FOREIGN", "fail", null, "analysis json has no a_missing.foreign list; rerun tools/py/gcode/analyze.py");
  const big = rows.filter((r) => Number(r.area_mm2) >= FOREIGN_FAIL_MM2);
  const max = rows.reduce((m, r) => Math.max(m, Number(r.area_mm2) || 0), 0);
  const value = { regions: rows.length, failing: big.length, largest_mm2: max };
  const where = (r) => `${r.body} layer ${r.layer} ${r.area_mm2} mm2 (${r.kind}, by ${asList(r.deposited_by).join(" ")})`;
  if (big.length > 0) return row("SLC-FOREIGN", "fail", value, `foreign tool region ${big.map(where).join("; ")}, legal under ${FOREIGN_FAIL_MM2} mm2 (inferred); move the body edge or accept the region`);
  if (rows.length > 0) return row("SLC-FOREIGN", "warn", value, `${rows.length} foreign tool regions under ${FOREIGN_FAIL_MM2} mm2 (inferred), largest ${max} mm2`);
  return row("SLC-FOREIGN", "pass", value, "no foreign tool region");
}

/**
 * The profile check rows of one virtual slice. completed is the project
 * config the slicer sliced (completeProject().config); presets its preset
 * file chains; substitutions the --filament-map stand-ins; analysis the
 * analyze.py slice.json or undefined; slots the chase material slots, or
 * undefined for a bare 3MF, where the 3MF's own filament list counts.
 */
export function profileChecks({ completed, presets, substitutions = [], analysis, slots }) {
  return [bedCheck(completed), slotsCheck(completed, presets, substitutions, slots), foreignCheck(analysis)];
}

/** True when any row fails. */
export const anyFail = (rows) => rows.some((r) => r.verdict === "fail");
