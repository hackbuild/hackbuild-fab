// SOURCE_DATE_EPOCH (M00-T13 step 6): the environment value (raised to
// 315532800 when lower), else the HEAD committer time, else 315532800;
// never the clock.

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { DEFAULT_EPOCH, sourceDateEpoch } from "../src/epoch.js";

const tmp = mkdtempSync(path.join(tmpdir(), "hbf-epoch-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

/** A committer time for the fixture commit, s (2026-10-04T00:00:00Z, computed). */
const COMMIT_S = 1791072000;

const git = (cwd: string, ...args: string[]): void => {
  execFileSync("git", args, {
    cwd, stdio: "ignore",
    env: { ...process.env, GIT_COMMITTER_DATE: `${COMMIT_S} +0000`, GIT_AUTHOR_DATE: `${COMMIT_S} +0000`, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },
  });
};

describe("sourceDateEpoch", () => {
  it("takes the environment value first", () => {
    expect(sourceDateEpoch(tmp, { SOURCE_DATE_EPOCH: "1791072000" })).toEqual({ value: 1791072000, source: "env" });
  });

  it("refuses a value that is not whole non-negative seconds with E_SCHEMA", () => {
    for (const raw of ["soon", "-5", "1.5", " 1791072000", "1e9", "0x10"]) {
      expect(() => sourceDateEpoch(tmp, { SOURCE_DATE_EPOCH: raw }), raw).toThrow(/SOURCE_DATE_EPOCH|integer/);
    }
  });

  it("raises a value below 1980 to 315532800, the zip mtime both writers clamp to", () => {
    expect(sourceDateEpoch(tmp, { SOURCE_DATE_EPOCH: "0" })).toEqual({ value: DEFAULT_EPOCH, source: "env" });
    expect(sourceDateEpoch(tmp, { SOURCE_DATE_EPOCH: "100" })).toEqual({ value: DEFAULT_EPOCH, source: "env" });
  });

  it("falls back to 315532800 outside a repository and in one with no commit", () => {
    const empty = mkdtempSync(path.join(tmp, "plain-"));
    expect(sourceDateEpoch(empty, {})).toEqual({ value: DEFAULT_EPOCH, source: "default" });
    git(empty, "init", "-q");
    expect(sourceDateEpoch(empty, {})).toEqual({ value: DEFAULT_EPOCH, source: "default" });
  });

  it("uses the HEAD committer time when there is a commit", () => {
    const repo = mkdtempSync(path.join(tmp, "repo-"));
    git(repo, "init", "-q");
    writeFileSync(path.join(repo, "f.txt"), "f\n");
    git(repo, "add", "f.txt");
    git(repo, "-c", "user.name=fixture", "-c", "user.email=fixture@example.invalid", "-c", "core.hooksPath=/dev/null", "commit", "-q", "-m", "fixture");
    expect(sourceDateEpoch(repo, {})).toEqual({ value: COMMIT_S, source: "git" });
  });
});
