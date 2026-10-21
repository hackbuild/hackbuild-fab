// spec/commands.ts
/**
 * Status: draft until M-S exit B. MILESTONES.md 1.5, D-179.
 * M-S runs this file first; exit B freezes the parts that table names, and
 * the rest stays draft until the milestone it names.
 */
// One command surface, three transports (CLI, MCP, HTTP). 30 CLI commands
// in six groups (D-106) and 19 MCP tools with underscore names in a fixed
// order (D-107, D-193). Every command returns CommandResult: evidence with a
// verdict, errors, artifacts and the next call. The core loop is one call:
// part.build runs every applicable check and returns its findings, so a
// caller needs check.run only for a subset, an exported file or a later
// page. MCP names are fixed by D-107 and differ from some CLI names
// (catalog_search, canon_search); every MCP description opens with the
// CLI commands it covers, so a model reads one vocabulary.
// Version 4, 2026-10-04. Carries D-050, D-064, D-106, D-107, D-108, D-109,
// D-110, D-111, D-113, D-114, D-115, D-133, D-161, D-193.
//
// hbf is a working name (D-012). Raising either count edits five files in
// one commit: spec/commands.ts, spec/fixtures/surface.ts,
// spec/test/surface.test.ts, core/test/surface.test.ts and the reason line
// in docs/explanation/command-surface.md.

import type {
  ArtifactHash, ArtifactUri, BuildHash, BuildUri, FaceFrame, FaceRef, Hash, HbfUri, Mm, Process, ReportUri, Tier, Vec3, Verdict,
} from "./ids";
import type { CatalogHit, PinDef } from "./catalog";
import type { Provenance } from "./profile";
import type { CheckResult, ProjectGraph, ResultTarget } from "./checks";
import type { ConstraintDim, Interval, ParamEnvelope, ParamPointer } from "./constraints";
import type { ArchetypeStatus, CanonOriginal, DerivedValue, MechanismStatus } from "./canon";
import type { McuPinSpec, Net, OperatingPoint, ReadOutputs } from "./circuit";
import type { AppliedArchetype, ChaseKind, MaterialSlot } from "./chase";
import type { ViewMode } from "./bench";
import type { ObserveCapability } from "./capabilities";
import type { CommandError } from "./errors";
import type { Assembly, Assertion, Body, BuildWarning, FrameDecl, Metric, Part, Pose } from "./part-ir";
import type { KerfMode, NestMode, NestResult } from "./nest";
import type { MotionRunResult, PlanResult } from "./motion";
import type { SchemaLike } from "./schema";
import type { SweepResult, TrialResult } from "./sim";

// gen:command-io imports (npm run registries; never edit by hand)
import type { AdoptIO } from "./command-io/adopt";
import type { ArchApplyIO } from "./command-io/arch.apply";
import type { ArchFindIO } from "./command-io/arch.find";
import type { AsmSolveIO } from "./command-io/asm.solve";
import type { CatalogFindIO } from "./command-io/catalog.find";
import type { CatalogPinsIO } from "./command-io/catalog.pins";
import type { ChaseBakeIO } from "./command-io/chase.bake";
import type { ChaseDiffIO } from "./command-io/chase.diff";
import type { ChasePatchIO } from "./command-io/chase.patch";
import type { ChaseRenderIO } from "./command-io/chase.render";
import type { ChaseScaffoldIO } from "./command-io/chase.scaffold";
import type { ChaseValidateIO } from "./command-io/chase.validate";
import type { CheckRunIO } from "./command-io/check.run";
import type { CircuitSolveIO } from "./command-io/circuit.solve";
import type { ConstraintsQueryIO } from "./command-io/constraints.query";
import type { DraftIO } from "./command-io/draft";
import type { ExportRunIO } from "./command-io/export.run";
import type { FitsTableIO } from "./command-io/fits.table";
import type { InitIO } from "./command-io/init";
import type { KnowledgeSearchIO } from "./command-io/knowledge.search";
import type { MechDeriveIO } from "./command-io/mech.derive";
import type { MechFindIO } from "./command-io/mech.find";
import type { MotionRunIO } from "./command-io/motion.run";
import type { NestPackIO } from "./command-io/nest.pack";
import type { PartBuildIO } from "./command-io/part.build";
import type { PartInspectIO } from "./command-io/part.inspect";
import type { PartProbeIO } from "./command-io/part.probe";
import type { ProjectGraphIO } from "./command-io/project.graph";
import type { ReferenceListIO } from "./command-io/reference.list";
import type { RulesAuditIO } from "./command-io/rules.audit";
import type { SimRunIO } from "./command-io/sim.run";
import type { SimSweepIO } from "./command-io/sim.sweep";
import type { ViewRenderIO } from "./command-io/view.render";
// end gen:command-io imports

// Names.

export const GROUPS = ["query", "author", "build", "prove", "look", "make"] as const;
export type Group = (typeof GROUPS)[number];

// gen:command-io names (npm run registries; never edit by hand)
/**
 * The CLI commands by group (D-106), one file each in spec/command-io/.
 * asm.declare folds into part.build, and so does import for audit (D-146,
 * D-160): part.build with `import` set builds one Part from an STL, GLB,
 * STEP, WRL or OpenSCAD file.
 */
