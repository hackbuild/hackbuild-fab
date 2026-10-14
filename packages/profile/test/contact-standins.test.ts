// ContactRow stand-ins (M05-T05 card defects, D-082, PROFILE.md 12). No
// ContactRow exists until a person measures a coupon, so contact() answers
// null and the electrical.* stand-ins carry the probe simulation. Each
// stand-in stays inferred and stays on the owner coupon list in PROFILE.md
// section 12, so none can read as measured or drop off the list unseen.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { createProfileLookup, loadProfile } from "../src/index";

const lookup = createProfileLookup(loadProfile());
const profileMd = readFileSync(new URL("../../../docs/plan/PROFILE.md", import.meta.url), "utf8");

/** The `electrical.*` ids the ContactRow item of PROFILE.md 12 lists. */
function listed(): string[] {
  const from = profileMd.indexOf("## 12. Open measurements");
  const to = profileMd.indexOf("\n## ", from + 1);
  const section = profileMd.slice(from, to);
  const item = section.slice(section.indexOf("- [ ] ContactRow rows"));
  const end = item.indexOf("\n- [");
  return [...(end < 0 ? item : item.slice(0, end)).matchAll(/`(electrical\.[A-Za-z.]+)`/g)].map((m) => m[1]!);
}

describe("ContactRow stand-ins", () => {
  test("no ContactRow exists: contact() is null for every kind", () => {
    for (const kind of ["printed-interface", "clip", "solder", "press"] as const) {
      expect(lookup.contact("cpla", "ctpu", kind)).toBeNull();
      expect(lookup.contact("metal", "cpla", kind)).toBeNull();
    }
  });

  test("PROFILE.md 12 lists the stand-ins as owner coupon work", () => {
    expect(listed()).toEqual([
      "electrical.contactFactor.lo", "electrical.contactFactor.hi", "electrical.smearOhm", "electrical.gndLeadPf",
      "electrical.keyLeadPf", "electrical.keyLeadPf.lo", "electrical.keyLeadPf.hi", "electrical.noiseV", "electrical.skinOhm.lo",
    ]);
  });

  test("each listed stand-in is a profile row with tier inferred, never measured", () => {
    for (const id of listed()) {
      const c = lookup.constant(id);
      expect(c.provenance.tier, id).toBe("inferred");
      expect(c.provenance.method, id).not.toBe("coupon");
    }
  });

  test("every electrical.* row whose source waits on a ContactRow is on the list", () => {
    const data = JSON.parse(readFileSync(new URL("../data/constants.json", import.meta.url), "utf8")) as {
      constants: { id: string; provenance: { tier: string; source: string } }[];
    };
    const waiting = data.constants
      .filter((c) => c.id.startsWith("electrical.") && /no ContactRow exists/.test(c.provenance.source))
      .map((c) => c.id);
    // The read model's own rows (charge-release trace rule and touch skin hi, M05-T05) are not stand-ins.
    const readModel = ["electrical.tracePfPerMm", "electrical.tracePfFixed", "electrical.skinOhm.hi"];
    expect(waiting.filter((id) => !readModel.includes(id)).sort()).toEqual(listed().filter((id) => waiting.includes(id)).sort());
    for (const id of waiting) expect(data.constants.find((c) => c.id === id)!.provenance.tier, id).toBe("inferred");
  });
});
