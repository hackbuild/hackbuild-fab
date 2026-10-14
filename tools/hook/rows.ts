// The row shapes conformance.spec.ts writes and report.ts merges.

import path from "node:path";
import { ROOT } from "./benches.ts";

export const PARTS_DIR = path.join(ROOT, "out/hook/parts");

export type Result = "pass" | "fail" | "not run";

export interface Row {
  result: Result;
  reason?: string;
}

export interface BenchReport {
  name: string;
  rel: string;
  origin: "fab" | "legacy";
  sha256: string;
  adapter: string | null;
  tests: Record<string, Row>;
}

/** File name of one bench's rows under PARTS_DIR. */
export const partFile = (benchName: string): string =>
  path.join(PARTS_DIR, `${benchName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()}.json`);
