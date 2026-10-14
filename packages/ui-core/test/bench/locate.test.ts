// M09-T05: locate a finding on the Part IR and write its fix as one commit.
// Inputs are committed goldens: the flex-pair Part IR at the chase defaults
// (flex-pair.part.json, written by tools/smoke/flex-pair-host.mjs; its
// buildHash must equal reference/keys/flex-pair/expected/build.json, so it
// cannot drift from the reference) and the findings of
// reference/keys/flex-pair/expected/report.json.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { CheckResult, Fix, Part } from "@hackbuild/spec";
import { createBenchCore } from "../../src/bench/core.js";
import {
  applyFix, bodiesOfFeature, featuresOfBody, findingLine, fixLabel, fixLine, locate, NOT_ON_STAGE, pointerPath, slotVerdicts,
} from "../../src/bench/locate.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REF = path.resolve(HERE, "../../../../reference/keys/flex-pair/expected");
const part = JSON.parse(readFileSync(path.join(HERE, "flex-pair.part.json"), "utf8")) as Part;
const report = JSON.parse(readFileSync(path.join(REF, "report.json"), "utf8")) as { findings: CheckResult[] };
const golden = JSON.parse(readFileSync(path.join(REF, "build.json"), "utf8")) as { buildHash: string };

const finding = (id: string, feature?: string): CheckResult => {
  const r = report.findings.find((f) => f.id === id && (feature === undefined || (f.target.level === "feature" && f.target.feature === feature)));
  if (r === undefined) throw new Error(`report.json has no ${id}`);
  return r;
};
const bodyBox = (id: string) => {
  const b = part.bodies.find((x) => x.id === id);
  if (b === undefined) throw new Error(`no body ${id}`);
  return b.mesh.bbox;
};

test("the Part IR fixture is the reference build", () => {
  expect(part.buildHash).toBe(golden.buildHash);
});

describe("locate", () => {
  test("CHK-KEY-01 on contact.key1 resolves to that feature and the cap1 body", () => {
    const r = finding("CHK-KEY-01");
    expect(r.target).toEqual({ level: "feature", part: "pad", feature: "contact.key1" });
    const at = locate(r, part);
    expect(at.focus[0]).toBe("contact.key1");
    expect(at.focus).toContain("cap1");
    // The contact's two conductor halves are its a and b; the pad host is not focused.
    expect(at.focus).toEqual(["contact.key1", "cap1", "conductor.key1col", "conductor.gnd1col"]);
    const cap = bodyBox("cap1");
    expect(at.bbox).not.toBeNull();
    for (let i = 0; i < 3; i++) {
      expect(at.bbox?.[0][i]).toBeLessThanOrEqual(cap[0][i] as number);
      expect(at.bbox?.[1][i]).toBeGreaterThanOrEqual(cap[1][i] as number);
    }
    // The cap top bounds the box: no pad, so the box stays inside the key.
    expect(at.bbox?.[1][2]).toBe(cap[1][2]);
    expect(at.bbox?.[0][0]).toBeGreaterThan(bodyBox("pad")[0][0]);
  });

  test("a target with a point sets the section at its z", () => {
    const at = locate(finding("CHK-KEY-03"), part);
    expect(at.sectionZ).toBeCloseTo(2.69, 9);
    expect(at.focus).toContain("contact.key1");
  });

  test("a feature on a horizontal face sets the section at the face", () => {
    const at = locate(finding("CHK-NET-04", "conductor.gnd"), part);
    expect(at.focus).toEqual(["conductor.gnd"]);
    expect(at.sectionZ).toBe(0.73);
  });

  test("a pair frames both nets and sets the section at the pair point", () => {
    const at = locate(finding("CHK-NET-02"), part);
    expect(at.focus).toEqual(["conductor.gnd", "conductor.gnd1col", "conductor.gnd1stub", "conductor.key1col", "conductor.key1"]);
    expect(at.sectionZ).toBeCloseTo(1.09, 9);
  });

  test("a part target frames the whole part", () => {
    const at = locate(finding("CHK-PRT-01"), part);
    expect(at.focus).toEqual(part.bodies.map((b) => b.id));
    expect(at.bbox).toEqual([[-30, -15, 0], [30, 15, part.solid.bbox[1][2]]]);
  });

  test("targets that do not resolve return no focus", () => {
    expect(locate(finding("CHK-ASM-01"), part)).toEqual({ focus: [], bbox: null });
    expect(locate(finding("CHK-3MF-06"), part).focus).toEqual([]);
    expect(locate({ target: { level: "feature", part: "pad", feature: "contact.key9" } }, part).focus).toEqual([]);
    expect(locate({ target: { level: "feature", part: "other", feature: "contact.key1" } }, part).focus).toEqual([]);
    expect(NOT_ON_STAGE).toBe("not on the stage");
  });

  test("a body maps back to its own feature first, then to features that name it", () => {
    expect(featuresOfBody(part, "cap1")).toEqual(["contact.key1"]);
    expect(featuresOfBody(part, "conductor.key1col")[0]).toBe("conductor.key1col");
    expect(bodiesOfFeature(part, "port.key1")).toEqual(["pad"]);
  });
});

