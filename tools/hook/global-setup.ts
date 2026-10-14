// Clears the per-bench rows of the last run so report.json holds this run only.

import { rmSync } from "node:fs";
import path from "node:path";
import { ROOT } from "./benches.ts";

export default function globalSetup(): void {
  rmSync(path.join(ROOT, "out/hook"), { recursive: true, force: true });
}
