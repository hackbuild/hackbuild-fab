#!/usr/bin/env node
// M00-T14 (D-056, D-175): the hashes one determinism leg compares. Builds
// every reference under reference/ at its defaults, the M00-T05 route
// fixtures and the ring set, and the 3MF corpus inputs through the
// TypeScript writer, then prints one JSON object of id to hash, ids sorted.
//
// Id prefixes:
//   mesh:<reference>#<body>      meshHash of each body (required equal)
//   build:<reference>            buildHash (required equal); a board reference
//                                gives its board build hash through hbf parity
//   artifact:<reference>#3mf     artifactHash of the export (required equal)
//   png:<reference>#assembled    sha256 of the view.render sheet PNG (required equal)
//   route:..., ring:...          tools/determinism/routes.mjs (required equal)
//   artifact:corpus/<input>#js   artifactHash of a corpus input (required equal)
//   query:<reference>#<golden>   sha256 of a queries.json constraints.query result,
//                                the bytes parity writes (required equal, M01-T11)
//   fits:<reference>             sha256 of the `hbf fits.table --json` stdout of a
//                                reference whose build emits FITS rows (required equal)
//   layout:<scene>#<mode>        layoutHash of `hbf nest.pack --scene` (required equal, M07-T15)
//   end:<program>                endHash of `hbf motion.run --program` (required equal, M07-T15)
//   plan:<program>               sha256 of the RFC 8785 JSON of the PlanResult motion.run returns
//                                for a planner program (required equal, M07-T15)
//   zip:...                      sha256 of zip bytes; recorded, never required
//
// --out <dir> also writes meshHashes.json (mesh, route, ring, png) and
// artifactHashes.json (build, artifact, query, fits, layout, end, plan, zip) there. The build runs under
// SOURCE_DATE_EPOCH, 1791072000 when the environment sets none.
// Run `npx tsc -b` first: the packages load from their dist builds.

import { register } from "node:module";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const EPOCH = 1791072000;
process.env.SOURCE_DATE_EPOCH ??= String(EPOCH);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const at = (...p) => path.join(ROOT, ...p);
register(pathToFileURL(at("core", "dist", "resolve-hook.js")).href, import.meta.url);

const sha = (b) => createHash("sha256").update(b).digest("hex");

/** reference/<area>/<id>/ directories holding chase.ts, relative to the root, sorted. */
export function references() {
  const base = at("reference");
  const out = [];
  for (const area of readdirSync(base).sort()) {
    const ad = path.join(base, area);
    if (!statSync(ad).isDirectory()) continue;
    for (const id of readdirSync(ad).sort()) {
      if (existsSync(path.join(ad, id, "chase.ts"))) out.push(`reference/${area}/${id}`);
    }
  }
  return out;
}

/**
 * The references whose chase is a board (core isBoardDesign, M08). A board
 * build has no bodies to mesh-hash; `hbf parity` holds its goldens
 * (build.json, artifacts.json, and report.json and reparse.json where
 * checks run).
 */
export async function boardReferences() {
  const { loadDesign } = await import(pathToFileURL(at("core", "dist", "commands", "build.js")).href);
  const { isBoardDesign } = await import(pathToFileURL(at("core", "dist", "board.js")).href);
  const out = new Set();
  for (const ref of references()) if (isBoardDesign(await loadDesign(ref, ROOT))) out.add(ref);
  return out;
}

async function referenceHashes(out) {
  const { loadDesign, resolveParams, buildPart, declares3mf, export3mf } = await import(pathToFileURL(at("core", "dist", "commands", "build.js")).href);
  const { isBoardDesign } = await import(pathToFileURL(at("core", "dist", "board.js")).href);
  const { runParity } = await import(pathToFileURL(at("core", "dist", "commands", "parity.js")).href);
  const { slotViews } = await import(pathToFileURL(at("core", "dist", "load-build.js")).href);
  const { renderSheet, parseColour } = await import(pathToFileURL(at("core", "dist", "render", "raster.js")).href);
  const { encodePng } = await import(pathToFileURL(at("core", "dist", "render", "png.js")).href);
  const refs = references();
  if (refs.length === 0) throw new Error("no reference with chase.ts under reference/");
  for (const ref of refs) {
    const design = await loadDesign(ref, ROOT);
    // A board builds through its generator at the epoch its goldens pin; the build hash is the leg's id.
    if (isBoardDesign(design)) {
      out[`build:${ref}`] = (await runParity({ reference: ref }, ROOT)).buildHash;
      continue;
    }
    const built = await buildPart(design, resolveParams(design.chase, undefined, undefined));
    out[`build:${ref}`] = built.part.buildHash;
    for (const b of built.part.bodies) out[`mesh:${ref}#${b.id}`] = b.mesh.hash;
    // A chase that declares no 3mf export (capricate-touch, M05-T12) has no package to hash.
    if (declares3mf(design)) {
      const pkg = await export3mf(built);
      out[`artifact:${ref}#3mf`] = pkg.artifactHash;
      out[`zip:${ref}#3mf`] = sha(pkg.bytes);
    }
    // The view.render assembled sheet at its default 1024 px square, from the built body meshes.
    const colour = new Map(slotViews(built).map((s) => [s.slot, parseColour(s.colour)]));
    const meshes = built.meshed.bodies.map((b) => ({ positions: b.mesh.positions, triangles: b.mesh.triangles, colour: colour.get(b.slot) ?? [128, 128, 128] }));
    out[`png:${ref}#assembled`] = sha(encodePng(1024, 1024, renderSheet(meshes, 1024, 1024)));
  }
}

