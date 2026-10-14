// CHK-NET-05 seed row at 2.0.0 (M01-T08 step 7, D-076, CHECKS.md 7.5). The
// title, needs, constraint and failure are read from CHECKS.md 7.5 itself,
// the independent source the card defers to (card defect 4); the full seed
// schema is tools/test/seed-conformance.test.ts. M05-T06 landed the run
// body, so the row carries no pending milestone.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { FEATURE_KINDS } from "@hackbuild/spec";
import { CHECK_MODULES } from "../src/index";

const read = (rel: string): string => readFileSync(new URL(`../../../${rel}`, import.meta.url), "utf8");

interface Row {
  id: string;
  version: string;
  title: string;
  appliesTo: { level: string; kinds?: string[] };
  needs: string[];
  legalKind: string;
  origin: { project: string; date: string; what: string };
  status: string;
  pending?: string;
  constraint?: string;
}

const rows = (JSON.parse(read("packages/checks/seed/checks.seed.json")) as { checks: Row[] }).checks;
const row = rows.find((r) => r.id === "CHK-NET-05")!;

// CHECKS.md 7.5, prose joined onto one line.
const sec = read("docs/plan/CHECKS.md").split(/^### /m).find((s) => s.startsWith("7.5 CHK-NET-05"))!.replace(/\s+/g, " ");
const grab = (re: RegExp): string => {
  const m = sec.match(re);
  if (m === null) throw new Error(`CHECKS.md 7.5 has no match for ${String(re)}`);
  return m[1]!;
};
const SPEC = {
  version: grab(/New title, version (\d+\.\d+\.\d+):/),
  title: grab(/New title, version [\d.]+: "([^"]+)"/),
  kind: grab(/Target feature \(kind `(\w+)`/),
  needs: [...grab(/needs (`[^.;]+`);/).matchAll(/`(\w+)`/g)].map((m) => m[1]!),
  constraint: grab(/constraint `([\w/-]+)`/),
  project: grab(/Origin (BLOCKS [\d-]+), failure/),
  failure: grab(/failure "([^"]+)"/),
};

describe("CHK-NET-05 seed row", () => {
  test("CHECKS.md 7.5 parses to the version, title, kind, needs and constraint", () => {
    expect(SPEC.version).toBe("2.0.0");
    expect(SPEC.needs.length).toBeGreaterThan(0);
  });

  test("version, title, target kind port and needs follow CHECKS.md 7.5, legal interval", () => {
    expect(row.version).toBe(SPEC.version);
    expect(row.title).toBe(SPEC.title);
    expect(row.appliesTo).toEqual({ level: "feature", kinds: [SPEC.kind] });
    for (const k of row.appliesTo.kinds!) expect(FEATURE_KINDS as readonly string[]).toContain(k);
    expect(row.needs).toEqual(SPEC.needs);
    expect(row.legalKind).toBe("interval");
  });

  test("backed by circuit/pullup-low-read, entered, and its run body landed (M05-T06): no pending milestone", () => {
    expect(row.constraint).toBe(SPEC.constraint);
    expect(row.status).toBe("entered");
    expect(row.pending).toBeUndefined();
    expect(CHECK_MODULES.find((m) => m.id === "CHK-NET-05")?.run).toBeTypeOf("function");
  });

  test("origin keeps BLOCKS 2026-08 and the BOSS failure, and drops the 45k claim", () => {
    expect(row.origin.project).toBe(SPEC.project);
    expect(row.origin.what).toBe(SPEC.failure);
    expect(row.origin.what).not.toContain("45k");
  });
});