export const COMMAND_NAMES = [
  // query (8)
  "constraints.query", "catalog.find", "catalog.pins", "mech.find", "mech.derive", "arch.find",
  "knowledge.search", "reference.list",
  // author (6)
  "chase.scaffold", "chase.validate", "chase.diff", "chase.patch", "arch.apply", "init",
  // build (4)
  "part.build", "part.inspect", "part.probe", "asm.solve",
  // prove (7)
  "check.run", "fits.table", "sim.run", "sim.sweep", "circuit.solve", "motion.run", "rules.audit",
  // look (3)
  "view.render", "chase.render", "project.graph",
  // make (5)
  "chase.bake", "nest.pack", "export.run", "draft", "adopt",
] as const;
export type CommandName = (typeof COMMAND_NAMES)[number];

export const COMMAND_GROUP = {
  "constraints.query": "query", "catalog.find": "query", "catalog.pins": "query",
  "mech.find": "query", "mech.derive": "query", "arch.find": "query", "knowledge.search": "query",
  "reference.list": "query",
  "chase.scaffold": "author", "chase.validate": "author", "chase.diff": "author",
  "chase.patch": "author", "arch.apply": "author", "init": "author",
  "part.build": "build", "part.inspect": "build", "part.probe": "build", "asm.solve": "build",
  "check.run": "prove", "fits.table": "prove", "sim.run": "prove", "sim.sweep": "prove",
  "circuit.solve": "prove", "motion.run": "prove", "rules.audit": "prove",
  "view.render": "look", "chase.render": "look", "project.graph": "look",
  "chase.bake": "make", "nest.pack": "make", "export.run": "make", "draft": "make", "adopt": "make",
} as const satisfies Record<CommandName, Group>;

/** CLI-only commands, marked cli only in their spec/command-io file; project.graph is also served as a resource (hbf://project/graph), the rest wait on the MCP projection decision (engine brief finding F4). */
export const CLI_ONLY = ["init", "project.graph", "draft", "adopt"] as const satisfies readonly CommandName[];
// end gen:command-io names

/** Utility verbs: no CommandResult, no verdict. */
export const UTILITY_VERBS = ["mcp", "doctor", "explain", "gc", "parity", "counts", "evidence"] as const;
export type UtilityVerb = (typeof UTILITY_VERBS)[number];

/** The 19 MCP tools, in the fixed order servers return them (D-107; position 12 is layout_solve, D-193). Names match ^[a-zA-Z0-9_-]{1,128}$. */
export const MCP_TOOL_NAMES = [
  "constraints_query", "catalog_search", "canon_search", "mech_derive", "knowledge_search",
  "chase_scaffold", "chase_validate", "chase_patch", "arch_apply", "part_build",
  "part_probe", "layout_solve", "check_run", "sim_run", "circuit_solve",
  "motion_run", "view_render", "chase_bake", "export_run",
] as const;
export type McpToolName = (typeof MCP_TOOL_NAMES)[number];

/** Claude API tool name pattern. */
export const TOOL_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;


// Result contract (D-064).

export type Stage = "input" | "preflight" | "build" | "check" | "gate" | "done";

export interface Artifact {
  /** hbf://artifact/<hash>. */
  readonly uri: ArtifactUri;
  /** Exporter registry id, or "png" and "report" for evidence. */
  readonly kind: string;
  readonly mediaType: string;
  readonly hash: ArtifactHash;
  /** Size, bytes. */
  readonly bytes: number;
}

/**
 * One suggested call. The text mirror prints `next  <tool> <toolArgs as
 * JSON>` over MCP and `next  hbf <command> <flags>` on the CLI, one call per
 * line (AGENT-SURFACE.md 6.3).
 */
export interface NextCall {
  readonly command: CommandName;
  readonly args: Readonly<Record<string, unknown>>;
  /** MCP form, derived from MCP_TOOLS covers and the selector; absent for CLI_ONLY commands. */
  readonly tool?: McpToolName;
  /** Strict MCP args with the selector set and every unset field null; present with tool. */
  readonly toolArgs?: Readonly<Record<string, unknown>>;
  /** One line. A NextCall carries complete args: running it verbatim never returns E_SCHEMA, E_REF or E_PARAM_MISSING. */
  readonly why: string;
}

/** An inferred profile row and the checks whose verdict it moves. */
export interface InferredRead {
  /** Profile row as table/id, for example "resistivity/cpla-pip-preset". */
  readonly row: string;
  /** Check ids whose measured or legal value read this row. */
  readonly movesChecks: readonly string[];
}

export interface CommandResult<T> {
  /** Set by the registry from resultOk; a command never sets it. */
  readonly ok: boolean;
  readonly verdict: Verdict;
  readonly stage: Stage;
  readonly result?: T;
  readonly buildHash?: BuildHash;
  /** RFC 8785 canonical args hash; one field of RepeatKey (D-111). */
  readonly inputsHash: Hash;
  /** Fail first, then warn; passes are counted only. */
  readonly findings: readonly CheckResult[];
  /** Verdict counts, each a count. */
  readonly counts: { /** count */ readonly pass: number; /** count */ readonly warn: number; /** count */ readonly fail: number; /** count */ readonly skip: number };
  readonly errors: readonly CommandError[];
  readonly artifacts: readonly Artifact[];
  /** Present when the summary cap cut findings (D-110); omitted is a count. */
  readonly truncated?: { /** count */ readonly omitted: number; readonly cursor: string };
  readonly next: readonly NextCall[];
  readonly gate?: "approval";
}

