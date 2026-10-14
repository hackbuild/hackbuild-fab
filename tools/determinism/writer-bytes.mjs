#!/usr/bin/env node
// M00-T14 step 3 (D-052, C-08): each writer reproduces its own bytes. Every
// input under tools/corpus/3mf/inputs/ is built twice by the TypeScript
// writer and twice by the Python writer, in a fresh process under TZ=UTC and
// again under TZ=America/Phoenix, with one SOURCE_DATE_EPOCH. The four .3mf
// sha256 of one writer must be equal; it prints each pair. Byte identity
// across the two writers is outside the requirement and printed as
// recorded; their artifactHash must agree (M00-T08).
//
// The Python side runs `uv run --project tools/py`; without uv on PATH it
// prints "py not run" and the run fails under CI, where uv is installed.
// --out <file> writes the zip sha256 and artifactHash per writer and input
// for the cross-leg record. Run `npx tsc -b` first.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const ZONES = ["UTC", "America/Phoenix"];
const DEFAULT_EPOCH = 1791072000;

const sha = (b) => createHash("sha256").update(b).digest("hex");

/** Child: build every corpus input twice in this process, print {input: {zips, artifactHash}}. */
async function child() {
  const { buildCorpusInput, corpusInputs } = await import("./hashes.mjs");
  const epoch = Number(process.env.SOURCE_DATE_EPOCH);
  const out = {};
  for (const file of corpusInputs()) {
    const a = await buildCorpusInput(file, epoch);
    const b = await buildCorpusInput(file, epoch);
    if (a.artifactHash !== b.artifactHash) throw new Error(`${file}: artifactHash moved between two builds in one process`);
    out[file] = { zips: [sha(a.bytes), sha(b.bytes)], artifactHash: a.artifactHash };
  }
  process.stdout.write(JSON.stringify(out));
}

const PY = String.raw`
import hashlib, json, os, sys
repo = sys.argv[1]
sys.path.insert(0, os.path.join(repo, "tools/py"))
import orca3mf
epoch = int(os.environ["SOURCE_DATE_EPOCH"])
inputs = os.path.join(repo, "tools/corpus/3mf/inputs")
out = {}
for name in sorted(f for f in os.listdir(inputs) if f.endswith(".json")):
    zips = []
    for _ in range(2):
        with open(os.path.join(inputs, name), encoding="utf-8") as fh:
            w = orca3mf.from_input(json.load(fh), source_date_epoch=epoch)
        zips.append(hashlib.sha256(w.zip_bytes()).hexdigest())
    out[name] = {"zips": zips, "artifactHash": w.artifact_hash()}
sys.stdout.write(json.dumps(out))
`;

function hasUv() {
  return spawnSync("uv", ["--version"], { encoding: "utf8" }).status === 0;
}

function run(cmd, args, tz, epoch) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8", env: { ...process.env, TZ: tz, SOURCE_DATE_EPOCH: String(epoch) }, maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`${cmd} ${args[0]} under TZ=${tz} exited ${r.status}\n${r.stderr}`);
  return JSON.parse(r.stdout);
}

const WRITERS = {
  js: (tz, epoch) => run(process.execPath, [fileURLToPath(import.meta.url), "--child"], tz, epoch),
  py: (tz, epoch) => run("uv", ["run", "--quiet", "--project", path.join(ROOT, "tools", "py"), "python", "-c", PY, ROOT], tz, epoch),
};

function main(argv) {
  const i = argv.indexOf("--out");
  const outFile = i >= 0 ? argv[i + 1] : undefined;
  const epoch = Number(process.env.SOURCE_DATE_EPOCH ?? DEFAULT_EPOCH);
  if (!Number.isInteger(epoch) || epoch < 0) {
    process.stderr.write(`SOURCE_DATE_EPOCH ${process.env.SOURCE_DATE_EPOCH}, legal a whole number of seconds 0 or more\n`);
    return 2;
  }
  process.stdout.write(`SOURCE_DATE_EPOCH ${epoch}${process.env.SOURCE_DATE_EPOCH === undefined ? " (default)" : ""}\n`);
  let failed = 0;
  const record = {};
  const perWriter = {};
  for (const [writer, build] of Object.entries(WRITERS)) {
    if (writer === "py" && !hasUv()) {
      process.stdout.write("py not run: uv not on PATH; install with brew install uv\n");
      if (process.env.CI !== undefined) failed += 1;
      continue;
    }
    const byZone = Object.fromEntries(ZONES.map((tz) => [tz, build(tz, epoch)]));
    perWriter[writer] = byZone[ZONES[0]];
    for (const input of Object.keys(byZone[ZONES[0]]).sort()) {
      const shas = ZONES.flatMap((tz) => byZone[tz][input].zips);
      for (const tz of ZONES) {
        const [a, b] = byZone[tz][input].zips;
        process.stdout.write(`${writer} ${input} TZ=${tz} ${a} ${b} ${a === b ? "equal" : "differ"}\n`);
      }
      const equal = shas.every((s) => s === shas[0]);
      const ah = ZONES.map((tz) => byZone[tz][input].artifactHash);
      const ahEqual = ah.every((h) => h === ah[0]);
      if (!equal || !ahEqual) failed += 1;
      process.stdout.write(`${writer} ${input} across zones: zip ${equal ? "equal" : "differ"}, artifactHash ${ah[0]} ${ahEqual ? "equal" : "differ"}\n`);
      const name = input.replace(/\.json$/, "");
      record[`artifact:corpus/${name}#${writer}`] = ah[0];
      record[`zip:corpus/${name}#${writer}`] = shas[0];
    }
  }
  if (perWriter.js !== undefined && perWriter.py !== undefined) {
    for (const input of Object.keys(perWriter.js).sort()) {
      const js = perWriter.js[input];
      const py = perWriter.py[input];
      if (py === undefined) {
        failed += 1;
        process.stdout.write(`js and py ${input}: py built no such input\n`);
        continue;
      }
      const agree = js.artifactHash === py.artifactHash;
      if (!agree) failed += 1;
      process.stdout.write(`js and py ${input}: artifactHash ${agree ? "equal" : "differ"}; zip bytes ${js.zips[0] === py.zips[0] ? "equal" : "differ"} (recorded, not required)\n`);
    }
  }
  if (outFile !== undefined) writeFileSync(outFile, `${JSON.stringify(Object.fromEntries(Object.entries(record).sort(([a], [b]) => (a < b ? -1 : 1))), null, 2)}\n`);
  process.stdout.write(failed === 0 ? "writer bytes reproduce\n" : `writer bytes: ${failed} failure(s) (counted)\n`);
  return failed === 0 ? 0 : 1;
}

if (process.argv.includes("--child")) {
  await child();
} else {
  process.exitCode = main(process.argv.slice(2));
}