describe("legend badges", () => {
  test("each slot carries the worst verdict of the findings on its bodies", () => {
    const failing = { ...finding("CHK-KEY-01"), verdict: "fail" } as CheckResult;
    const v = slotVerdicts([finding("CHK-PRT-01"), failing], part);
    // CHK-PRT-01 passes on every body; the failing contact touches slot 4 (cap1) and slot 2 (the halves).
    expect([...v.entries()]).toEqual([[1, "pass"], [2, "fail"], [3, "pass"], [4, "fail"]]);
  });
});

describe("finding and fix lines", () => {
  const fix: Fix = { param: "/keys/0/gap", set: 1.44, paramLegal: [1.44, 2.04], predicts: { measured: 1.44, verdict: "pass" } };
  const failing = { ...finding("CHK-KEY-01"), verdict: "fail", measured: 1, fix } as CheckResult;

  test("the bible 2.5 shape: what, measured, legal, constraint", () => {
    expect(findingLine(failing)).toBe("chk-key-01 1 mm, legal 1.428 to 2.04 mm, set by 0.35 to 0.5 of cone height 4.08, floor 1.2");
    expect(findingLine(finding("CHK-KEY-03"))).toBe(
      "chk-key-03 0.8 mm, legal 0.6 mm or more, set by the exposed split between a contact's halves stays 0.6 mm or wider; a string across it reads as a press",
    );
  });

  test("the fix names the param, the direction and the legal interval", () => {
    expect(fixLine(fix, 1)).toBe("raise keys.0.gap to 1.44, legal 1.44 to 2.04");
    expect(fixLine({ ...fix, set: 2.04 }, 2.5)).toBe("lower keys.0.gap to 2.04, legal 1.44 to 2.04");
    expect(fixLabel(fix)).toBe("set keys.0.gap to 1.44");
  });

  test("json pointers become bench paths, escapes read", () => {
    expect(pointerPath("/keys/0/gap")).toBe("keys.0.gap");
    expect(pointerPath("/a~1b/c~0d")).toBe("a/b.c~d");
    expect(() => pointerPath("keys/0")).toThrow(/json pointer/);
    expect(() => pointerPath("/a.b")).toThrow(/dot/);
  });
});

describe("a fix is one commit, undone by one undo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("set, fix, undo", async () => {
    let builds = 0;
    const core = createBenchCore({
      app: "flex-pair",
      v: 1,
      blank: () => ({ keys: [{ x: 0, d: 10, cone: 4, gap: 1.84 }] }),
      build: async () => {
        builds += 1;
        return { part: null, report: null, buildHash: String(builds) };
      },
    });
    core.set("keys.0.gap", 1);
    core.commit();
    await vi.advanceTimersByTimeAsync(1000);
    const rev = core.rev;
    applyFix(core, { param: "/keys/0/gap", set: 1.44, paramLegal: [1.44, 2.04], predicts: { measured: 1.44, verdict: "pass" } });
    expect(core.rev).toBe(rev + 1);
    expect(core.get("keys.0.gap")).toBe(1.44);
    await vi.advanceTimersByTimeAsync(1000);
    expect(core.undo()).toBe(true);
    expect(core.get("keys.0.gap")).toBe(1);
    core.dispose();
  });
});
