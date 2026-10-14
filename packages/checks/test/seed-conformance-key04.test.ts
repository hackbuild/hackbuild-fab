// CHK-KEY-04 seed row at 2.0.0 (M01-T07 step 5, D-071, CHECKS.md 7.4), patched
// to 2.0.1 when the beam it queries joined extra (integration after M06). The
// expected fields are the card's words, copied below; the full seed schema
// is tools/test/seed-conformance.test.ts. Done-when of M01-T07: no fixed
// 2.0 to 2.4 window remains in the seed or in the sim code that backs it.

import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { FEATURE_KINDS } from "@hackbuild/spec";

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
const row = rows.find((r) => r.id === "CHK-KEY-04")!;

// M01-T07 step 5, as the card writes it, at the 2.0.1 patch.
const CARD = {
  version: "2.0.1",
  title: "click spring rise Q inside the FE-backed window: snaps, drop at least click.dropMin, strain at the stop within the bend-direction limit, not bistable",
  kinds: ["spring"],
  needs: ["sim", "profile"],
  legalKind: "interval",
  project: "PIP 2026-09",
  failure: "0.6 beam reached 2.7 to 3.3 percent",
  dropped: "under 2.0 stops snapping",
  constraint: "sim/click-spring-window",
} as const;

describe("CHK-KEY-04 seed row", () => {
  test("version 2.0.1, the D-071 title, kinds spring, needs sim and profile, legal interval", () => {
    expect(row.version).toBe(CARD.version);
    expect(row.title).toBe(CARD.title);
    expect(row.appliesTo).toEqual({ level: "feature", kinds: CARD.kinds });
    for (const k of row.appliesTo.kinds!) expect(FEATURE_KINDS as readonly string[]).toContain(k);
    expect(row.needs).toEqual(CARD.needs);
    expect(row.legalKind).toBe(CARD.legalKind);
  });

  test("origin keeps PIP 2026-09 and the failure, and drops the snapping claim", () => {
    expect(row.origin.project).toBe(CARD.project);
    expect(row.origin.what).toContain(CARD.failure);
    expect(row.origin.what).not.toContain(CARD.dropped);
  });

  // M01-T07 seeded pending M04; M04-T01 landed the run body (packages/checks/src/defs/key/CHK-KEY-04.ts) and dropped it.
  test("backed by the sim/click-spring-window constraint; the run body has landed", () => {
    expect(row.constraint).toBe(CARD.constraint);
    expect(row.pending).toBeUndefined();
    expect(read("packages/checks/src/defs/key/CHK-KEY-04.ts")).toMatch(/clickSpringWindow/);
  });

  test("no fixed 2.0 to 2.4 window in the row or in packages/sim/src", () => {
    const fixed = /2\.0\s*(and|to)\s*2\.4/;
    expect(JSON.stringify(row)).not.toMatch(fixed);
    const files = readdirSync(new URL("../../sim/src", import.meta.url), { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".ts"));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) expect(read(`packages/sim/src/${f}`), f).not.toMatch(fixed);
  });
});