/**
 * The one place ok is computed: true when verdict is pass or warn and
 * errors is empty. The registry applies it to every run() result before any
 * transport sees it.
 */
export const resultOk = (r: { readonly verdict: Verdict; readonly errors: readonly CommandError[] }): boolean =>
  (r.verdict === "pass" || r.verdict === "warn") && r.errors.length === 0;

// Supporting shapes.

export type Detail = "summary" | "full";

/** A FITS row (PIP shape): group, label, measured, verdict and one-line note. */
export interface FitRow {
  readonly group: string;
  readonly label: string;
  readonly measured: string;
  readonly verdict: Verdict;
  readonly note: string;
  readonly class?: string;
  /** Drawn gap, mm. */
  readonly drawn?: Mm;
  /** Real gap after loss, mm. */
  readonly real?: Mm;
  /** Legal real band, mm. */
  readonly band?: readonly [Mm, Mm];
}

export interface CanonHit {
  readonly id: string;
  readonly canon: "mechanisms" | "archetypes" | "reference";
  readonly family: string;
  readonly summary: string;
  readonly processes: readonly Process[];
  readonly tier?: Tier;
  /**
   * The registry status; typed or proven hits rank before stub, candidate
   * and unproven ones (M06-T11 step 1). Added at M06-T11, with the fields
   * below, so a hit carries what the card lists.
   */
  readonly status?: MechanismStatus | ArchetypeStatus;
  /** Why a refused entry is refused and the card that promotes it. */
  readonly statusReason?: string;
  /** Degrees of freedom, count; mechanisms only, null where the source is silent. */
  readonly dof?: number | null;
  /** Seed provenance line. */
  readonly provenance?: string;
  /** Reference ids proving the entry; empty for a refused entry. */
  readonly reference?: readonly string[];
  /** The canonical original first (D-222), as "originals/<slug>/<file>" plus function and lines. */
  readonly original?: readonly CanonOriginal[];
  /** Archetypes only: read channels, count, null where params set it. */
  readonly channels?: number | null;
  readonly senses?: readonly string[];
  readonly emits?: readonly string[];
  /** Archetypes only: the D-078 read model. */
  readonly read?: string;
  /** Archetypes only: resistances computed at load from the declared sections, each with the tier of the row it read (D-098). */
  readonly resistances?: readonly CanonResistance[];
  /** hbf://mechanism/<id> or hbf://archetype/<id>. */
  readonly uri?: HbfUri;
}

/** One conductor section's resistance as arch.find returns it (D-098). */
export interface CanonResistance {
  readonly id: string;
  readonly material: string;
  /** ohm, or [lo, hi] when the row is a range; computed. */
  readonly ohm: number | readonly [number, number];
  readonly tier: Tier;
  readonly rowId: string;
}

/** Kind of a knowledge record (M12-T07): the record classes of knowledge/ plus check origins. */
export type KnowledgeKind =
  | "constant" | "invariant" | "ordering" | "diagnostic" | "heuristic"
  | "taste" | "kernel" | "project" | "origin";

/**
 * Text a person or another tool wrote, returned as data (AGENT-SURFACE.md 7.4).
 * Never carries instructions; never copied into summary, next or an error hint.
 */
export interface DataText {
  /** Source of the text, such as hbf://knowledge/<stem>#<anchor> or hbf://profile/material/<id>. */
  readonly uri: HbfUri;
  /** Provenance tier of the source row; knowledge and reference text takes the lowest tier it cites, inferred when it cites none. */
  readonly tier: Tier;
  /** Contributor id, required in practice for community tier text (D-042). */
  readonly contributor?: string;
  readonly text: string;
}

/** One ranked knowledge record (M12-T07); at most 10 per search. */
export interface KnowledgeHit {
  /** Stable record id `<file stem>#<anchor>`, generated into knowledge/INDEX.json. */
  readonly id: string;
  readonly uri: `hbf://knowledge/${string}`;
  /** Repo-relative path of the markdown file holding the record. */
  readonly file: string;
  /** 1-based line of the record heading or table row, count. */
  readonly line: number;
  readonly title: string;
  /** Matching text, trimmed to the record, wrapped as data with its tier. */
  readonly excerpt: DataText;
  readonly kind: KnowledgeKind;
  /** Check origin uri when the record is cited by a check origin, such as hbf://check/CHK-KEY-04. */
  readonly origin?: string;
}

export interface ReferenceEntry {
  /** reference/<area>/<id>. */
  readonly path: string;
  readonly id: string;
  /** Registry ids this reference covers. */
  readonly covers: readonly string[];
  readonly status: "green" | "red" | "not run";
}

export interface FeatureView {
  readonly id: string;
  readonly kind: string;
  /** Resolved field values; numbers in the field's unit. */
  readonly resolved: Readonly<Record<string, number | string>>;
  readonly checks: readonly string[];
}

export interface ProbeResult {
  readonly hit: boolean;
  readonly part?: string;
  readonly body?: string;
  readonly feature?: string;
  /** Wall thickness at the hit, mm. */
  readonly thickness?: Mm;
  readonly material?: string;
  /** Hit point, mm; present when hit is true and the probe was a ray or at. */
  readonly point?: Vec3;
  /** Outward unit normal of the hit triangle, unitless; present with point. */
  readonly normal?: Vec3;
  readonly nearest: readonly { readonly feature: string; /** mm */ readonly mm: Mm }[];
}

