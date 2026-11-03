// Vitest reporter for `node tools/test-tiers.mjs measure`. The json reporter's
// file duration covers the test and hook phase only; import, collect, setup and
// environment time (23 to 42 percent of the task time of three fast-tier runs,
// measured) are not in it.
// This reporter writes each file's tracked time, the sum vitest itself uses
// for its slowest-file report, to the path in HBF_TIERS_DIAG as
// { "<repo relative file>": { "totalS", "collectS", "testS" } }.
import { realpathSync, writeFileSync } from "node:fs";
import { relative } from "node:path";

const r1 = (ms) => Math.round(ms / 100) / 10;

export default class TierTimes {
  onInit(vitest) {
    this.root = realpathSync(vitest.config.root);
  }

  onTestRunEnd(testModules) {
    const path = process.env.HBF_TIERS_DIAG;
    if (!path) return;
    const out = {};
    for (const m of testModules) {
      const d = m.diagnostic();
      const totalMs = d.environmentSetupDuration + d.prepareDuration + d.collectDuration + d.setupDuration + d.duration;
      out[relative(this.root, m.moduleId)] = { totalS: r1(totalMs), collectS: r1(d.collectDuration), testS: r1(d.duration) };
    }
    writeFileSync(path, `${JSON.stringify(out, null, 2)}\n`);
  }
}
