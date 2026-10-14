#!/usr/bin/env node
// Writes the 3MF fixtures of the artifact checks (M04-T01 step 8). The pass
// file is the TypeScript writer's export of tools/corpus/3mf/inputs/
// tetra-2part.json (two tetrahedra, two filaments) on preset
// ffc5p_20260819 at SOURCE_DATE_EPOCH 315532800. Each fail file is that
// export with the one change its check's origin names, rezipped with every
// entry dated at the same epoch:
//
//   CHK-3MF-01  Application PrusaSlicer-2.7.0 (challenge-coin: colours dropped)
//   CHK-3MF-02  filament_type collapsed to one element (COLLAR v4)
//   CHK-3MF-03  layer_height written into project_settings (STYLUS: crashed Flash Studio)
//   CHK-3MF-06  root components p:path="/3D/3dmodel.model" (CASK: self-reference, empty plate)
//   CHK-3MF-07  overhang_fan_threshold as JSON numbers [95, 95] (CHECKS.md 7.3 overhang-numeric)
//   CHK-3MF-10  adaptive_pressure_advance_model with each line break written as a backslash and an n (CASK Sep 5)
//   CHK-ART-01  both part names in model_settings set to tetra-undefined (TENON: five objects named tenon-undefined)
//   CHK-ART-07  the model Description set to https://example.com/tetra (COTTER: a card still pointing at a placeholder)
//
//   npx tsc -b && node packages/checks/test/fixtures/make-3mf.mjs
//
// Generated, never hand-edited; the tests read the committed bytes.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { register } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../..");
const EPOCH = 315532800;
// spec/ imports without extensions; core's resolve hook maps them, as tools/corpus/3mf/dump-input.mjs does.
register(pathToFileURL(path.join(ROOT, "core/dist/resolve-hook.js")).href);
const W = await import(pathToFileURL(path.join(ROOT, "packages/3mf/dist/index.js")).href);
const { default: JSZip } = await import(pathToFileURL(path.join(ROOT, "node_modules/jszip/lib/index.js")).href);

const inp = JSON.parse(readFileSync(path.join(ROOT, "tools/corpus/3mf/inputs/tetra-2part.json"), "utf8"));
const machines = JSON.parse(readFileSync(path.join(ROOT, "packages/profile/data/machines.json"), "utf8")).machines;
const preset = machines.find((m) => m.id === "ffc5p").presets[0];

const out = await W.write3mf({
  title: inp.title, chase: inp.chase, buildHash: inp.buildHash, sourceDateEpoch: EPOCH,
  slicer: preset.slicer, nozzleMm: preset.nozzle, template: W.DEFAULT_TEMPLATE, materials: W.DEFAULT_MATERIALS,
  filaments: inp.filaments,
  objects: inp.objects.map((o) => ({
    name: o.name, position: o.position,
    bodies: o.bodies.map((b) => ({ name: b.name, slot: b.slot, mesh: { positions: Float64Array.from(b.positions), triangles: Uint32Array.from(b.triangles) } })),
  })),
});

async function rezip(bytes, edit) {
  const zip = await JSZip.loadAsync(bytes);
  const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir).sort();
  const next = new JSZip();
  const date = new Date(EPOCH * 1000);
  for (const n of names) {
    const raw = await zip.files[n].async("string");
    next.file(n, edit(n, raw), { date, createFolders: false });
  }
  return next.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 9 } });
}

const settings = (fn) => (n, raw) => {
  if (n !== "Metadata/project_settings.config") return raw;
  const ps = JSON.parse(raw);
  fn(ps);
  return JSON.stringify(ps, null, 4);
};

const FAILS = {
  "CHK-3MF-01": (n, raw) => (n === "3D/3dmodel.model" ? raw.replace(/(<metadata name="Application">)[^<]*/, "$1PrusaSlicer-2.7.0") : raw),
  "CHK-3MF-02": settings((ps) => { ps.filament_type = ps.filament_type.slice(0, 1); }),
  "CHK-3MF-03": settings((ps) => { ps.layer_height = "0.24"; }),
  "CHK-3MF-06": (n, raw) => (n === "3D/3dmodel.model" ? raw.replace(/<component (?![^>]*p:path)/g, '<component p:path="/3D/3dmodel.model" ') : raw),
  "CHK-3MF-07": settings((ps) => { ps.overhang_fan_threshold = ps.overhang_fan_threshold.map(() => 95); }),
  "CHK-3MF-10": settings((ps) => { ps.adaptive_pressure_advance_model = ps.adaptive_pressure_advance_model.map((v) => v.replace(/\n/g, "\\n")); }),
  "CHK-ART-01": (n, raw) => (n === "Metadata/model_settings.config" ? raw.replace(/key="name" value="(left|right)"/g, 'key="name" value="tetra-undefined"') : raw),
  "CHK-ART-07": (n, raw) => (n === "3D/3dmodel.model" ? raw.replace(/<metadata name="Description">[^<]*/, '<metadata name="Description">https://example.com/tetra') : raw),
};

for (const [id, edit] of Object.entries(FAILS)) {
  const dir = path.join(HERE, id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "pass.3mf"), out.bytes);
  const bad = await rezip(out.bytes, edit);
  if (Buffer.compare(Buffer.from(bad), Buffer.from(await rezip(out.bytes, (_n, raw) => raw))) === 0) throw new Error(`${id}: the edit changed nothing`);
  writeFileSync(path.join(dir, "fail.3mf"), bad);
  console.log(`${id} pass ${out.bytes.length} bytes, fail ${bad.length} bytes`);
}
