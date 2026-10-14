// CI-01: buildCorpusInput feeds the writer-bytes and hashes legs. It must hand
// the TypeScript writer every field the Python writer reads from a corpus
// input (adjacency, and per body: body, role, widthMm), the same shape the JS
// driver in tools/py/test/test_agreement.py builds, or the two writers'
// artifactHash differ on flex-pair-two.json. Run `npx tsc -b` first.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildCorpusInput, corpusInputs } from "../determinism/hashes.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const EPOCH = 1791072000;
const { build, configOf, DEFAULT_TEMPLATE, DEFAULT_MATERIALS } = await import(pathToFileURL(path.join(ROOT, "packages", "3mf", "dist", "index.js")).href);
const machines = JSON.parse(readFileSync(path.join(ROOT, "packages", "profile", "data", "machines.json"), "utf8")).machines;

/** The agreement driver's build, field for field. */
function agreementHash(file) {
  const inp = JSON.parse(readFileSync(path.join(ROOT, "tools", "corpus", "3mf", "inputs", file), "utf8"));
  const preset = machines.find((m) => m.id === inp.machine).presets.find((p) => p.id === inp.preset);
  const out = build(configOf({
    title: inp.title, chase: inp.chase, buildHash: inp.buildHash, sourceDateEpoch: EPOCH,
    ...(inp.license === undefined ? {} : { license: inp.license }),
    ...(inp.designer === undefined ? {} : { designer: inp.designer }),
    slicer: preset.slicer, nozzleMm: preset.nozzle, template: DEFAULT_TEMPLATE, materials: DEFAULT_MATERIALS,
    filaments: inp.filaments,
    ...(inp.adjacency === undefined ? {} : { adjacency: inp.adjacency }),
    objects: inp.objects.map((o) => ({ name: o.name, position: o.position,
      bodies: o.bodies.map((b) => ({ name: b.name, slot: b.slot, mesh: { positions: b.positions, triangles: b.triangles },
        ...(b.body === undefined ? {} : { body: b.body }), ...(b.role === undefined ? {} : { role: b.role }),
        ...(b.widthMm === undefined ? {} : { widthMm: b.widthMm }) })) })),
  }));
  assert.ok(out.ok, `${file}: export completeness failed`);
  return out.artifactHash;
}

test("flex-pair-two.json carries adjacency and per-body role fields", () => {
  const inp = JSON.parse(readFileSync(path.join(ROOT, "tools", "corpus", "3mf", "inputs", "flex-pair-two.json"), "utf8"));
  assert.ok(Array.isArray(inp.adjacency) && inp.adjacency.length > 0);
  const bodies = inp.objects.flatMap((o) => o.bodies);
  assert.ok(bodies.some((b) => b.role !== undefined && b.body !== undefined && b.widthMm !== undefined));
});

for (const file of corpusInputs()) {
  test(`buildCorpusInput ${file} has the agreement driver's artifactHash`, async () => {
    const b = await buildCorpusInput(file, EPOCH);
    assert.equal(b.artifactHash, agreementHash(file));
  });
}
