// The originals helper: HBF_ORIGINALS, HBF_FAB_KNOWLEDGE,
// HBF_FAB_WORK_DIRECTORY and HBF_REPOS move where the bytes are read, the lineage identity stays the
// archive-prefixed source, and a missing directory throws with the
// variable's name. Every test that reads an original goes through
// it (one helper for mechanisms, archetypes, checks, circuit and core), so
// no test file holds the owner path or skips a read.

import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, test } from "vitest";
import { fileURLToPath } from "node:url";
import { BENCHES_VAR, EVIDENCE_VAR, ORIGINALS_OF_RECORD, ORIGINALS_VAR, REPOS_VAR, localOriginal, localSource, originalPath, originalsRoot, sourcePath } from "./originals-root.js";

/** The owner's home folder, joined so this file does not hold it. */
const OWNER_HOME = ["", "Users", "obsidian", ""].join("/");
const tmp = mkdtempSync(join(tmpdir(), "hbf-originals-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe("originals root", () => {
  test("HBF_ORIGINALS set to a directory moves the read, with a trailing slash", () => {
    const env = { [ORIGINALS_VAR]: tmp };
    expect(originalsRoot(env)).toBe(`${tmp}/`);
    expect(originalPath("ogee16/SHA256SUMS", env)).toBe(`${tmp}/ogee16/SHA256SUMS`);
    expect(localOriginal(`${ORIGINALS_OF_RECORD}tumbler/files/tumbler.html`, env)).toBe(`${tmp}/tumbler/files/tumbler.html`);
  });

  test("a missing directory throws naming HBF_ORIGINALS, never a skip", () => {
    const env = { [ORIGINALS_VAR]: join(tmp, "absent") };
    expect(() => originalsRoot(env)).toThrow(/HBF_ORIGINALS=.*absent does not exist/);
    expect(() => originalPath("ogee16/SHA256SUMS", env)).toThrow(/set HBF_ORIGINALS/);
  });

  test("a path outside the originals of record is refused", () => {
    expect(ORIGINALS_OF_RECORD).toBe("fab-knowledge:originals/");
    expect(() => localOriginal("/elsewhere/tumbler.html", { [ORIGINALS_VAR]: tmp })).toThrow(/not under the originals of record/);
  });

  test("localSource reads each archive prefix from its variable", () => {
    for (const d of ["originals", "knowledge", "benches", "repos"]) mkdirSync(join(tmp, d), { recursive: true });
    const env = { [ORIGINALS_VAR]: join(tmp, "originals"), [EVIDENCE_VAR]: join(tmp, "knowledge"), [BENCHES_VAR]: join(tmp, "benches"), [REPOS_VAR]: join(tmp, "repos") };
    expect(localSource("fab-knowledge:originals/ogee16/files/params.scad", env)).toBe(join(tmp, "originals/ogee16/files/params.scad"));
    expect(localSource("fab-knowledge:evidence/x/toggle/src/src/part2e.js", env)).toBe(join(tmp, "knowledge/evidence/x/toggle/src/src/part2e.js"));
    expect(localSource("fab-work-directory:benches/collar/collar.html", env)).toBe(join(tmp, "benches/benches/collar/collar.html"));
    expect(localSource("badge-replicator/src/lib/units.ts", env)).toBe(join(tmp, "repos/badge-replicator/src/lib/units.ts"));
    expect(localSource("packages/mesh/seed/rastermesh.js", env)).toBe(fileURLToPath(new URL("../../packages/mesh/seed/rastermesh.js", import.meta.url)));
    expect(sourcePath("fab-work-directory:cotter (5).html", env)).toBe(join(tmp, "benches/cotter (5).html"));
  });

  test("localSource throws naming the archive variable, sourcePath does not, and an absolute source is refused", () => {
    const env = { [BENCHES_VAR]: join(tmp, "absent") };
    expect(() => localSource("fab-work-directory:benches/a.html", env)).toThrow(/HBF_FAB_WORK_DIRECTORY=.*absent does not exist/);
    expect(sourcePath("fab-work-directory:benches/a.html", env)).toBe(join(tmp, "absent/benches/a.html"));
    expect(() => localSource("/Users/someone/fab-knowledge/originals/a.html", env)).toThrow(/absolute path/);
  });

  test("no test that reads an original holds the absolute owner path or guards the read with existsSync", () => {
    const root = new URL("../../", import.meta.url);
    const dirs = ["packages/mechanisms/test/", "packages/archetypes/test/"];
    const files = [
      ...dirs.flatMap((d) => readdirSync(new URL(d, root)).filter((f) => f.endsWith(".ts")).map((f) => `${d}${f}`)),
      "packages/checks/test/brd05-reader.test.ts", "packages/checks/test/fit07.test.ts", "packages/checks/test/overhang.test.ts",
      "packages/circuit/test/flex-switch.test.ts", "core/test/mech-constraints.test.ts", "core/test/wiring-export.test.ts", "core/test/canon-commands.test.ts",
    ];
    expect(files.length).toBeGreaterThan(20);
    for (const f of files) {
      const text = readFileSync(new URL(f, root), "utf8");
      expect(text.includes(`${OWNER_HOME}Projects/hackbuild/fab-knowledge/originals`), `${f} holds the owner originals path`).toBe(false);
      expect(/if \([^)]*existsSync\([^)]*source/.test(text), `${f} skips an original read when it is missing`).toBe(false);
    }
  });
});
