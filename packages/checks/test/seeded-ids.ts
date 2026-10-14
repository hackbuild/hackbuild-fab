// The ids of the seeded registry, read from the plan, never from the seed
// under test: the 85 rows of ../docs/plan/CHECKS.md section 6 plus
// CHK-NET-29, which M-S-T06 seeded from section 9.4 (section 15: "already
// seeded ... so it is off the append list"). Tests of the M04-T01 run and
// skip split scope themselves to this set, so rows entered later (M04-T12,
// CHECKS.md section 9) are tested where they enter.

import { readFileSync } from "node:fs";

const md = readFileSync(new URL("../../../docs/plan/CHECKS.md", import.meta.url), "utf8");
const section6 = md.split(/^## 6\. /m)[1]?.split(/^## 7\. /m)[0] ?? "";

export const SEEDED_IDS: ReadonlySet<string> = new Set([
  ...section6.split("\n").filter((l) => /^\| CHK-/.test(l)).map((l) => l.split("|")[1]!.trim()),
  "CHK-NET-29",
]);