/** A typed completeness question from chase.validate (D-133). */
export interface ValidateQuestion {
  /** Rule id, such as Q-STACK, Q-TIER or Q-OWNER-D-087; path disambiguates repeats. */
  readonly id: string;
  /** JSON pointer into the chase. */
  readonly path: string;
  readonly question: string;
  readonly options?: readonly string[];
  /** The value the build uses until the question is answered; absent when none applies. */
  readonly defaultInForce?: string;
}

/**
 * One chase.patch edit: a text anchor that must match exactly once, a JSON
 * pointer (D-115), or a whole-file write. replaceWhole is valid only when
 * chase.patch `file` is a build.ts and it is the only edit in the call
 * (E_SCHEMA otherwise). It writes the whole file when the chase's defHash
 * equals ifDefHash and returns E_STALE otherwise. A param edit resolves a
 * design-param value pointer, such as Fix.param, to one literal span in the
 * chase source: the field default when `in` is absent or "default", or the
 * value under the named preset. A pointer through a list index
 * (/keys/0/gap) names an instance, so it requires in.preset; with in
 * "default" it is E_SCHEMA. A pointer or param edit that names no node in
 * the chase is E_REF with didYouMean over the chase's pointers.
 */
export type PatchEdit =
  | { readonly anchor: string; readonly replace: string }
  | { readonly pointer: string; readonly set: unknown }
  | { readonly replaceWhole: string; readonly ifDefHash: Hash }
  | { readonly param: ParamPointer; readonly set: number | string | boolean; readonly in?: "default" | { readonly preset: string } };

/**
 * One value chase.diff found changed, by JSON pointer into the migrated
 * chase. from is null when op is added, to is null when op is removed; a
 * subtree present on one side only is one change at its root.
 */
export interface ChaseChange {
  readonly op: "added" | "removed" | "changed";
  readonly path: string;
  readonly from: unknown;
  readonly to: unknown;
}

/** One line of a chase migration report (packages/chase migrate). */
export interface ChaseMigrationLine {
  /** JSON pointer in the document before the migration. */
  readonly pointer: string;
  readonly change: "converted" | "dropped" | "filled" | "moved" | "set";
  readonly from?: unknown;
  readonly to?: unknown;
  readonly why: string;
}

/** The migrations chase.diff applied to one side; from equals to and lines is empty when none ran. */
export interface ChaseMigrations {
  readonly from: number;
  readonly to: number;
  readonly lines: readonly ChaseMigrationLine[];
}

/** One check whose verdict moved between two builds, from chase.diff with build true. */
export interface ChaseVerdictChange {
  readonly check: string;
  readonly target: ResultTarget;
  readonly from: Verdict;
  readonly to: Verdict;
  /** Measured value before and after, in the check's unit. */
  readonly measuredFrom: number | null;
  readonly measuredTo: number | null;
}

/** Summary of one built part, for --detail summary. */
export interface PartSummary {
  readonly id: string;
  readonly bodies: readonly Pick<Body, "id" | "role" | "slot" | "material">[];
  /** Solid volume, mm3. */
  readonly volumeMm3: number;
  /** Triangle count. */
  readonly triangles: number;
}

// Inputs and outputs per command. Optional arguments are optional fields
// (`only?: readonly string[]`), the form a person calling @hackbuild/kernel
// writes. Strict tool modes want every field required, so the MCP
// projection is derived from these types (StrictArgs, McpToolIO below):
// one source, two projections. Outputs keep null for absent values.

/**
 * A file to build as a body of one Part for audit (D-146, D-160). The Part carries
 * source `{ kind: "imported" }`, is placeable and checkable, never
 * parametrised. Import welds on the dyadic grid (D-054), computes signed
 * volume and refuses a body with negative signed volume with E_KERNEL
 * naming the file (D-102; the PLINTH rp2040 stand-in reads -6506 mm3,
 * computed). An OpenSCAD render that prints "Ignoring unknown" returns
 * E_KERNEL with the line, since OpenSCAD itself exits 0 (D-146). STL and GLB
 * land at M04, OpenSCAD at M04 where the binary is present, STEP and WRL
 * at M14.
 */
export interface ImportSpec {
  /** Path relative to the workspace, or an hbf://source/<sha256> URI. */
  readonly path: string;
  readonly format: "stl" | "glb" | "step" | "wrl" | "scad";
  /** File length unit, scaled to mm on import; absent takes the format default, m for GLB, mm for the rest. */
  readonly units?: "mm" | "cm" | "m" | "in";
  /** body: a Body of the Part; bought: a BoughtBody with tier inferred until a catalog row claims it (D-102). */
  readonly as: "body" | "bought";
  /**
   * Profile material id for the body. Absent imports geometry for audit
   * only; a conductive material lets net extraction and circuit.solve run
   * on another tool's output (the reverse check, M05-T12).
   */
  readonly material?: string;
  /**
   * Pieces the file holds after its own union, default 1, an integer at
   * least 1. A plate of several pieces is legal only when declared, and the
   * declaration enters the build hash. On the cli, `path#N`.
   */
  readonly pieces?: number;
}