/**
 * M01-T11 step 2 (D-056): equal query JSON bytes across legs. Query results
 * come from the parity rerun of queries.json, so a query id hashes the bytes
 * its golden holds; fits.table runs through the CLI entry with --json.
 */
export async function queryHashes(out) {
  const { queryGoldens } = await import(pathToFileURL(at("core", "dist", "commands", "parity.js")).href);
  const { main } = await import(pathToFileURL(at("core", "dist", "main.js")).href);
  const { canonicalize, sha256Hex } = await import("@hackbuild/spec");
  for (const ref of references()) {
    for (const q of await queryGoldens(at(ref), ROOT)) out[`query:${ref}#${path.basename(q.file)}`] = sha256Hex(`${canonicalize(q.fresh)}\n`);
    const lines = [];
    await main(["fits.table", ref, "--json"], ROOT, { out: (s) => lines.push(s), err: (s) => lines.push(s) });
    const text = `${lines.join("\n")}\n`;
    // A reference whose build emits no FITS rows answers E_SCHEMA and gets no fits id.
    if (JSON.parse(text).errors.length === 0) out[`fits:${ref}`] = sha256Hex(text);
  }
}

/**
 * M07-T15 step 2 (D-056): every M07 reference gives one layoutHash, endHash
 * and plan JSON bytes on every leg. Each runs through the CLI entry with
 * --json, as a person or a model calls it, so the hash is of what the
 * command returns. Scenes come from nest's one scene list (SCENES); a
 * refused scene (severed-deck) has no layout and gets no id.
 */
export const NEST_RUNS = [
  ["slug-sheets", "legacy-shelf"],
  ["slug-sheets", "fill"],
  ["slug-sheets-complete", "fill"],
  ["ogee16-r16p-plates", "knobs"],
  ["ogee16-r16p-plates", "servos"],
];
/** Motion programs with their CLI args; the planner args are the records' (packages/motion/records). */
export const MOTION_RUNS = [
  ["ogee.checker", []],
  ["ogee.clear", []],
  ["ogee.all", []],
  ["stipple.checker", []],
  ["stipple.clear", []],
  ["slug.vend", ["--k", "1000"]],
  ["detent.square", ["--side", "400", "--sample", "10"]],
  ["washer.square", ["--side", "60"]],
];

export async function nestMotionHashes(out) {
  const { main } = await import(pathToFileURL(at("core", "dist", "main.js")).href);
  const { canonicalize, sha256Hex } = await import("@hackbuild/spec");
  const cli = async (argv) => {
    const lines = [];
    const code = await main([...argv, "--json"], ROOT, { out: (s) => lines.push(s), err: (s) => lines.push(s) });
    const r = JSON.parse(lines.join("\n"));
    if (code !== 0 || r.errors.length > 0) throw new Error(`hbf ${argv.join(" ")}: exit ${code} ${JSON.stringify(r.errors)}`);
    return r.result;
  };
  for (const [scene, mode] of NEST_RUNS) {
    const plate = scene === "ogee16-r16p-plates";
    const r = await cli(["nest.pack", "--scene", scene, ...(plate ? ["--params", JSON.stringify({ drive: mode })] : ["--mode", mode])]);
    out[`layout:${scene}#${mode}`] = r.layout.layoutHash;
  }
  for (const [program, args] of MOTION_RUNS) {
    const r = await cli(["motion.run", "--program", program, ...args]);
    if (r.endHash !== undefined) out[`end:${program}`] = r.endHash;
    else out[`plan:${program}`] = sha256Hex(canonicalize(r));
  }
}

