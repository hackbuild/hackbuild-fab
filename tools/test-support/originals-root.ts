// Where the owner's files a test compares against are read from. lineage.json
// and the legacy records name each file in the publish form of
// tools/publish-paths.mjs: fab-knowledge:originals/<path> for the originals of
// record, fab-knowledge:<path> for the rest of the evidence archive,
// fab-work-directory:<path> for the benches, ~/<path> under the home folder,
// <repo>/<path> for a sibling repository and a bare repo path for this one.
// That string stays the identity a test compares against; no home path is
// written. The bytes are read from a local copy of each archive: HBF_ORIGINALS,
// HBF_EVIDENCE (fab-knowledge), HBF_BENCHES (fab-work-directory) and HBF_REPOS
// (the folder holding the sibling repositories) when set, else the sibling
// folder next to this repository. A missing directory throws with the
// variable's name: these tests never skip, so a machine without the originals
// reports them failed, never passed.

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

export const ORIGINALS_OF_RECORD = "fab-knowledge:originals/";
export const ORIGINALS_VAR = "HBF_ORIGINALS";
export const EVIDENCE_VAR = "HBF_EVIDENCE";
export const BENCHES_VAR = "HBF_BENCHES";
export const REPOS_VAR = "HBF_REPOS";

const EVIDENCE_PREFIX = "fab-knowledge:";
const BENCHES_PREFIX = "fab-work-directory:";
const HOME_PREFIX = "~/";

type Env = Readonly<Record<string, string | undefined>>;

const REPO = fileURLToPath(new URL("../../", import.meta.url));
/** The folder this repository sits in; its siblings are the archives' default copies. */
const NEAR = fileURLToPath(new URL("../../../", import.meta.url));

const slashed = (dir: string): string => (dir.endsWith("/") ? dir : `${dir}/`);

/** One archive root: the variable when set, else the default folder, with a trailing slash. */
function rootOf(name: string, fallback: string, env: Env): { dir: string; set: string | undefined } {
  const set = env[name];
  if (set === undefined || set === "") return { dir: slashed(fallback), set: undefined };
  return { dir: slashed(set), set };
}

function requireRoot(name: string, fallback: string, what: string, env: Env): string {
  const { dir, set } = rootOf(name, fallback, env);
  if (!existsSync(dir)) {
    const why = set === undefined ? `${name} is unset and ${dir} does not exist` : `${name}=${set} does not exist`;
    throw new Error(`${what} not found: ${why}. set ${name} to a copy of ${what}; these tests read the originals of record and never skip`);
  }
  return dir;
}

/** The local originals directory, with a trailing slash; throws naming HBF_ORIGINALS when it is absent. */
export function originalsRoot(env: Env = process.env): string {
  return requireRoot(ORIGINALS_VAR, `${NEAR}fab-knowledge/originals/`, "fab-knowledge/originals", env);
}

/** The local file for a path relative to the originals directory, e.g. "ogee16/SHA256SUMS". */
export function originalPath(rel: string, env: Env = process.env): string {
  return `${originalsRoot(env)}${rel}`;
}

/** The local file for an originals-of-record path as lineage.json writes it. */
export function localOriginal(recordPath: string, env: Env = process.env): string {
  if (!recordPath.startsWith(ORIGINALS_OF_RECORD)) throw new Error(`${recordPath} is not under the originals of record ${ORIGINALS_OF_RECORD}`);
  return originalPath(recordPath.slice(ORIGINALS_OF_RECORD.length), env);
}

/** Which archive a lineage source names, the variable that relocates it and the path inside it. */
function placeOf(source: string): { name: string; fallback: string; what: string; rel: string } | { repo: string } {
  if (source.startsWith("/")) throw new Error(`${source} is an absolute path; lineage names a source by archive prefix (tools/publish-paths.mjs)`);
  if (source.startsWith(ORIGINALS_OF_RECORD)) return { name: ORIGINALS_VAR, fallback: `${NEAR}fab-knowledge/originals/`, what: "fab-knowledge/originals", rel: source.slice(ORIGINALS_OF_RECORD.length) };
  if (source.startsWith(EVIDENCE_PREFIX)) return { name: EVIDENCE_VAR, fallback: `${NEAR}fab-knowledge/`, what: "fab-knowledge", rel: source.slice(EVIDENCE_PREFIX.length) };
  if (source.startsWith(BENCHES_PREFIX)) return { name: BENCHES_VAR, fallback: `${NEAR}fab-work-directory`, what: "fab-work-directory", rel: source.slice(BENCHES_PREFIX.length) };
  if (source.startsWith(HOME_PREFIX)) return { repo: `${homedir()}/${source.slice(HOME_PREFIX.length)}` };
  const head = source.split("/")[0] ?? "";
  // A first segment this repository holds is a repo path; any other names a sibling repository.
  if (existsSync(`${REPO}${head}`)) return { repo: `${REPO}${source}` };
  return { name: REPOS_VAR, fallback: NEAR, what: "the sibling repositories", rel: source };
}

/**
 * The local path for a lineage source, without checking that its archive is
 * on this machine. For a read guarded by existsSync (the hosted runner skips
 * it); every unguarded read goes through localSource.
 */
export function sourcePath(source: string, env: Env = process.env): string {
  const p = placeOf(source);
  if ("repo" in p) return p.repo;
  return `${rootOf(p.name, p.fallback, env).dir}${p.rel}`;
}

/** The local path for a lineage source; throws naming the archive's variable when the archive is absent. */
export function localSource(source: string, env: Env = process.env): string {
  const p = placeOf(source);
  if ("repo" in p) return p.repo;
  return `${requireRoot(p.name, p.fallback, p.what, env)}${p.rel}`;
}