export interface CommandIO {
// gen:command-io io (npm run registries; never edit by hand)
  "constraints.query": ConstraintsQueryIO;
  "catalog.find": CatalogFindIO;
  "catalog.pins": CatalogPinsIO;
  "mech.find": MechFindIO;
  "mech.derive": MechDeriveIO;
  "arch.find": ArchFindIO;
  "knowledge.search": KnowledgeSearchIO;
  "reference.list": ReferenceListIO;
  "chase.scaffold": ChaseScaffoldIO;
  "chase.validate": ChaseValidateIO;
  "chase.diff": ChaseDiffIO;
  "chase.patch": ChasePatchIO;
  "arch.apply": ArchApplyIO;
  "init": InitIO;
  "part.build": PartBuildIO;
  "part.inspect": PartInspectIO;
  "part.probe": PartProbeIO;
  "asm.solve": AsmSolveIO;
  "check.run": CheckRunIO;
  "fits.table": FitsTableIO;
  "sim.run": SimRunIO;
  "sim.sweep": SimSweepIO;
  "circuit.solve": CircuitSolveIO;
  "motion.run": MotionRunIO;
  "rules.audit": RulesAuditIO;
  "view.render": ViewRenderIO;
  "chase.render": ChaseRenderIO;
  "project.graph": ProjectGraphIO;
  "chase.bake": ChaseBakeIO;
  "nest.pack": NestPackIO;
  "export.run": ExportRunIO;
  "draft": DraftIO;
  "adopt": AdoptIO;
// end gen:command-io io
}

export type CommandInput<N extends CommandName> = CommandIO[N]["input"];

/**
 * Input fields that reach the network, CLI only. The MCP server makes no
 * network call (AGENT-SURFACE standard rule 10, openWorldHint false on every
 * tool), so McpToolIO omits these fields and the server answers one as an
 * unknown key, E_SCHEMA. catalog.find `fetch` clones the KiCad footprint
 * mirror into the workspace .hbf/cache/git and writes .hbf cache rows (M08-T14);
 * this is the M12 resolution of that M08 open item.
 */
export const CLI_ONLY_FIELDS = { "catalog.find": ["fetch"] } as const satisfies {
  readonly [N in CommandName]?: readonly (keyof CommandInput<N> & string)[];
};
/** The CLI-only input fields of a command; never for most. */
export type CliOnlyField<N extends CommandName> = N extends keyof typeof CLI_ONLY_FIELDS ? (typeof CLI_ONLY_FIELDS)[N][number] : never;
/** A command's input as the MCP route accepts it: CommandInput without its CLI-only fields. */
export type McpCommandInput<N extends CommandName> = [CliOnlyField<N>] extends [never] ? CommandInput<N> : Omit<CommandInput<N>, CliOnlyField<N>>;
export type CommandOutput<N extends CommandName> = CommandIO[N]["output"];

// Definitions and context.

/** The subset of AbortSignal a command reads; DOM and Node signals satisfy it. */
export interface AbortSignalLike {
  readonly aborted: boolean;
  throwIfAborted(): void;
}

/** Content-addressed store under <workspace>/.hbf/store (D-050). */
export interface StoreHandle {
  get(uri: HbfUri): Promise<unknown>;
  has(uri: HbfUri): Promise<boolean>;
  put(kind: "build" | "mesh" | "report" | "artifact", bytes: Uint8Array): Promise<HbfUri>;
}

/**
 * Claim signed into requestState (D-109). What it binds: one approval to one
 * command, one args digest and one build hash, once, for 10 minutes, so an
 * MCP client cannot reuse an approval for a different or moved build. What
 * it does not stop: an actor holding the user's shell. The key in
 * .hbf/gate.key is readable by that user, `script -q` gives any process a
 * TTY, and export output is an ordinary file such an actor can write
 * directly. Physical actions are gated elsewhere: consequential
 * capabilities (send.print, fire.laser, heat.bed, cut.vinyl) are armed by a
 * person in the UI per device per session, and no MCP tool or CLI command
 * arms one (D-161, McpToolDef.requires).
 */
export interface GateClaim {
  readonly cmd: CommandName;
  /**
   * sha256 of RFC 8785 JSON of the CommandIO input with requestState
   * removed and every absent or false-default field dropped (D-109). MCP
   * nulls become absent before digesting, so the CLI, library and MCP forms
   * of one call give one digest.
   */
  readonly argsDigest: Hash;
  readonly buildHash: BuildHash;
  /** Expiry, epoch ms. */
  readonly exp: number;
  /** Single-use nonce, recorded in .hbf/gate-used.jsonl. */
  readonly nonce: string;
}

/**
 * Set only by the gate after it verifies MAC, expiry, nonce and build hash.
 * Records that a client answered for this build; it does not identify a
 * person and is no defence against a local actor with a shell (GateClaim).
 */
export interface VerifiedApproval {
  readonly claim: GateClaim;
  readonly via: "elicitation" | "tty";
}

export interface CommandCtx {
  /** Set from server config; no tool argument sets it. */
  readonly workspace: string;
  /** Writes go to hbf/<chase> (D-115). */
  readonly branch: string;
  readonly store: StoreHandle;
  readonly transport: "cli" | "mcp" | "http";
  readonly clientCaps: { readonly elicitation: boolean; readonly tasks: boolean };
  readonly approval?: VerifiedApproval;
  /** manifold ExecutionContext.cancel() hangs off this. */
  readonly signal: AbortSignalLike;
}