async function routeFixtureHashes(out) {
  const mesh = await import(pathToFileURL(at("packages", "mesh", "dist", "index.js")).href);
  const { loadGeom, circleRing } = await import(pathToFileURL(at("packages", "geom", "dist", "index.js")).href);
  const { routeHashes } = await import("./routes.mjs");
  Object.assign(out, routeHashes({
    mesh,
    geom: await loadGeom(),
    circleRing,
    bossPrism: JSON.parse(readFileSync(at("tools", "corpus", "mesh", "boss-prism.json"), "utf8")),
    revolveCalls: readFileSync(at("tools", "corpus", "mesh", "tenon-revolve-calls.jsonl"), "utf8"),
  }));
  if (mesh.liveCount() !== 0) throw new Error(`live wasm objects after the route fixtures: ${mesh.liveCount()} (computed), want 0`);
}

/** The corpus inputs of tools/corpus/3mf/inputs, sorted. */
export function corpusInputs() {
  return readdirSync(at("tools", "corpus", "3mf", "inputs")).filter((f) => f.endsWith(".json")).sort();
}

/** One corpus input through the TypeScript writer on the machine preset it names. */
export async function buildCorpusInput(file, epoch) {
  const { build, configOf, DEFAULT_TEMPLATE, DEFAULT_MATERIALS } = await import(pathToFileURL(at("packages", "3mf", "dist", "index.js")).href);
  const inp = JSON.parse(readFileSync(at("tools", "corpus", "3mf", "inputs", file), "utf8"));
  const machines = JSON.parse(readFileSync(at("packages", "profile", "data", "machines.json"), "utf8")).machines;
  const preset = machines.find((m) => m.id === inp.machine).presets.find((p) => p.id === inp.preset);
  const built = build(configOf({
    title: inp.title, chase: inp.chase, buildHash: inp.buildHash, sourceDateEpoch: epoch,
    ...(inp.license === undefined ? {} : { license: inp.license }),
    ...(inp.designer === undefined ? {} : { designer: inp.designer }),
    slicer: preset.slicer, nozzleMm: preset.nozzle, template: DEFAULT_TEMPLATE, materials: DEFAULT_MATERIALS,
    filaments: inp.filaments,
    ...(inp.adjacency === undefined ? {} : { adjacency: inp.adjacency }),
    objects: inp.objects.map((o) => ({
      name: o.name, position: o.position,
      bodies: o.bodies.map((b) => ({
        name: b.name, slot: b.slot, mesh: { positions: b.positions, triangles: b.triangles },
        ...(b.body === undefined ? {} : { body: b.body }),
        ...(b.role === undefined ? {} : { role: b.role }),
        ...(b.widthMm === undefined ? {} : { widthMm: b.widthMm }),
      })),
    })),
  }));
  if (!built.ok) throw new Error(`${file}: export completeness failed ${JSON.stringify(built.completeness)}`);
  return { artifactHash: built.artifactHash, bytes: await built.zip() };
}

async function corpusHashes(out) {
  for (const file of corpusInputs()) {
    const name = file.replace(/\.json$/, "");
    const b = await buildCorpusInput(file, Number(process.env.SOURCE_DATE_EPOCH));
    out[`artifact:corpus/${name}#js`] = b.artifactHash;
    out[`zip:corpus/${name}#js`] = sha(b.bytes);
  }
}

const sorted = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
const MESH_PREFIXES = ["mesh:", "route:", "ring:", "png:"];

async function main(argv) {
  const i = argv.indexOf("--out");
  const outDir = i >= 0 ? argv[i + 1] : undefined;
  if (i >= 0 && outDir === undefined) {
    process.stderr.write("usage: hashes.mjs [--out <dir>]\n");
    return 2;
  }
  const all = {};
  await referenceHashes(all);
  await queryHashes(all);
  await nestMotionHashes(all);
  await routeFixtureHashes(all);
  await corpusHashes(all);
  const result = sorted(all);
  if (outDir !== undefined) {
    mkdirSync(outDir, { recursive: true });
    const pick = (keep) => Object.fromEntries(Object.entries(result).filter(([k]) => keep(k)));
    const isMesh = (k) => MESH_PREFIXES.some((p) => k.startsWith(p));
    writeFileSync(path.join(outDir, "meshHashes.json"), `${JSON.stringify(pick(isMesh), null, 2)}\n`);
    writeFileSync(path.join(outDir, "artifactHashes.json"), `${JSON.stringify(pick((k) => !isMesh(k)), null, 2)}\n`);
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return 0;
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
