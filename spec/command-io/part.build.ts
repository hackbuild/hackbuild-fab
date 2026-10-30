// command part.build, group build.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { CommandResult, Detail, ImportSpec, InferredRead, PartSummary } from "../commands.js";
import type { BuildUri } from "../ids.js";
import type { Assembly, BuildWarning, Metric, Part } from "../part-ir.js";
import type { Params } from "./_shared.js";


export interface PartBuildIO {
  /**
   * Exactly one of chase and import is present, E_SCHEMA otherwise.
   * import lists one or more files, each a body of one Part (a mesh
   * pair is two entries). params and preset apply to a chase only.
   * params deep-merge over the preset, or over the defaults when preset
   * is absent; an object merges key by key; a list replaces whole. A key
   * starting with "/" is a JSON pointer into the merged params and sets
   * one value, for example {"/keys/0/gap": 1.6}; pointer keys apply after
   * the merge, and a pointer that resolves to no param is E_REF.
   * The build runs every registered check whose target it produced and
   * returns them in CommandResult.findings and counts, fail first; the
   * verdict is the worst of them. One call is the build and the proof,
   * with no handle passed between calls. cursor continues a truncated
   * findings page (D-110).
   */
  input: {
    chase?: string;
    import?: readonly ImportSpec[];
    params?: Params;
    preset?: string;
    detail?: Detail;
    cursor?: string;
  };
  /** ir is null under --detail summary; fetch hbf://build/<hash> for the full record. */
  output: {
    build: BuildUri;
    parts: readonly PartSummary[];
    metrics: readonly Metric[];
    warnings: readonly BuildWarning[];
    /**
     * Profile rows at tier inferred whose value reached a check's measured
     * or legal value, attributed by ProfileLookup read tracking during each
     * check's run. Empty when no inferred row moves a verdict. The card and
     * the PRINT step show each entry as "this verdict rests on an inferred
     * row". Never refuses an export; E_PROVENANCE is for catalog part rows
     * only (D-102).
     */
    readsInferred: readonly InferredRead[];
    ir: Part | Assembly | null;
  };
}