export interface CommandDef<N extends CommandName = CommandName> {
  readonly name: N;
  readonly group: (typeof COMMAND_GROUP)[N];
  /**
   * Written for a model first: at least three sentences, a "Do not use"
   * clause, at most 120 words, voice-linted. Reused for --help, the MCP
   * description and TypeDoc.
   */
  readonly description: string;
  readonly input: SchemaLike<unknown, CommandInput<N>>;
  readonly output: SchemaLike<unknown, CommandOutput<N>>;
  /** Drawn from reference/, validated against input at registry load. */
  readonly examples: readonly { readonly input: CommandInput<N>; readonly note: string }[];
  /**
   * outside implies the gate. network: a CLI_ONLY_FIELDS field reaches the
   * network and writes only the workspace .hbf cache (its catalog rows and
   * the git clone under .hbf/cache/git); no gate, never on the MCP route.
   * A command is "network" exactly when it has CLI_ONLY_FIELDS.
   */
  readonly writes: "nothing" | "network" | "branch" | "outside";
  readonly longRunning?: boolean;
  readonly cliOnly?: boolean;
  /** Returns the result without ok; the registry sets ok from resultOk. */
  run(input: CommandInput<N>, ctx: CommandCtx): Promise<Omit<CommandResult<CommandOutput<N>>, "ok">>;
}

export type AnyCommandDef = { [N in CommandName]: CommandDef<N> }[CommandName];

// MCP projection (D-107, D-108). Stateless server on protocol 2026-07-28
// with @modelcontextprotocol/server ^2.3.0; tasks via the
// io.modelcontextprotocol/tasks extension; a check failure is a completed
// result with a fail verdict.

/** MCP tool annotations, set explicitly on every tool (MCP defaults are readOnly false, destructive true). */
export interface McpAnnotations {
  readonly readOnlyHint: boolean;
  readonly destructiveHint: boolean;
  readonly idempotentHint: boolean;
  readonly openWorldHint: boolean;
}

export interface McpToolDef {
  readonly name: McpToolName;
  /** CLI commands this tool covers; each command is covered by exactly one tool or is CLI-only. */
  readonly covers: readonly CommandName[];
  /** The McpToolIO field that picks the covered command; null for a tool covering one command. */
  readonly selector: string | null;
  readonly annotations: McpAnnotations;
  /** Task behaviour: never, when a run exceeds 2 s, or always. */
  readonly task: "never" | "over2s" | "always";
  /** Fabrication export: host ask on mcp__hbf__export_run, elicitation gate (D-109). */
  readonly gated: boolean;
  /**
   * Capabilities the tool reads. Typed to observe capabilities only, so no
   * MCP tool can declare or arm send.print, fire.laser, heat.bed or
   * cut.vinyl; those are armed by a person in the UI (D-161).
   */
  readonly requires?: readonly ObserveCapability[];
  /** Toolset profiles besides "all" that load this tool (D-107); TOOLSET_PROFILES derives from this field. */
  readonly profiles: readonly Exclude<ToolsetProfile, "all">[];
}

/** Toolset profiles a host may load with `hbf mcp --tools <profile>` (D-107). */
export type ToolsetProfile = "all" | "query,prove" | "sweep";

/** Read tools write nothing outside the store cache; same inputs give the same result. */
const READ: McpAnnotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
/** Branch writers: a git revert on hbf/<chase> undoes them (D-115). */
const BRANCH: McpAnnotations = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };
/** Content-addressed writes; the bake is deterministic (D-129), so chase_bake is BUILD. */
const BUILD: McpAnnotations = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false };
/** Writes outside the branch; destructive per tool, also for dryRun. nest.pack writes nothing and lives on layout_solve (D-193). */
const EXPORT: McpAnnotations = { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false };

/**
 * The 19 tools in fixed order, from api-library-ai-design.md section 5.2;
 * AGENT-SURFACE.md 5.2 is the table. Names are decided (D-107) and frozen
 * at M12 only after the D-113 name eval. A tool's description starts with
 * "Covers <cli names>." built from `covers`, so the CLI name a model meets
 * in docs, findings and `next` lines is visible on the tool it calls.
 */
