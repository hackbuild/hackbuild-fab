// Where the originals of record are read from. lineage.json and the legacy
// records name each original by the owner's absolute path, which stays the
// identity a test compares against. The bytes are read from HBF_ORIGINALS
// when it is set (a copy of fab-knowledge/originals on another machine or
// in CI), else from that same owner path. A missing directory throws with
// the variable's name: these tests never skip, so a machine without the
// originals reports them failed, never passed.

import { existsSync } from "node:fs";

export const ORIGINALS_OF_RECORD = "/Users/obsidian/Projects/hackbuild/fab-knowledge/originals/";
export const ORIGINALS_VAR = "HBF_ORIGINALS";

type Env = Readonly<Record<string, string | undefined>>;

/** The local originals directory, with a trailing slash; throws naming HBF_ORIGINALS when it is absent. */
export function originalsRoot(env: Env = process.env): string {
  const set = env[ORIGINALS_VAR];
  const dir = set === undefined || set === "" ? ORIGINALS_OF_RECORD : set.endsWith("/") ? set : `${set}/`;
  if (!existsSync(dir)) {
    const why = set === undefined || set === "" ? `${ORIGINALS_VAR} is unset and ${dir} does not exist` : `${ORIGINALS_VAR}=${set} does not exist`;
    throw new Error(`originals not found: ${why}. set ${ORIGINALS_VAR} to a copy of fab-knowledge/originals; these tests read the originals of record and never skip`);
  }
  return dir;
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
