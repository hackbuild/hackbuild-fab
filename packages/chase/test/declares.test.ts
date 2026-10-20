// Declarations only (M10-T02 step 4, D-178): each fixture under
// fixtures/computes holds one construct that computes, and the verdict is
// E_SCHEMA at the line marked "computes" with the pointer of the enclosing
// field. The flex-pair chase and every reference and design chase on disk
// pass.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkDeclares, enclosingField } from "@hackbuild/chase";
import { ERROR_TRANSPORT } from "@hackbuild/spec";
import { ROOT, chaseFiles } from "./helpers.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const COMPUTES = path.join(HERE, "fixtures", "computes");
const fixtures = readdirSync(COMPUTES).filter((f) => f.endsWith(".ts")).sort();

const markedLine = (src: string): number => src.split("\n").findIndex((l) => l.endsWith("// computes")) + 1;

describe("a chase that computes", () => {
  it("has one fixture per refused construct", () => {
    expect(fixtures.map((f) => f.replace(/\.ts$/, ""))).toEqual([
      "arrow", "binary", "call", "computed-key", "conditional", "function-expression", "identifier", "logical", "loop", "spread", "template-substitution",
    ]);
  });
  it.each(fixtures)("%s is E_SCHEMA at the marked line, inside its field", (f) => {
    const src = readFileSync(path.join(COMPUTES, f), "utf8");
    const v = checkDeclares(src, f);
    expect(v.ok).toBe(false);
    if (v.ok) return;
    expect(v.error.code).toBe("E_SCHEMA");
    expect(ERROR_TRANSPORT[v.error.code].exit).toBe(2);
    expect(v.error.record).toMatch(/^chase-source\//);
    expect(v.line).toBe(markedLine(src));
    expect(v.error.hint).toContain(`${f}:${v.line}:`);
    expect(v.field).toBe(f === "loop.ts" ? undefined : "/params/0/fields/0");
  });
});

describe("a chase that declares", () => {
  const files = chaseFiles();
  it("the flex-pair chase passes", () => {
    const f = "reference/keys/flex-pair/chase.ts";
    const v = checkDeclares(readFileSync(path.join(ROOT, f), "utf8"), f);
    expect(v.ok ? v.chase.meta.id : v.error.hint).toBe("keys-flex-pair");
  });
  it("finds the chases on disk", () => {
    expect(files.length).toBeGreaterThan(40);
  });
  it.each(files)("%s passes", (f) => {
    const v = checkDeclares(readFileSync(path.join(ROOT, f), "utf8"), f);
    expect(v.ok ? "ok" : `${v.line}: ${v.error.hint}`).toBe("ok");
  });
});

describe("enclosingField", () => {
  it("names the innermost field of a pointer", () => {
    expect(enclosingField("/params/1/fields/0/item/3/default")).toBe("/params/1/fields/0/item/3");
    expect(enclosingField("/params/0/readouts/2/limit/max")).toBe("/params/0/readouts/2");
    expect(enclosingField("/meta/id")).toBeUndefined();
  });
});