export const MCP_TOOLS = [
  { name: "constraints_query", covers: ["constraints.query"], selector: null, annotations: READ, task: "never", gated: false, profiles: ["query,prove", "sweep"] },
  { name: "catalog_search", covers: ["catalog.find", "catalog.pins"], selector: "op", annotations: READ, task: "never", gated: false, profiles: ["query,prove"] },
  { name: "canon_search", covers: ["mech.find", "arch.find", "reference.list"], selector: "canon", annotations: READ, task: "never", gated: false, profiles: ["query,prove"] },
  { name: "mech_derive", covers: ["mech.derive"], selector: null, annotations: READ, task: "never", gated: false, profiles: ["query,prove"] },
  { name: "knowledge_search", covers: ["knowledge.search"], selector: null, annotations: READ, task: "never", gated: false, profiles: ["query,prove"] },
  { name: "chase_scaffold", covers: ["chase.scaffold"], selector: null, annotations: BRANCH, task: "never", gated: false, profiles: [] },
  { name: "chase_validate", covers: ["chase.validate", "chase.diff"], selector: "op", annotations: READ, task: "never", gated: false, profiles: ["query,prove"] },
  { name: "chase_patch", covers: ["chase.patch"], selector: null, annotations: BRANCH, task: "never", gated: false, profiles: [] },
  { name: "arch_apply", covers: ["arch.apply"], selector: null, annotations: BRANCH, task: "never", gated: false, profiles: [] },
  { name: "part_build", covers: ["part.build", "part.inspect"], selector: "op", annotations: BUILD, task: "over2s", gated: false, profiles: ["sweep"] },
  { name: "part_probe", covers: ["part.probe"], selector: null, annotations: READ, task: "never", gated: false, profiles: [] },
  { name: "layout_solve", covers: ["asm.solve", "nest.pack"], selector: "op", annotations: BUILD, task: "over2s", gated: false, profiles: ["sweep"] },
  { name: "check_run", covers: ["check.run", "fits.table"], selector: "report", annotations: READ, task: "over2s", gated: false, profiles: ["query,prove", "sweep"] },
  { name: "sim_run", covers: ["sim.run", "sim.sweep"], selector: "mode", annotations: READ, task: "always", gated: false, profiles: ["query,prove"] },
  { name: "circuit_solve", covers: ["circuit.solve"], selector: null, annotations: READ, task: "never", gated: false, profiles: ["query,prove"] },
  { name: "motion_run", covers: ["motion.run", "rules.audit"], selector: "op", annotations: READ, task: "over2s", gated: false, profiles: ["query,prove"] },
  { name: "view_render", covers: ["view.render"], selector: null, annotations: READ, task: "never", gated: false, profiles: ["sweep"] },
  { name: "chase_bake", covers: ["chase.bake", "chase.render"], selector: "mode", annotations: BUILD, task: "always", gated: false, profiles: [] },
  { name: "export_run", covers: ["export.run"], selector: null, annotations: EXPORT, task: "always", gated: true, requires: ["print.3mf", "cut.svg"], profiles: ["sweep"] },
] as const satisfies readonly McpToolDef[];

// MCP tool inputs, derived from CommandIO. StrictArgs turns every optional
// field into a required field that also accepts null, at every depth, since
// strict tool modes want every field required. A tool covering one command
// takes StrictArgs of that command's input. A tool covering several takes
// its selector plus every field of every covered command: a field all
// covered commands require stays required without null, any other field
// accepts null. CLI_ONLY_FIELDS are left out of every tool input. Every grouped tool selects with an explicit enum (`op`,
// `canon`, `report` or `mode`). The server routes on the selector, turns
// each absent value into an absent field (McpArgsIn) and passes the chosen
// command exactly its own CommandIO input. The zod schemas of M12-T01 derive from these types: a field
// optional in CommandIO becomes `.nullable()` plus a preprocess that drops
// null, so the library schema and the MCP schema come from one source.

type Primitive = string | number | boolean | bigint | symbol | null | undefined;
type Flat<T> = { [K in keyof T]: T[K] };

/**
 * The strict MCP form of a CommandIO input: optional fields become required
 * and nullable, recursively through objects, arrays and tuples. Records
 * with an index signature (Params, Facts) pass through unchanged, and
 * branded strings stay branded.
 */
export type StrictArgs<T> = T extends Primitive
  ? T
  : T extends readonly unknown[]
    ? { [I in keyof T]: StrictArgs<T[I]> }
    : string extends keyof T
      ? T
      : { [K in keyof T]-?: {} extends Pick<T, K> ? StrictArgs<Exclude<T[K], undefined>> | null : StrictArgs<T[K]> };

/**
 * The inverse the server applies before routing: every null in a strict
 * argument object becomes an absent field, giving the CommandIO input.
 * Before routing, a field that is null, absent, false, an empty string or an
 * empty array counts as absent. E_SCHEMA only for an unknown key, a wrong
 * type, or a non-absent value owned by another covered command. Typed here
 * so core's projection has one signature to implement.
 */
export type McpArgsIn = <N extends CommandName>(command: N, args: StrictArgs<McpCommandInput<N>>) => CommandInput<N>;

/** Fields of A and B: shared keys keep both types; a key only one side has becomes nullable. */
type Merge<A, B> = Flat<
  { [K in keyof A & keyof B]: A[K] | B[K] }
  & { [K in Exclude<keyof A, keyof B>]: A[K] | null }
  & { [K in Exclude<keyof B, keyof A>]: B[K] | null }
>;
type In<N extends CommandName> = StrictArgs<McpCommandInput<N>>;
/** nest.pack's input as layout_solve carries it: `mode` renamed `nestMode` so no nest field reads as a selector. */
type NestArgs = Flat<Omit<In<"nest.pack">, "mode"> & { nestMode: In<"nest.pack">["mode"] }>;
/** chase.bake's input as chase_bake carries it: `mode` renamed `bakeMode` so it does not read as the selector. */
type BakeArgs = Flat<Omit<In<"chase.bake">, "mode"> & { bakeMode: In<"chase.bake">["mode"] }>;

