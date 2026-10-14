// The originals helper: HBF_ORIGINALS moves where the bytes are read, the
// lineage identity stays the owner path, and a missing directory throws
// with the variable's name. Every test that reads an original goes through
// it (one helper for mechanisms, archetypes, checks, circuit and core), so
// no test file holds the owner path or skips a read.

import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, test } from "vitest";
import { ORIGINALS_OF_RECORD, ORIGINALS_VAR, localOriginal, originalPath, originalsRoot } from "./originals-root.js";

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
    expect(() => localOriginal("/elsewhere/tumbler.html", { [ORIGINALS_VAR]: tmp })).toThrow(/not under the originals of record/);
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
      expect(text.includes("/Users/obsidian/Projects/hackbuild/fab-knowledge/originals"), `${f} holds the owner originals path`).toBe(false);
      expect(/if \([^)]*existsSync\([^)]*source/.test(text), `${f} skips an original read when it is missing`).toBe(false);
    }
  });
});
