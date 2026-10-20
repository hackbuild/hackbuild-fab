// The type test both ways (M10-T02 acceptance): params-of.test-d.ts
// compiles as written, and removing any one of its @ts-expect-error lines
// makes tsc fail at the line under it. A directive that stops firing (a
// ParamsOf that lets a typo or a derived read through) fails the first
// half; a check that fires for an unrelated reason fails the second half,
// since the error must land on the line the directive guards.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");
const TSC = path.join(ROOT, "node_modules", ".bin", "tsc");
const SOURCE = path.join(HERE, "params-of.test-d.ts");
const tmp = mkdtempSync(path.join(tmpdir(), "chase-td-"));
const written: string[] = [];
afterAll(() => {
  for (const f of written) rmSync(f, { force: true });
  rmSync(tmp, { recursive: true, force: true });
});

/** tsc over one file with the test tsconfig; the diagnostics, or "" on exit 0. */
function tsc(file: string): string {
  const cfg = path.join(tmp, `${path.basename(file)}.json`);
  writeFileSync(cfg, JSON.stringify({ extends: path.join(ROOT, "tsconfig.tests.json"), compilerOptions: { skipLibCheck: true, types: [] }, include: [], files: [file] }));
  try {
    execFileSync(TSC, ["-p", cfg], { cwd: ROOT, encoding: "utf8", stdio: "pipe" });
    return "";
  } catch (e) {
    return String((e as { stdout?: string }).stdout ?? e);
  }
}

const lines = readFileSync(SOURCE, "utf8").split("\n");
const directives = lines.flatMap((l, i) => (l.trim().startsWith("// @ts-expect-error") ? [i] : []));

describe("params-of.test-d.ts", () => {
  it("holds four directives: enum value, param typo, derived read, checks field", () => {
    expect(directives.map((i) => lines[i]!.replace(/.*@ts-expect-error /, ""))).toEqual([
      "an enum value outside its options is a type error",
      "a param name typo is a type error",
      "derived fields are not inputs",
      "a chase has no checks field (D-173)",
    ]);
  });
  it("compiles as written", () => {
    expect(tsc(SOURCE)).toBe("");
  });
  it.each(directives.map((i) => [i + 1, i] as const))("fails to compile with the directive on line %i removed", (_n, i) => {
    // The copy sits beside the original so its imports resolve the same way.
    const copy = path.join(HERE, `.mutant-${process.pid}-${i}.test-d.ts`);
    written.push(copy);
    writeFileSync(copy, lines.map((l, j) => (j === i ? "" : l)).join("\n"));
    const out = tsc(copy);
    rmSync(copy, { force: true });
    expect(out).toMatch(new RegExp(`\\.mutant-${process.pid}-${i}\\.test-d\\.ts\\(${i + 2},\\d+\\): error TS`));
  });
});
