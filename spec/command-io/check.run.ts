// command check.run, group prove.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { CheckResult } from "../checks";
import type { ReportUri } from "../ids";


export interface CheckRunIO {
  /**
   * Not the core loop: part.build already returns every applicable
   * finding. check.run serves three cases: `only` reruns a subset on an
   * existing build, the CLI `--artifact <file>` checks exported bytes
   * (export.run calls it on what it wrote), and `cursor` pages a long
   * report.
   */
  input: { build: string; only?: readonly string[]; cursor?: string };
  output: { results: readonly CheckResult[]; report: ReportUri };
}
