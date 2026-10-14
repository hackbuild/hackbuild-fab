// One implementation each for the RC time constant, the charge-release
// reject bound and R = rho L / A (flex-switch.ts, read/charge-release.ts,
// profile sectionResistance). The M05 audit found the pullup read and
// CHK-NET-29 restating the first two; this holds the sources to one home
// and the settling wait CHK-NET-29 prints to the read it predicts.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { SETTLE_TAUS, chargeReleaseRead, rejectOhmAt, settlingWait } from "../src/index.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const sources = (dir: string): string[] =>
  readdirSync(path.join(ROOT, dir), { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".ts")).map((f) => path.join(dir, f));

const HOMES = new Set(["packages/circuit/src/flex-switch.ts", "packages/circuit/src/read/charge-release.ts", "packages/profile/src/lookup.ts"]);
// ohm x pF x 1e-6 (tau, us), wait x 1e-6 / (... 1e-12) or wait x 1e6 / (taus x C) (reject), rho x 10 x L / A (section).
const RESTATED = [/[pP][fF]\w*\s*\*\s*1e-6\b/, /\*\s*1e-12\s*\)/, /\*\s*1e6\)\s*\/\s*\(\w+\s*\*\s*\w+\)/, /ohmCm\w*\s*\*\s*10\s*\*/];

describe("one home", () => {
  test("no circuit, checks or copper source restates tau, the reject bound or the section formula", () => {
    const offenders: string[] = [];
    for (const f of [...sources("packages/circuit/src"), ...sources("packages/checks/src"), ...sources("packages/copper/src"), ...sources("core/src/commands")]) {
      if (HOMES.has(f)) continue;
      const text = readFileSync(path.join(ROOT, f), "utf8");
      for (const re of RESTATED) if (re.test(text)) offenders.push(`${f} ${re}`);
    }
    expect(offenders).toEqual([]);
  });

  test("the settling wait is the smallest whole us whose read accepts the path", () => {
    for (const [ohm, pf, taus] of [[20910897, 8.494, SETTLE_TAUS.touch], [1722798, 9.1095, SETTLE_TAUS.key], [74404.76, 7, SETTLE_TAUS.key]] as const) {
      const fix = settlingWait(ohm, taus, pf);
      expect(Number.isInteger(fix.waitUs)).toBe(true);
      expect(fix.rejectOhm).toBe(rejectOhmAt(fix.waitUs, taus, pf));
      expect(fix.rejectOhm).toBeGreaterThanOrEqual(ohm);
      expect(rejectOhmAt(fix.waitUs - 1, taus, pf)).toBeLessThan(ohm);
      const read = chargeReleaseRead({ net: "n", pathOhm: ohm, nodePf: pf, settleTaus: taus, emit: { value: fix.waitUs, unit: "us", qualifier: "computed", basis: null }, leakNa: 0 });
      expect(read.rejectOhm).toBe(fix.rejectOhm);
    }
  });
});
