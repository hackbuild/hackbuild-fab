// SOURCE_DATE_EPOCH for BuildInputs (D-051, D-052, M00-T13 step 6): the
// environment value when set, else the committer time of HEAD, else
// 315532800 (1980-01-01T00:00:00Z, the first zip mtime). Never the clock.

import { execFileSync } from "node:child_process";
import { cmdError } from "./errors.js";

/** 1980-01-01T00:00:00Z in seconds; zip mtimes cannot go earlier. */
export const DEFAULT_EPOCH = 315532800;

export type EpochSource = "env" | "git" | "default";

export interface Epoch {
  /** Seconds since 1970-01-01T00:00:00Z. */
  readonly value: number;
  readonly source: EpochSource;
}

/** Committer time of HEAD in `cwd`, or undefined when git or a commit is missing. */
export function headCommitTime(cwd: string): number | undefined {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%ct"], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    const n = Number(out);
    return out !== "" && Number.isInteger(n) ? n : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The epoch in force. An environment value is any whole non-negative
 * number of seconds; below 315532800 it is raised to 315532800, the value
 * both 3MF writers clamp the zip mtime to (packages/3mf clampEpoch,
 * tools/py/orca3mf.py clamp_epoch), so BuildInputs records the date the
 * file carries. Anything else is E_SCHEMA.
 */
export function sourceDateEpoch(cwd: string, env: Readonly<Record<string, string | undefined>> = process.env): Epoch {
  const raw = env["SOURCE_DATE_EPOCH"];
  if (raw !== undefined && raw !== "") {
    const n = /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
    if (!Number.isSafeInteger(n)) {
      throw cmdError({
        code: "E_SCHEMA", path: "/env/SOURCE_DATE_EPOCH", got: raw,
        expected: "whole non-negative seconds since 1970-01-01T00:00:00Z",
        hint: "set SOURCE_DATE_EPOCH to an integer or unset it",
      });
    }
    return { value: Math.max(n, DEFAULT_EPOCH), source: "env" };
  }
  const head = headCommitTime(cwd);
  if (head !== undefined && head >= DEFAULT_EPOCH) return { value: head, source: "git" };
  return { value: DEFAULT_EPOCH, source: "default" };
}
