// CHK-INL-01 to 04 seed rows after M03-T08 step 3 (CHECKS.md 7.1 and the
// origin corrections table): -01 and -03 retargeted from pocket to inlay at
// 2.0.0, origins of -02, -03 and -04 corrected. The expected words are the
// card's, copied below. inlayChecks builds the CheckDefs from these rows and
// refuses a row whose version disagrees with its run body in packages/inlay.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { FEATURE_KINDS } from "@hackbuild/spec";
import { CHK_INL_01_VERSION, CHK_INL_02_VERSION, CHK_INL_03_VERSION, CHK_INL_04_VERSION, inlayKind } from "@hackbuild/inlay";
import { MEASURES_PARAM, inlayChecks } from "../src/index.js";

const read = (rel: string): string => readFileSync(new URL(`../../../${rel}`, import.meta.url), "utf8");

interface Row {
  id: string;
  version: string;
  appliesTo: { level: string; kinds?: string[] };
  origin: { project: string; date: string; what: string };
}

const seed = JSON.parse(read("packages/checks/seed/checks.seed.json")) as { checks: Row[] };
const row = (id: string): Row => seed.checks.find((r) => r.id === id)!;

// M03-T08 steps 2 and 3, as the card writes them.
const CARD = {
  "CHK-INL-01": { version: "2.0.0", level: "feature", kinds: ["inlay"] },
  "CHK-INL-02": { version: "1.0.1", level: "part", project: "COLLAR v3 2026-08", what: "despeckle at the full disc ate the full stop of hack.build" },
  "CHK-INL-03": { version: "2.0.0", level: "feature", kinds: ["inlay"], project: "python hackbuild coin v1 2026-08", what: "0.8 inlay over black tinted pink and white grey; 1.2 fixed it" },
  "CHK-INL-04": { version: "1.0.1", level: "part", project: "python hackbuild coin v1 2026-08", what: "back wordmark printed backwards" },
} as const;

describe("CHK-INL seed rows (M03-T08)", () => {
  test("versions, levels and kinds as the card sets them; every kind is a Feature kind", () => {
    for (const [id, want] of Object.entries(CARD)) {
      const r = row(id);
      expect(r.version, id).toBe(want.version);
      expect(r.appliesTo.level, id).toBe(want.level);
      if ("kinds" in want) {
        expect(r.appliesTo.kinds).toEqual(want.kinds);
        for (const k of r.appliesTo.kinds!) expect(FEATURE_KINDS as readonly string[]).toContain(k);
      }
    }
  });

  test("origins corrected: COLLAR v3 for -02, the python coin for -03 and -04 (benches-coins-inlay.md 10 item 8)", () => {
    for (const [id, want] of Object.entries(CARD)) {
      if (!("project" in want)) continue;
      expect(row(id).origin.project).toBe(want.project);
      expect(row(id).origin.what).toBe(want.what);
      expect(row(id).origin.project).not.toContain("SPRUE");
    }
  });

  test("the seed versions equal the run bodies' versions, and the kind lists exactly these checks", () => {
    expect([CHK_INL_01_VERSION, CHK_INL_02_VERSION, CHK_INL_03_VERSION, CHK_INL_04_VERSION]).toEqual(["2.0.0", "1.0.1", "2.0.0", "1.0.1"]);
    const defs = inlayChecks({ seed });
    expect(defs.map((d) => [d.id, d.version, d.appliesTo.level])).toEqual([
      ["CHK-INL-01", "2.0.0", "feature"], ["CHK-INL-02", "1.0.1", "part"], ["CHK-INL-03", "2.0.0", "feature"], ["CHK-INL-04", "1.0.1", "part"],
    ]);
    expect(defs.map((d) => d.id)).toEqual([...inlayKind.checks]);
    expect(MEASURES_PARAM.has("CHK-INL-03")).toBe(true);
  });

  test("a seed row at another version, or -03 still on pocket, is E_SCHEMA", () => {
    const bump = { checks: seed.checks.map((r) => (r.id === "CHK-INL-02" ? { ...r, version: "1.0.0" } : r)) };
    const pocket = { checks: seed.checks.map((r) => (r.id === "CHK-INL-03" ? { ...r, appliesTo: { level: "feature", kinds: ["pocket"] } } : r)) };
    for (const s of [bump, pocket]) {
      let code: string | undefined;
      try {
        inlayChecks({ seed: s });
      } catch (e) {
        code = (e as { hbf?: { code: string } }).hbf?.code;
      }
      expect(code).toBe("E_SCHEMA");
    }
  });
});
