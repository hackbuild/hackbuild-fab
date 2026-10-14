// CHK-KEY-01 2.1.0 (M06-T12 step 6): a contact that declares neither travel
// nor cone height is no flex key, so the check skips it with the reason; a
// contact that declares one and not the other is still a flex key missing
// a number, E_PARAM_MISSING naming the field. Version 2.0.0 threw on every
// contact without a cone height, which stopped check.run on a BLOCKS stud.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { isThrownCommandError, type ContactFeature, type Part, type TargetOf } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { runKey01 } from "../src/skeleton/key01";

const profile = createProfileLookup(loadProfile());
const contact = (extra: Partial<ContactFeature>): ContactFeature => ({ kind: "contact", id: "contact.stud", a: "conductor.post", b: "conductor.socket", forceMinN: 0.5, maxOhm: 50000, ...extra });
const target = (f: ContactFeature): TargetOf<"feature", "contact"> => ({ level: "feature", part: { id: "body", features: [f], metrics: [] } as unknown as Part, feature: f });
const code = (fn: () => unknown): string | undefined => {
  try { fn(); } catch (e) { return isThrownCommandError(e) ? `${e.hbf.code} ${e.hbf.path}` : "thrown"; }
  return undefined;
};

describe("CHK-KEY-01 applies to flex keys only", () => {
  test("the seed row is 2.1.0", () => {
    const seed = JSON.parse(readFileSync(new URL("../seed/checks.seed.json", import.meta.url), "utf8")) as { checks?: { id: string; version: string }[] } | { id: string; version: string }[];
    const rows = Array.isArray(seed) ? seed : seed.checks ?? [];
    expect(rows.find((r) => r.id === "CHK-KEY-01")?.version).toBe("2.1.0");
  });

  test("a stud contact with no gap and no coneH skips, legal none, the reason in constraint", () => {
    const [f] = runKey01(target(contact({})), { profile });
    expect(f?.verdict).toBe("skip");
    expect(f?.legal).toEqual({ kind: "none" });
    expect(f?.constraint).toMatch(/declares no gap and no coneH/);
  });

  test("a gap without coneH, or a coneH without gap, is E_PARAM_MISSING naming the field", () => {
    expect(code(() => runKey01(target(contact({ gap: 1.8 })), { profile }))).toBe("E_PARAM_MISSING /features/contact.stud/coneH");
    expect(code(() => runKey01(target(contact({ coneH: 4 })), { profile }))).toBe("E_PARAM_MISSING /features/contact.stud/gap");
  });

  test("a flex key still gets its interval: gap 1.8 inside 35 to 50 percent of cone 4", () => {
    const [f] = runKey01(target(contact({ gap: 1.8, coneH: 4 })), { profile });
    expect(f?.verdict).toBe("pass");
    expect(f?.measured).toBe(1.8);
  });
});
