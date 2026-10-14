// Merges the per-bench rows into out/hook/report.json (M09-T12 step 5):
// per bench and per test, pass, fail or not run with the reason. A bench
// whose test wrote nothing is listed as not run; a legacy page with no hook
// is listed under notBenches with its reason (D-153).

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { listBenches, ROOT } from "./benches.ts";
import { partFile, type BenchReport } from "./rows.ts";

export default async function report(): Promise<void> {
  const { benches, skipped } = await listBenches();
  const rows: BenchReport[] = benches.map((b) => {
    const part = partFile(b.name);
    if (existsSync(part)) return JSON.parse(readFileSync(part, "utf8")) as BenchReport;
    return { name: b.name, rel: b.rel, origin: b.origin, sha256: b.sha256, adapter: b.adapter, tests: { all: { result: "not run", reason: "the test for this bench wrote no rows" } } };
  });
  const out = { suite: "BenchHook conformance, M09-T12", benches: rows, notBenches: skipped };
  writeFileSync(path.join(ROOT, "out/hook/report.json"), JSON.stringify(out, null, 1) + "\n");
}
