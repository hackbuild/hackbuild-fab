// The consumer install shared by test:pack and the Vue host fixture: a temp
// project whose packages come from the staged tarballs (out/publish), the
// vendored hackbuild-ui tarball and the peer versions the repo pins, so
// nothing resolves through the workspace. Needs npm run pack:lib first and
// network for vue, pinia, three and their dependencies.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../lib/outputs.mjs";

export const PUBLISH = join(ROOT, "out", "publish");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

export const tarballs = () => readJson(join(PUBLISH, "index.json")).packages.map((p) => ({ ...p, file: join(PUBLISH, p.tarball) }));

/** Pins the install takes from the repo, so the consumer installs what the repo is tested with. */
export function pins() {
  const bench = readJson(join(ROOT, "packages/bench/package.json"));
  const viewer = readJson(join(ROOT, "packages/viewer/package.json"));
  const root = readJson(join(ROOT, "package.json"));
  return {
    vue: bench.dependencies.vue,
    pinia: bench.dependencies.pinia,
    three: viewer.peerDependencies.three,
    "@types/three": root.devDependencies["@types/three"],
  };
}

/** Writes package.json into `dir` and installs the tarballs and pins; returns the spawn result. */
export function installConsumer(dir, name = "hbf-pack-consumer") {
  if (!existsSync(join(PUBLISH, "index.json"))) throw new Error("out/publish/index.json is missing. run npm run build:lib and npm run pack:lib first.");
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name, version: "0.0.0", private: true, author: "Moheeb Zara <hackbuildvideo@gmail.com>", type: "module" }, null, 2) + "\n");
  const ui = readdirSync(join(ROOT, "tools/vendor")).filter((f) => /^hackbuild-ui-0\.3\.0-.*\.tgz$/.test(f));
  if (ui.length !== 1) throw new Error(`tools/vendor holds ${ui.length} hackbuild-ui 0.3.0 tarballs, legal 1`);
  const specs = [...tarballs().map((t) => t.file), join(ROOT, "tools/vendor", ui[0]), ...Object.entries(pins()).map(([n, v]) => `${n}@${v}`)];
  return spawnSync("npm", ["install", "--no-audit", "--no-fund", "--save-exact", "--loglevel=error", ...specs], { cwd: dir, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}