export interface McpToolIO {
  constraints_query: In<"constraints.query">;
  /** Selector: `op` find runs catalog.find, pins runs catalog.pins. No `fetch`: CLI only (CLI_ONLY_FIELDS). */
  catalog_search: Flat<{ op: "find" | "pins" } & Merge<In<"catalog.find">, In<"catalog.pins">>>;
  /** Selector: `canon` mechanisms runs mech.find, archetypes arch.find, reference reference.list. */
  canon_search: Flat<{ canon: "mechanisms" | "archetypes" | "reference" } & Merge<Merge<In<"mech.find">, In<"arch.find">>, In<"reference.list">>>;
  mech_derive: In<"mech.derive">;
  knowledge_search: In<"knowledge.search">;
  chase_scaffold: In<"chase.scaffold">;
  /** Selector: `op` validate runs chase.validate, diff runs chase.diff (against nullable, as on the CLI). */
  chase_validate: Flat<{ op: "validate" | "diff" } & Merge<In<"chase.validate">, In<"chase.diff">>>;
  chase_patch: In<"chase.patch">;
  arch_apply: In<"arch.apply">;
  /** Selector: `op` build runs part.build, inspect runs part.inspect (`part` a build or part URI). */
  part_build: Flat<{ op: "build" | "inspect" } & Merge<In<"part.build">, In<"part.inspect">>>;
  part_probe: In<"part.probe">;
  /** Selector: `op` assembly runs asm.solve, nest runs nest.pack with `parts`, `sheet`, `machine` and `nestMode`; both write only to the store (D-193). */
  layout_solve: Flat<{ op: "assembly" | "nest" } & Merge<In<"asm.solve">, NestArgs>>;
  /** Selector: `report` findings runs check.run, fits runs fits.table. */
  check_run: Flat<{ report: "findings" | "fits" } & Merge<In<"check.run">, In<"fits.table">>>;
  /** Selector: `mode` trials runs sim.run, sweep runs sim.sweep. */
  sim_run: Flat<{ mode: "trials" | "sweep" } & Merge<In<"sim.run">, In<"sim.sweep">>>;
  circuit_solve: In<"circuit.solve">;
  /** Selector: `op` run runs motion.run, audit runs rules.audit. */
  motion_run: Flat<{ op: "run" | "audit" } & Merge<In<"motion.run">, In<"rules.audit">>>;
  view_render: In<"view.render">;
  /** Selector: `mode` bake runs chase.bake (its own mode as `bakeMode`), render runs chase.render. */
  chase_bake: Flat<{ mode: "bake" | "render" } & Merge<BakeArgs, In<"chase.render">>>;
  /** export.run alone, gated when the exporter has fabrication true (D-109, D-193). */
  export_run: In<"export.run">;
}

export type McpToolInput<T extends McpToolName> = McpToolIO[T];

/** What the server hands the registry after reading the selector and applying McpArgsIn. */
export type McpRoute = { [N in CommandName]: { readonly command: N; readonly input: CommandInput<N> } }[CommandName];

/** The tools a profile loads, in wire order; "all" loads every tool. */
export function toolsFor(profile: ToolsetProfile): readonly McpToolDef[] {
  const all: readonly McpToolDef[] = MCP_TOOLS;
  return profile === "all" ? all : all.filter((t) => t.profiles.includes(profile));
}

/** Toolset profiles a host may load (D-107), derived from MCP_TOOLS[].profiles. */
export const TOOLSET_PROFILES: Readonly<Record<ToolsetProfile, readonly McpToolName[]>> = {
  all: MCP_TOOL_NAMES,
  "query,prove": toolsFor("query,prove").map((t) => t.name),
  sweep: toolsFor("sweep").map((t) => t.name),
};

// Limits.

/** --detail summary cap, tokens (D-110). Host limits such as MAX_MCP_OUTPUT_TOKENS are never relied on. */
export const OUTPUT_CAP_TOKENS = 5000;
/** Gate requestState lifetime, ms: 10 minutes (D-109). */
export const GATE_EXPIRY_MS = 600_000;
/** Loop detection window, ms: 30 minutes (D-111). */
export const REPEAT_WINDOW_MS = 1_800_000;
/** The same RepeatKey this many times in the window returns E_REPEAT, count. */
export const REPEAT_SAME_CALLS = 3;
/** This many failing builds with one reportHash returns E_REPEAT, count. */
export const REPEAT_SAME_FAILS = 4;

/**
 * Key of the first loop detection rule (D-111, AGENT-SURFACE.md 6.6):
 * sha256 over RFC 8785 JSON of these fields. Arguments alone are not the
 * key, since a person may edit chase.ts, build.ts or a profile row between
 * two calls with equal arguments. Every field is computable before the
 * command runs.
 */
export interface RepeatKey {
  readonly cmd: CommandName;
  /** Canonical arguments hash (CommandResult.inputsHash). */
  readonly inputsHash: Hash;
  /** BuildInputs.defHash of the chase the arguments name; absent when none is named. bench.ts is outside it. */
  readonly defHash?: Hash;
  /** sha256 over every profile row file in sorted path order; the whole profile, since a run's read set is known only after it runs. */
  readonly profileSetHash: Hash;
  /** BuildInputs.registryHash: resolved versions of kinds, checks, constraints, exporters. */
  readonly registryHash: Hash;
  /** sha256 of the catalog and knowledge indexes; absent for commands that read neither. */
  readonly dataHash?: Hash;
}

/** One line of <workspace>/.hbf/calls.jsonl (D-111). */
export interface CallRecord {
  /** Epoch time, ms. */
  readonly t: number;
  readonly workspace: string;
  readonly branch: string;
  readonly cmd: CommandName;
  /** sha256 of the canonical RepeatKey. */
  readonly repeatKey: Hash;
  readonly inputsHash: Hash;
  readonly buildHash?: BuildHash;
  readonly verdict: Verdict;
  readonly reportHash?: Hash;
}
