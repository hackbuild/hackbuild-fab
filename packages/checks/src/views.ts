// Kernel views a run body may read beside the Part IR (M04-T01). CheckCtx
// in spec/checks.ts carries the profile, the machine, whitelists, the sim
// handle and the hookup, and no way to read mesh bytes, which the Part IR
// holds only as hbf://mesh uris (D-050). The registry caller resolves the
// bytes from the store or the build in memory and hands them in here; the
// same holds for the stack band declarations behind CHK-PRT-02 and
// CHK-3MF-05, which the Part IR does not record. This is a checks-side
// extension of CheckCtx until spec carries the field (card defect M04-T01).

import type { Assertion, CheckCtx, Finding, MeshRef, Part, ShapeDecl } from "@hackbuild/spec";
import type { MeshData } from "@hackbuild/mesh";
import type { InsertCaseView } from "@hackbuild/sim";
import type { Catalog } from "@hackbuild/catalog";
import type { AdcPort, ChargePort, Extraction, PullupPort, SeriesPort } from "@hackbuild/circuit";

/** What a 3MF states about its source in Metadata/hackbuild_chase.json and its zip mtime (CHK-ART-02, D-052). */
export interface StatedSource {
  readonly chase: string;
  readonly buildHash: string;
  /** From the zip mtime: whole seconds, even (DOS time keeps 2 s), UTC. */
  readonly sourceDateEpoch: number;
}

/** The rebuild at the stated inputs, or why none could run. */
export type Rebuilt = { readonly buildHash: string; readonly bytes: Uint8Array } | { readonly reason: string };

/** Core's rebuild of a stated source (core/src/artifact-rebuild.ts, the only holder of BuildInputs). */
export type ArtifactRebuild = (stated: StatedSource) => Promise<Rebuilt>;

export type InsertableAssertion = Extract<Assertion, { readonly type: "insertable" }>;

/** What the M02-T09 insertion search measured for one insertable pair; the check holds the verdict (D-055). */
export type InsertMeasure = Pick<InsertCaseView, "verdict" | "stop" | "poses" | "maxTiltDeg" | "clearing">;

export interface KernelViews {
  /** Triangles of a mesh the Part IR names, mm; undefined when the bytes are not at hand. */
  mesh?(ref: MeshRef): MeshData | undefined;
  /** Triangles by meshHash, for FrameDecl.assemblyTwin. */
  meshByHash?(hash: string): MeshData | undefined;
  /** The body's declared base shape (the draft's BodyDraft.base), for the stack band checks. */
  shape?(part: string, body: string): ShapeDecl | undefined;
  /** Rebuild of the source a 3MF states (CHK-ART-02). */
  readonly rebuild?: ArtifactRebuild;
  /**
   * The insertion search (sim.sweep --mode insert, M02-T09) for one
   * insertable assertion of an assembly; undefined when the caller's scene
   * has no case for that pair.
   */
  insert?(assembly: string, a: InsertableAssertion): Promise<InsertMeasure | undefined>;
  /** The interference declaration of one assembly for CHK-ASM-11 (M04-T11); undefined when the caller has none for it. */
  readonly interference?: InterferenceView;
  /**
   * circuit.solve's port pass (M05-T06): the pullup or adc read of one port
   * of a part, solved on the extracted nets, or a declared series net's
   * total (M05-T12), or a charge-release read (M05-T19); undefined when
   * the caller solved none for it. CHK-NET-05, CHK-NET-06, CHK-NET-28 and
   * CHK-NET-29 read it.
   */
  readonly circuit?: CircuitView;
  /**
   * The cut file nest wrote for one sheet, and its SVG twin when written
   * (M07-T06); undefined when the caller exported none for it. CHK-SHT-03
   * reads it.
   */
  readonly sheetCut?: SheetCutView;
  /**
   * The findings nest's connectivity kernels returned for the parts on one
   * sheet (M07-T04, packages/nest/src/connect.ts), each tagged with its
   * check id; undefined when the caller nested nothing for it (M07-T14).
   * CHK-SHT-01, 02 and 07 read it.
   */
  readonly sheetConnect?: SheetConnectView;
  /**
   * circuit.solve's net extraction of one part, with net to net gaps
   * measured (M05-T10); undefined when the caller extracted none for it.
   * CHK-NET-01, CHK-NET-02 (solid form) and CHK-NET-12 read it.
   */
  readonly extraction?: (part: string) => Extraction | undefined;
  /** A part of the project by id, for project-level checks that read a part's Part IR (CHK-NET-12). */
  readonly part?: (id: string) => Part | undefined;
  /** The loaded catalog (committed rows and the .hbf cache), for checks that read strapping, boot and pin rows (CHK-BRD-04, M08-T04). */
  readonly catalog?: Catalog;
  /**
   * The board readers core runs outside the package (M08-T07, M08-T08):
   * the two-parser reparse of a fab zip against its BoardRecord, through uv;
   * undefined when the caller has no board kernel at hand.
   */
  readonly board?: BoardView;
}

/** What tools/py/board/reparse.py reports for one fab set (M08-T07). */
export interface ReparseReport {
  readonly ok: boolean;
  /** One line per failed assertion, as the script prints it. */
  readonly fails: readonly string[];
  /** Every line the script printed, in order. */
  readonly lines: readonly string[];
  /** Worst symmetric difference over the compared layers, mm2. */
  readonly worstSymdiff: number;
  /** The script's whole report (vector, drills, pour, raster, legacy), for goldens. */
  readonly detail?: unknown;
}

/** What the lead landing check reads beside the record (M08-T09 step 2). */
export interface LandingInput {
  /** Footprint origin, rotation (degrees) and model name per ref: the placement the generator used. */
  readonly placements: Readonly<Record<string, { readonly x: number; readonly y: number; readonly rot: number; readonly model: string }>>;
  /** Per model: bounds (Y-up, mm) and lead positions in the footprint frame (mm), from tools/py/board/model_leads.py. */
  readonly models: Readonly<Record<string, { readonly bbox: readonly (readonly number[])[]; readonly leads: readonly (readonly [number, number])[] }>>;
  /** Declared allowances {ref: [mm, reason]}: a lead may land this far from its pad, with the reason. */
  readonly allow: Readonly<Record<string, readonly [number, string]>>;
}

export interface BoardView {
  /** Reparse a fab zip against the record of the Part it came from; undefined when the zip holds no gerbers. */
  readonly reparse?: (zip: Uint8Array, record: unknown) => Promise<ReparseReport | undefined>;
  /** The placements, models and allowances of one board part; undefined when none are at hand. */
  readonly landing?: (part: string) => LandingInput | undefined;
}

/** A finding reason for a board view the caller did not supply. */
export const NO_BOARD_VIEW = "board readers not supplied to the registry: core runs the reparse through uv";

/** A finding reason for a part circuit.solve did not extract. */
export const NO_EXTRACTION = "net extraction not supplied to the registry: circuit.solve extracts the nets of a routed part";

/** One sheet's DXF bytes, file name and SVG twin text; undefined when not exported. */
export type SheetCutView = (sheet: string) => { readonly name: string; readonly dxf: Uint8Array; readonly svg?: string } | undefined;

/** The connectivity findings of one sheet's parts, each tagged with its check id; undefined when not nested. */
export type SheetConnectView = (sheet: string) => readonly { readonly check: string; readonly finding: Finding }[] | undefined;

/** A finding reason for a sheet whose connectivity the registry was not handed. */
export const NO_SHEET_CONNECT = "connectivity not supplied to the registry: nest runs its kernels on the sheet's parts before it places them (packSheets)";

/** A finding reason for a sheet whose cut file the registry was not handed. */
export const NO_SHEET_CUT = "cut file not supplied to the registry: the DXF exporter writes it through the nest writer";

/** The solved read of one port; undefined when circuit.solve did not solve it. A declared series net (M05-T12) answers its SeriesPort. */
export type CircuitView = (part: string, port: string) => PullupPort | AdcPort | SeriesPort | ChargePort | undefined;

/** A finding reason for a port circuit.solve did not hand the registry. */
export const NO_CIRCUIT = "operating point not supplied to the registry: circuit.solve solves the port on the extracted nets";

/** The thresholds a design declares for its interference audit, and where they come from. */
export interface InterferenceDecl {
  /** A pair that is not a declared touch pair clashes above this, mm3. */
  readonly tolMm3: number;
  /** A declared touch pair clashes above this squeeze, mm3. */
  readonly touchCeilingMm3: number;
  /** Bounding boxes apart by at least this on one axis skip the boolean, mm. */
  readonly boxMarginMm: number;
  readonly origin: string;
}

/** The interference declaration of one assembly; undefined when the caller has none for it. */
export type InterferenceView = (assembly: string) => InterferenceDecl | undefined;

/** CheckCtx as the registry builds it: the spec fields plus the kernel views. */
export type RegistryCtx = CheckCtx & { readonly views?: KernelViews };

export const viewsOf = (ctx: CheckCtx): KernelViews => (ctx as RegistryCtx).views ?? {};

/** A finding reason for a view the caller did not supply. */
export const NO_MESH = "mesh bytes not supplied to the registry: the caller resolves hbf://mesh uris (store or build in memory)";
