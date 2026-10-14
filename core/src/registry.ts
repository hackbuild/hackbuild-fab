// The command registry (D-106, AGENT-SURFACE.md 5.3): one CommandDef per
// command hbf registers, typed by CommandName, with a zod 4 input schema,
// examples drawn from reference/ and a description written for a model.
// Utility verbs carry no verdict and no CommandDef (spec/commands.ts
// UTILITY_VERBS). The CLI form maps each flag one to one onto an input
// field (3.3); --json, --artifact and --out are transport flags.

import { z } from "zod";
import { PROCESSES, TIERS } from "@hackbuild/spec";
import type {
  AnyCommandDef, CommandCtx, CommandDef, CommandInput, CommandName, CommandOutput, Hash, SchemaLike, UtilityVerb,
} from "@hackbuild/spec";
import type { GateStreams, HostGate } from "./tty-gate.js";
import type { Store } from "./store.js";
import { runPartBuild } from "./commands/part-build.js";
import { runPartInspect } from "./commands/part-inspect.js";
import { runCheckRun } from "./commands/check-run.js";
import { runExportRun } from "./commands/export-run.js";
import { runViewRender, VIEW_MODES } from "./commands/view-render.js";
import { runConstraintsQuery } from "./commands/constraints-query.js";
import { runFitsTable } from "./commands/fits-table.js";
import { runCatalogFind, runCatalogPins } from "./commands/catalog.js";
import { runSimRun, type SimRunInput } from "./commands/sim.run.js";
import { runSimSweep, type SimSweepInput } from "./commands/sim.sweep.js";
import { runAsmSolve, type AsmSolveInput } from "./commands/asm.solve.js";
import { runPartProbe, type PartProbeInput } from "./commands/part.probe.js";
import { runProjectGraph, type ProjectGraphInput } from "./commands/project-graph.js";
import { runRulesAudit } from "./commands/rules-audit.js";
import { runCircuitSolve } from "./commands/circuit-solve.js";
import { runNestPack, type NestPackInput } from "./commands/nest.pack.js";
import { PROGRAM_IDS, runMotionRun, type MotionRunInput } from "./commands/motion.run.js";
import type { ExportInput } from "./exporters/scene-export.js";
import { runMechFind } from "./commands/mech.find.js";
import { runMechDerive } from "./commands/mech.derive.js";
import { runArchFind } from "./commands/arch.find.js";
import { runArchApply } from "./commands/arch.apply.js";

/** What core passes every command beyond CommandCtx. */
export interface CoreCtx extends CommandCtx {
  /** Directory relative targets resolve against. */
  readonly cwd: string;
  readonly store: Store;
  readonly inputsHash: Hash;
  readonly gate: GateStreams;
  /** Set by a transport that asks through its host (MCP elicitation); absent on the CLI, which asks on the terminal. */
  readonly hostGate?: HostGate;
  /** CLI transport flags that are not command inputs. */
  readonly cli: { readonly artifact?: string; readonly out?: string };
}

const params = z.record(z.string(), z.unknown())
  .describe("param values by field id or group id, merged over the preset; a key starting with / is a json pointer, for example {\"/keys/0/gap\": 1.6}");
const chase = z.string().min(1).describe("design or reference directory, or a chase id");
const preset = z.string().min(1).describe("preset id the chase declares");

const outputOf = <N extends CommandName>(): SchemaLike<unknown, CommandOutput<N>> =>
  z.custom<CommandOutput<N>>((v) => typeof v === "object" && v !== null) as unknown as SchemaLike<unknown, CommandOutput<N>>;

/** Narrow a zod schema to the spec input type; the examples below are typed by CommandInput<N>, so tsc checks the pair. */
const inputOf = <N extends CommandName>(s: z.ZodType): CommandDef<N>["input"] => s as unknown as CommandDef<N>["input"];

// The CLI input layer (D-107): a command whose CLI form widens the spec
// input (--scene and the M10 fields) runs on that widened input. These two
// adapters are the one place the widened input meets CommandDef; the layer
// comes out at M10, when the chase declares scenes and spec carries the
// fields.

/** A transitional example input, typed against the widened input the command reads. */
const example = <N extends CommandName, I>(input: I): CommandInput<N> => input as unknown as CommandInput<N>;

/** A run body over the widened CLI input I and the core context, as the CommandDef run of N; its output is checked against N. */
const cliRun = <N extends CommandName, I>(run: (input: I, ctx: CoreCtx) => ReturnType<CommandDef<N>["run"]>): CommandDef<N>["run"] =>
  ((input, ctx) => run(input as unknown as I, ctx as CoreCtx)) as CommandDef<N>["run"];

export const partBuild: CommandDef<"part.build"> = {
  name: "part.build",
  group: "build",
  description: [
    "Build a design from its chase and build.ts, run every registered check on the result, and store the build under hbf://build/<buildHash>.",
    "Pass params as a json object over the defaults or a preset; a key starting with / sets one value by pointer, and a group id may wrap its fields.",
    "Returns the parts, metrics, warnings, the inferred profile rows that moved a verdict, and findings fail first.",
    "Pass import in place of chase to audit files another tool made: one part, one body per file, winding and signed volume checked, mesh checks run, feature checks skip.",
    "Do not use it to write a file; export.run writes the 3mf after a person approves at a terminal.",
  ].join(" "),
  input: inputOf<"part.build">(z.object({
    chase: chase.exactOptional(),
    import: z.array(z.object({
      path: z.string().min(1).describe("file relative to the workspace, or hbf://source/<sha256>"),
      format: z.enum(["stl", "glb", "step", "wrl", "scad"]),
      units: z.enum(["mm", "cm", "m", "in"]).exactOptional().describe("file length unit; absent is m for glb, mm for the rest"),
      as: z.enum(["body", "bought"]),
      material: z.string().min(1).exactOptional().describe("profile material id; absent imports geometry for audit only"),
    }).strict()).exactOptional()
      .describe("files to build as the bodies of one part for audit, in place of chase; stl, glb and scad (where openscad is on PATH)"),
    params: params.exactOptional(),
    preset: preset.exactOptional(),
    detail: z.enum(["summary", "full"]).exactOptional().describe("summary leaves ir null; full returns the part ir"),
    cursor: z.string().exactOptional().describe("continues a truncated findings page"),
  }).strict()),
  output: outputOf<"part.build">(),
  examples: [
    { input: { chase: "reference/keys/flex-pair" }, note: "the m-s flex key pair at its defaults" },
    { input: { chase: "reference/keys/flex-pair", params: { "/keys/0/gap": 1.36 } }, note: "one pointer edit: the first key's cap gap, mm" },
    { input: { chase: "reference/exports/orca-3mf-roundtrip", detail: "full" }, note: "the collar coin reference with its part ir" },
    { input: { import: [{ path: "tools/corpus/import/lug.glb", format: "glb", units: "mm", as: "body" }] }, note: "audit the lug hat glb, authored in mm" },
  ],
  writes: "nothing",
  run: (i, ctx) => runPartBuild(i, ctx as CoreCtx),
};

export const partInspect: CommandDef<"part.inspect"> = {
  name: "part.inspect",
  group: "build",
  description: [
    "Read a stored build: bodies with slot, material, role, volume in mm3, bounding box in mm and meshHash, plus features, frame, metrics and warnings.",
    "The part is an hbf://build/<buildHash> uri part.build printed, or a design directory, which builds first.",
    "An unknown or collected uri returns E_HANDLE naming the chase to rebuild.",
    "Do not use it to prove anything; part.build and check.run return the findings.",
  ].join(" "),
  input: inputOf<"part.inspect">(z.object({ part: z.string().min(1).describe("hbf://build/<buildHash> or a design directory") }).strict()),
  output: outputOf<"part.inspect">(),
  examples: [{ input: { part: "reference/keys/flex-pair" }, note: "build the flex pair and list its bodies" }],
  writes: "nothing",
  run: (i, ctx) => runPartInspect(i, ctx as CoreCtx),
};

export const checkRun: CommandDef<"check.run"> = {
  name: "check.run",
  group: "prove",
  description: [
    "Run checks on a build: CHK-PRT-01, CHK-PRT-03 and CHK-3MF-04 on the part ir plus the registered checks, or on an exported 3mf given with --artifact.",
    "only narrows the run to listed check ids; each finding carries measured, legal, constraint, origin and a one-param fix where one exists.",
    "The report is stored under hbf://report/<reportHash>.",
    "Do not use it after part.build to see the same findings again; part.build already returns them.",
  ].join(" "),
  input: inputOf<"check.run">(z.object({
    build: z.string().min(1).exactOptional().describe("hbf://build/<buildHash> or a design directory; absent with scene"),
    scene: z.string().min(1).exactOptional().describe("cli only until M10: a registered audit scene, for example ogee16-printed (M04-T11)"),
    only: z.array(z.string().min(1)).exactOptional().describe("check ids to run, for example CHK-PRT-01"),
    cursor: z.string().exactOptional().describe("continues a truncated report page"),
  }).strict()),
  output: outputOf<"check.run">(),
  examples: [
    { input: { build: "reference/keys/flex-pair" }, note: "every check on the flex pair and its in-memory 3mf" },
    { input: { build: "reference/keys/flex-pair", only: ["CHK-PRT-01", "CHK-PRT-03"] }, note: "topology and overlap only" },
    { input: example<"check.run", { scene: string; only: string[] }>({ scene: "ogee16-printed", only: ["CHK-ASM-11"] }), note: "the ogee r16-p printed interference audit at its 4 poses, cli only until M10" },
  ],
  writes: "nothing",
  run: (i, ctx) => runCheckRun(i, ctx as CoreCtx),
};

export const exportRun: CommandDef<"export.run"> = {
  name: "export.run",
  group: "make",
  description: [
    "Write fabrication files after the build and every check pass: 3mf from a chase, dxf, svg-cut or plate 3mf from a nest scene (cli only until M10), gerbers, bom or cpl from a board chase after the provenance gate (E_PROVENANCE, exit 4, on an inferred part row), and kicad or wiring with no gate; a failing build returns its findings and writes nothing.",
    "On the cli it asks once on an interactive terminal and writes only on y; without a terminal it returns E_GATE_UNAVAILABLE with the line a person runs.",
    "There is no flag or environment variable that approves an export.",
    "Do not use it to preview; dryRun runs build, checks and the preflight and writes nothing.",
  ].join(" "),
  input: inputOf<"export.run">(z.object({
    chase: chase.exactOptional(),
    scene: z.string().min(1).exactOptional().describe("cli only until M10: a nest scene, for example slug-sheets or ogee16-r16p-plates (M07-T14)"),
    kind: z.string().min(1).describe("exporter id; hbf registers 3mf, dxf, svg-cut and the board kinds gerbers, bom, cpl, kicad, circuit-json and wiring"),
    machine: z.string().min(1).exactOptional().describe("profile machine id; must match the part's machine"),
    params: params.exactOptional(),
    preset: preset.exactOptional(),
    kerfMode: z.enum(["outline", "none"]).exactOptional().describe("sheet exports only; a 3mf ignores it"),
    dialect: z.enum(["body-centre", "mm-suffix"]).exactOptional().describe("kind cpl only: body-centre (default) or mm-suffix; which assembler wants which is unconfirmed"),
    dryRun: z.boolean().exactOptional().describe("build, check and preflight; write nothing"),
    cursor: z.string().exactOptional(),
  }).strict()),
  output: outputOf<"export.run">(),
  examples: [
    { input: { chase: "reference/keys/flex-pair", kind: "3mf", machine: "ffc5p" }, note: "the flex pair 3mf for the creator 5 pro" },
    { input: { chase: "reference/keys/flex-pair", kind: "3mf", dryRun: true }, note: "preflight only" },
    { input: example<"export.run", ExportInput>({ scene: "slug-sheets", kind: "dxf" }), note: "the ten slug laser sheets as dxf, cli only until M10" },
    { input: { chase: "reference/boards/spindle-r1", kind: "gerbers" }, note: "spindle r1 gerbers; stops at E_PROVENANCE, exit 4, while its hand pads read inferred" },
    { input: { chase: "reference/boards/shunt-art", kind: "cpl", dialect: "mm-suffix", dryRun: true }, note: "the shunt placement file in the mm-suffix dialect, preflight only" },
  ],
  writes: "outside",
  run: cliRun<"export.run", ExportInput>(runExportRun),
};

export const viewRender: CommandDef<"view.render"> = {
  name: "view.render",
  group: "look",
  description: [
    "Render a stored build to a png: orthographic top, front, iso and a section through the middle, flat shaded per slot colour, drawn by a software z-buffer with no browser.",
    `mode assembled gives the four views on one sheet; ${VIEW_MODES.filter((m) => m !== "assembled").join(", ")} give one view; size is width and height in px.`,
    "The bytes depend only on the build, so the png hash is evidence.",
    "Do not use it to judge print quality; a person looks at the render.",
  ].join(" "),
  input: inputOf<"view.render">(z.object({
    target: z.string().min(1).describe("hbf://build/<buildHash> or a design directory"),
    mode: z.string().min(1).describe(`view mode: ${VIEW_MODES.join(", ")}`),
    size: z.tuple([z.number().int().min(16).max(4096), z.number().int().min(16).max(4096)]).exactOptional().describe("width and height, px"),
  }).strict()),
  output: outputOf<"view.render">(),
  examples: [
    { input: { target: "reference/keys/flex-pair", mode: "assembled" }, note: "four views of the flex pair" },
    { input: { target: "reference/keys/flex-pair", mode: "section", size: [512, 512] }, note: "the mid section, 512 by 512 px" },
  ],
  writes: "nothing",
  run: (i, ctx) => runViewRender(i, ctx as CoreCtx),
};

export const constraintsQuery: CommandDef<"constraints.query"> = {
  name: "constraints.query",
  group: "query",
  description: [
    "Ask what a dimension may be before building: returns the legal interval, every floor and ceiling with its kernel, reason and qualifier, and which bounds bind.",
    "Give a dim with material and facts for the raw query, or a chase with no dim to get the legal range of every param that declares a constraintDim, read from the built part.",
    "An empty interval is the answer, verdict fail with E_UNSAT naming the fact that moves the binding floor and the value that fits.",
    "Do not use it to check a built part; part.build returns the findings.",
  ].join(" "),
  input: inputOf<"constraints.query">(z.object({
    dim: z.string().regex(/^[^.\s]+\.[^\s]+$/).exactOptional().describe("<kind or role>.<field>, for example conductor.width; absent queries the chase params"),
    pointers: z.array(z.string().regex(/^\//)).exactOptional().describe("param form: json pointers into the chase params, for example /w; absent answers every param with a constraintDim"),
    params: params.exactOptional(),
    preset: preset.exactOptional(),
    chase: chase.exactOptional(),
    feature: z.string().min(1).exactOptional().describe("feature id of the built chase the dim form reads"),
    material: z.string().min(1).exactOptional().describe("profile material id; absent takes the feature's body material from the chase"),
    machine: z.string().min(1).exactOptional().describe("profile machine id; absent takes the part's machine, else ffc5p"),
    facts: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])).exactOptional()
      .describe("declared facts by key, for example {\"pathMm\": 62, \"flexes\": true}; they override facts the chase declares"),
  }).strict()),
  output: outputOf<"constraints.query">(),
  examples: [
    {
      input: { dim: "conductor.width", material: "cpla-protopasta", facts: { pathMm: 62, tMm: 0.72, netBudgetOhm: 8000, flexes: true, pitchMm: 8, pitchClrMm: 1 } },
      note: "trace width under an 8000 ohm budget, golden 1 of reference/electrical/trace-width-budget",
    },
    { input: { chase: "reference/keys/flex-pair" }, note: "every flex pair param with a constraintDim" },
  ],
  writes: "nothing",
  run: (i, ctx) => runConstraintsQuery(i, ctx as CoreCtx),
};

export const fitsTable: CommandDef<"fits.table"> = {
  name: "fits.table",
  group: "prove",
  description: [
    "Print the FITS rows of a build: each mating pair's drawn clearance in mm against its fit class band, with the band's reason, the legal hole for its shaft and the clearance left after loss.",
    "The build names its fit model; each band is a constraints.query bound from profile/fit-band, so the table and the query agree.",
    "Every row is a CHK-FIT-01 result: verdict fail and exit 1 when any row is out of band.",
    "Do not use it to change a fit; edit the param the row reads and rebuild.",
  ].join(" "),
  input: inputOf<"fits.table">(z.object({ build: z.string().min(1).describe("design or reference directory, or a chase id") }).strict()),
  output: outputOf<"fits.table">(),
  examples: [{ input: { build: "reference/fit/ogee16-r16p" }, note: "the ogee r16-p fits table, 18 rows" }],
  writes: "nothing",
  run: (i, ctx) => runFitsTable(i, ctx as CoreCtx),
};

// The M02 sim commands (M02-T11). Until M10 a legacy design has no chase,
// so each takes the CLI-only --scene <id> beside the spec's --build; the
// transitional fields widen the spec input, and an example states the call
// a person types today.

const build = z.string().min(1).describe("hbf://build/<buildHash>; no chase declares a sim scene before M10, so pass scene");
const scene = z.string().min(1).describe("cli only until M10: a registered sim scene id, for example ogee16-cranks");


export const simRun: CommandDef<"sim.run"> = {
  name: "sim.run",
  group: "prove",
  description: [
    "Run a scene's trials, multi-trial by default, each from its own seed: returns runs, passes, the worst trial, per-trial rows and the Rapier snapshot hash or capsule end-state hash.",
    "A scene that declares an expectation gets verdict pass when measured equals declared and fail with exit 1 when not; one that declares nothing gets skip.",
    "Outcomes are computed when the command runs, never by a frame schedule.",
    "Do not use it to sweep a motion range; sim.sweep does.",
  ].join(" "),
  input: inputOf<"sim.run">(z.object({
    build: build.exactOptional(),
    scene: scene.exactOptional(),
    program: z.string().min(1).exactOptional().describe("a scene runs its own program; lands with chase sim declarations"),
    trials: z.number().int().min(1).exactOptional().describe("trials, count; the scene's default when absent"),
    seed: z.number().int().exactOptional().describe("first trial seed; trial i uses seed + i"),
  }).strict()),
  output: outputOf<"sim.run">(),
  examples: [
    { input: example<"sim.run", SimRunInput>({ scene: "slug" }), note: "slug capsule machine, 8 trials of 16 vends against its declared 126 of 128" },
    { input: example<"sim.run", SimRunInput>({ scene: "slug-vend1", trials: 2, seed: 5 }), note: "two single-vend trials from seed 5, nothing declared" },
  ],
  writes: "nothing",
  longRunning: true,
  run: cliRun<"sim.run", SimRunInput>(runSimRun),
};

export const simSweep: CommandDef<"sim.sweep"> = {
  name: "sim.sweep",
  group: "prove",
  description: [
    "Sweep a scene through its motion in mode pose, rotate, prismatic or insert and return clashes, sweptHash and the closest approach of every moving body in mm with where it occurs.",
    "Pose mode adds the real fails outside the declared masks; insert mode adds each hook case with INSERTS or TRAPPED.",
    "Verdict fail with exit 1 when measured differs from what the scene declares.",
    "Do not use it for trials over seeds; sim.run runs those.",
  ].join(" "),
  input: inputOf<"sim.sweep">(z.object({
    build: build.exactOptional(),
    scene: scene.exactOptional(),
    joint: z.string().min(1).exactOptional().describe("lands with chase sim declarations; a scene names its own motion"),
    mode: z.enum(["pose", "rotate", "prismatic", "insert"]).exactOptional().describe("cli only until M10: the scene's sweep mode"),
    steps: z.number().int().min(2).exactOptional().describe("rotate only: placements over the motion, count; profile ogee16.sweepSteps when absent"),
  }).strict()),
  output: outputOf<"sim.sweep">(),
  examples: [
    { input: example<"sim.sweep", SimSweepInput>({ scene: "ogee16-cranks", mode: "rotate" }), note: "the nine ogee16 cranks against the servos and rest parts" },
    { input: example<"sim.sweep", SimSweepInput>({ scene: "cotter-hook", mode: "insert" }), note: "the cotter hook insertion search over eight boards" },
  ],
  writes: "nothing",
  longRunning: true,
  run: cliRun<"sim.sweep", SimSweepInput>(runSimSweep),
};

export const asmSolve: CommandDef<"asm.solve"> = {
  name: "asm.solve",
  group: "build",
  description: [
    "Place a scene's bodies at one named pose and return each placement, the contacts outside the declared masks and the closest approach of every declared pair in mm with both points.",
    "For DAVIT, clamp joint=deg moves that joint on both arms toward deg and bisects 8 times on contact, as the bench slider did, and reports the clamped value.",
    "Verdict fail with exit 1 when any real fail remains.",
    "Do not use it to sweep poses; sim.sweep with mode pose does.",
  ].join(" "),
  input: inputOf<"asm.solve">(z.object({
    build: build.exactOptional(),
    scene: scene.exactOptional(),
    pose: z.string().min(1).exactOptional().describe("cli only until M10: HANG, REACH, LIFT or TUCK; HANG when absent"),
    clamp: z.string().regex(/^[a-z_]+=-?\d+(\.\d+)?$/).exactOptional().describe("cli only until M10: joint=deg, for example elbow=-110"),
  }).strict()),
  output: outputOf<"asm.solve">(),
  examples: [
    { input: example<"asm.solve", AsmSolveInput>({ scene: "davit-std-1in", pose: "REACH" }), note: "both davit std arms at REACH on 1 in pipe" },
    { input: example<"asm.solve", AsmSolveInput>({ scene: "davit-std-125in", pose: "HANG", clamp: "elbow=-110" }), note: "drive the elbow toward -110 deg and clamp on contact" },
  ],
  writes: "nothing",
  run: cliRun<"asm.solve", AsmSolveInput>(runAsmSolve),
};

export const partProbe: CommandDef<"part.probe"> = {
  name: "part.probe",
  group: "build",
  description: [
    "Measure the closest approach in mm between two bodies of a scene at a named pose and return the point on each, the measure every proxy point of one body to every point of the other.",
    "When the two bodies are a declared pair it also returns their closest unmasked approach.",
    "It decides nothing: verdict skip and exit 0.",
    "Do not use it for a whole assembly; asm.solve reports every declared pair.",
  ].join(" "),
  input: inputOf<"part.probe">(z.object({
    part: z.string().min(1).exactOptional().describe("hbf://build/<buildHash>; no chase declares a sim scene before M10, so pass scene"),
    scene: scene.exactOptional(),
    a: z.string().min(1).exactOptional().describe("cli only until M10: a body name, or name@L for the left arm"),
    b: z.string().min(1).exactOptional().describe("cli only until M10: the second body"),
    pose: z.string().min(1).exactOptional().describe("cli only until M10: HANG, REACH, LIFT or TUCK; HANG when absent"),
  }).strict()),
  output: outputOf<"part.probe">(),
  examples: [{ input: example<"part.probe", PartProbeInput>({ scene: "davit-std-1in", a: "crank", b: "upper", pose: "HANG" }), note: "crank to upper arm at HANG, mm" }],
  writes: "nothing",
  run: cliRun<"part.probe", PartProbeInput>(runPartProbe),
};

export const projectGraph: CommandDef<"project.graph"> = {
  name: "project.graph",
  group: "look",
  description: [
    "List the project's items (chase, build.ts, params, profile rows, check versions, feature kinds, builds, meshes, reports, legacy files, oracle records, goldens) and the links each was made from, with the hash its source had at the time.",
    "An item is stale when a source hash it linked has moved, or an item it was made from is stale; because is the path of links to what changed.",
    "stale lists only stale items and from lists only the items downstream of one item id; staleness is information, exit 0.",
    "Do not use it to rebuild; part.build and check.run rebuild an item, and the graph then shows it fresh.",
  ].join(" "),
  input: inputOf<"project.graph">(z.object({
    project: z.string().min(1).exactOptional().describe("workspace directory; absent is the workspace hbf runs in"),
    stale: z.boolean().exactOptional().describe("cli only: list only stale items"),
    from: z.string().min(1).exactOptional().describe("cli only: list only the items downstream of this item id, for example profileRow:fit/SLIDE"),
  }).strict()),
  output: outputOf<"project.graph">(),
  examples: [
    { input: example<"project.graph", ProjectGraphInput>({ stale: true }), note: "every stale item with the path of links to what changed" },
    { input: example<"project.graph", ProjectGraphInput>({ from: "profileRow:fit/SLIDE" }), note: "every item made from the SLIDE fit band row" },
  ],
  writes: "nothing",
  run: (i, ctx) => runProjectGraph(i as ProjectGraphInput, ctx as CoreCtx) as unknown as ReturnType<CommandDef<"project.graph">["run"]>,
};

export const rulesAudit: CommandDef<"rules.audit"> = {
  name: "rules.audit",
  group: "prove",
  description: [
    "Run every registered project, source and artifact check over the workspace: the files git lists (legacy trees and check fixtures left out), the 3mf packages in the store and the project graph.",
    "Each finding carries measured, legal, constraint and origin; a check whose kernel or target lands later returns skip naming the milestone, as CHK-MOT-03 does until the motion kernel registers.",
    "chase narrows the sources to that design's directory and the artifacts to those that state it; the result lists the stale items of project.graph as information.",
    "Verdict fail with exit 1 on any block fail. Do not use it on one build; check.run and part.build run the part checks.",
  ].join(" "),
  input: inputOf<"rules.audit">(z.object({
    chase: z.string().min(1).exactOptional().describe("design directory or chase meta.id; absent audits the whole workspace"),
  }).strict()),
  // The spec output (simHash, firmwareHash, equal) is CHK-MOT-03's extra from M07 on (M04-T13 step 2); the result is the audit.
  output: outputOf<"rules.audit">(),
  examples: [
    { input: {}, note: "every project, source and artifact check over the workspace" },
    { input: { chase: "reference/keys/flex-pair" }, note: "the flex pair's sources and the stored 3mf packages that state its chase" },
  ],
  writes: "nothing",
  longRunning: true,
  run: (i, ctx) => runRulesAudit(i, ctx as CoreCtx) as unknown as ReturnType<CommandDef<"rules.audit">["run"]>,
};

export const circuitSolve: CommandDef<"circuit.solve"> = {
  name: "circuit.solve",
  group: "prove",
  description: [
    "Extract the nets of a build from its conductive bodies, solve every chase hookup entry by its read model, and classify each receiving pin LOW, UNDEFINED or HIGH against its catalog pin row at both ends of the pullup range.",
    "Returns nets, operating points and read outputs (tau, settle, wait, reject); CHK-NET-05 and CHK-NET-06 travel in findings, and a pullup read that does not read LOW fails with exit 1.",
    "mcu replaces every entry's mcu, engine spice solves the pressed dividers with ngspice loaded on demand, pullup min or max classifies one end.",
    "Do not use it to check geometry; check.run and part.build run those checks.",
  ].join(" "),
  input: inputOf<"circuit.solve">(z.object({
    build: z.string().min(1).describe("design or reference directory, chase id, or hbf://build/<buildHash>"),
    stimulus: z.record(z.string(), z.union([z.boolean(), z.number()])).exactOptional()
      .describe("ports to solve, each true for a held key; absent solves every hookup entry"),
    mcu: z.string().min(1).exactOptional().describe("catalog pin row id for every entry, for example rp2040; the entry's own mcu when absent"),
    engine: z.enum(["analytic", "spice"]).exactOptional().describe("analytic when absent; spice loads eecircuit-engine on demand"),
    pullup: z.enum(["range", "min", "max"]).exactOptional().describe("pullup ends to classify at; both ends of the range when absent"),
  }).strict()),
  output: outputOf<"circuit.solve">(),
  examples: [
    { input: { build: "reference/keys/flex-pair" }, note: "the flex pair's nets and the charge-release read of each key" },
    { input: { build: "reference/keys/flex-pair", mcu: "esp32-c3", engine: "analytic" }, note: "the same pins classified against the esp32-c3 row" },
  ],
  writes: "nothing",
  run: (i, ctx) => runCircuitSolve(i, ctx as CoreCtx) as unknown as ReturnType<CommandDef<"circuit.solve">["run"]>,
};

// The M07 commands (M07-T14). nest.pack and export.run take the CLI-only
// --scene until M10, as the M02 sim commands do; motion.run takes each
// program argument as its own flag, --k 3, gathered into args.

export const motionRun: CommandDef<"motion.run"> = {
  name: "motion.run",
  group: "prove",
  description: [
    "Run a motion program by id and return each committed state, the end hash and, on a latch machine, the latched cells; a planner program returns the planned path, duration and the ceiling that binds.",
    "The commit is decided at the op by the kinematics, never by which frames render (CHK-MOT-06); program args are flags, for example --k 3 for slug.vend.",
    "expect declares the latched set (all, none, checker or cells i,j): verdict fail with exit 1 when measured differs; audit runs CHK-MOT-04, 05 and 06 on the machine.",
    "Do not use it for physics or trials; sim.run runs those.",
  ].join(" "),
  input: inputOf<"motion.run">(z.object({
    program: z.string().min(1).describe(`program id: ${PROGRAM_IDS.join(", ")}`),
    args: z.record(z.string(), z.number()).exactOptional().describe("program arguments by name, for example {\"k\": 3}; on the cli each is its own flag, --k 3"),
    expect: z.string().min(1).exactOptional().describe("declared latched set: all, none, a pattern the program names, or cells i,j joined by spaces"),
    audit: z.boolean().exactOptional().describe("also run CHK-MOT-04, 05 and 06 on the program's machine"),
  }).strict()),
  output: outputOf<"motion.run">(),
  examples: [
    { input: { program: "ogee.checker", expect: "checker" }, note: "the ogee r16 checker latches its 8 cells" },
    { input: { program: "slug.vend", args: { k: 3 } }, note: "three slug vends with the residual carried, 12227 half steps" },
  ],
  writes: "nothing",
  run: (i, ctx) => runMotionRun(i as unknown as MotionRunInput, ctx as CoreCtx) as unknown as ReturnType<CommandDef<"motion.run">["run"]>,
};

export const nestPack: CommandDef<"nest.pack"> = {
  name: "nest.pack",
  group: "make",
  description: [
    "Pack parts onto sheets or plates and return the layout: sheets, placements, packer, gap, fill percent (informational) and layoutHash, with CHK-SHT-01, 02 and 07 in findings.",
    "A part whose cut profile falls into pieces is refused before anything is placed, verdict fail and exit 1; kerf mode outline on a machine with no kerf is E_PARAM_MISSING naming the profile row.",
    "Until M10 the parts come from a nest scene: scene nests it as declared, parts nests one copy of each named part.",
    "Do not use it to write a file; it writes nothing, and export.run writes the cut files after a person approves at a terminal.",
  ].join(" "),
  input: inputOf<"nest.pack">(z.object({
    build: z.string().min(1).exactOptional().describe("no chase declares sheet items before M10; pass scene or parts"),
    scene: z.string().min(1).exactOptional().describe("cli only until M10: a nest scene, for example slug-sheets"),
    params: params.exactOptional(),
    parts: z.array(z.string().min(1)).min(1).exactOptional().describe("part ids of one nest scene, one copy each"),
    sheet: z.tuple([z.number().positive(), z.number().positive()]).exactOptional().describe("sheet width and height, mm"),
    machine: z.string().min(1).exactOptional().describe("profile machine id; its kerf, and its sheet envelope when sheet is absent"),
    mode: z.enum(["fill", "assembly-order", "legacy-shelf"]).exactOptional(),
    gap: z.union([z.number().min(0), z.literal("auto")]).exactOptional().describe("gap between parts, mm, or auto"),
    margin: z.number().min(0).exactOptional().describe("edge margin, mm"),
    partInPart: z.boolean().exactOptional().describe("place small parts inside the holes of larger ones (fill mode)"),
    seed: z.number().int().exactOptional().describe("packer seed; equal seeds give equal layouts"),
    kerfMode: z.enum(["outline", "none"]).exactOptional().describe("outline grows outlines by kerf/2 from the machine row; none cuts at nominal"),
  }).strict()),
  output: outputOf<"nest.pack">(),
  examples: [
    { input: example<"nest.pack", NestPackInput>({ scene: "slug-sheets", mode: "legacy-shelf" }), note: "slug's shipped layout, 9 ply and 1 acrylic sheets of 600 x 400, cli only until M10" },
    { input: example<"nest.pack", NestPackInput>({ scene: "slug-sheets", mode: "fill", partInPart: true }), note: "the same parts in fill mode with part-in-part" },
  ],
  writes: "nothing",
  run: cliRun<"nest.pack", NestPackInput>(runNestPack),
};

// The catalog reads (M08-T04, M08-T14): offline over committed rows and
// the .hbf cache; --fetch kicad is the one network path (writes "network",
// CLI only), and it writes only the workspace .hbf cache.

export const catalogFind: CommandDef<"catalog.find"> = {
  name: "catalog.find",
  group: "query",
  description: [
    "Search bought-part rows by id and name words, offline, over the committed catalog and the workspace .hbf cache.",
    "Each hit gives its tier, the weakest geometry or connectivity field of the row, and the source that tier rests on; best tier first.",
    "A tier filter keeps rows at that tier or better.",
    "fetch kicad first lists the KiCad footprint mirror over the network and caches each matching footprint in .hbf as a community row; without it nothing leaves the machine.",
    "fetch is CLI only: catalog_search on the MCP route does not offer it.",
    "Do not use it to read pins; catalog.pins returns the pin table with its provenance.",
  ].join(" "),
  input: inputOf<"catalog.find">(z.object({
    query: z.string().min(1).describe("words matched against row id and name, for example supermini"),
    process: z.enum(PROCESSES).exactOptional().describe("mount process; accepted, not yet a filter"),
    tier: z.enum(TIERS).exactOptional().describe("keep rows at this tier or better"),
    fetch: z.enum(["kicad"]).exactOptional().describe("list the KiCad footprint mirror through kicad_fetch.py and cache matching rows at tier community first; needs the network"),
  }).strict()),
  output: outputOf<"catalog.find">(),
  examples: [{ input: { query: "supermini" }, note: "esp32c3-supermini at tier vendor before the inferred BLOCKS seat" }, { input: { query: "sg90" }, note: "the SG90 row, tier inferred on its conflicted dimensions" }, { input: { query: "PinHeader_1x02_P2.54mm_Vertical", fetch: "kicad" }, note: "cache the KiCad 2.54 mm two-pin header footprints as community rows, then search; needs the network" }],
  writes: "network",
  run: (i, ctx) => Promise.resolve(runCatalogFind(i, ctx as CoreCtx)),
};

export const catalogPinsCmd: CommandDef<"catalog.pins"> = {
  name: "catalog.pins",
  group: "query",
  description: [
    "Return every pin of a catalog part with role, strapping and boot activity, plus the per-MCU threshold row and the provenance of each field read.",
    "Strapping and boot activity come from the MCU row the part names; pad centres come from the part's own land pattern.",
    "An unknown part is E_REF with up to three ids by edit distance.",
    "Do not use it to search; catalog.find lists rows by name.",
  ].join(" "),
  input: inputOf<"catalog.pins">(z.object({ part: z.string().min(1).describe("catalog row id, for example esp32c3-supermini") }).strict()),
  output: outputOf<"catalog.pins">(),
  examples: [{ input: { part: "esp32c3-supermini" }, note: "16 pins, GPIO21 boot activity U0TXD, tier vendor" }, { input: { part: "esp32-c3" }, note: "the D-076 threshold row with strapping and boot provenance" }],
  writes: "nothing",
  run: (i, ctx) => Promise.resolve(runCatalogPins(i, ctx as CoreCtx)),
};

// The canon queries (M06-T11): offline reads of the mechanisms and
// archetypes registries. None writes; a refused entry is E_REF naming its
// status, its reason and its original.

export const mechFind: CommandDef<"mech.find"> = {
  name: "mech.find",
  group: "query",
  description: [
    "Search the mechanisms registry by words matched against id, family and the rules each entry governs, before you design a mechanism from nothing.",
    "Each hit gives status, dof, processes, provenance, reference ids and the original file it ports from; typed entries come first, then stub, candidate and unproven ones with the reason they are refused.",
    "family and process narrow the hits.",
    "Do not use it for numbers; mech.derive returns the derived values of a typed entry.",
  ].join(" "),
  input: inputOf<"mech.find">(z.object({
    behaviour: z.string().min(1).describe("words matched against id, family and governs text, for example geneva or detent"),
    family: z.string().min(1).exactOptional().describe("mechanism family, for example intermittent or snap"),
    process: z.enum(PROCESSES).exactOptional().describe("keep entries made by this process"),
  }).strict()),
  output: outputOf<"mech.find">(),
  examples: [{ input: { behaviour: "geneva" }, note: "geneva-external first, with its status and original" }, { input: { behaviour: "detent", process: "fdm" }, note: "the printed detents" }],
  writes: "nothing",
  run: (i, ctx) => Promise.resolve(runMechFind(i, ctx as CoreCtx)),
};

export const mechDerive: CommandDef<"mech.derive"> = {
  name: "mech.derive",
  group: "query",
  description: [
    "Compute a typed mechanism's governing numbers from its derive(): every output with unit, equation and qualifier, the default-filled inputs it ran on, and origin hbf://mechanism/<id>.",
    "Pass params as json or as k=v pairs in the units the mechanism declares; a missing or NaN value is E_PARAM_MISSING naming it, an unknown key is E_SCHEMA, an unknown id is E_REF with up to three near ids.",
    "A stub, candidate or unproven entry is refused with E_REF naming its status, the reason and the original it ports from.",
    "Do not use it to place a mechanism on a part; build.ts calls k.mech for that.",
  ].join(" "),
  input: inputOf<"mech.derive">(z.object({
    id: z.string().min(1).describe("mechanism id, for example geneva-external"),
    params: z.record(z.string(), z.unknown()).exactOptional().describe("values by param key in the units the schema states, for example {\"n\": 3, \"d\": 25}; absent takes every default"),
  }).strict()),
  output: outputOf<"mech.derive">(),
  examples: [{ input: { id: "living-hinge" }, note: "the tumbler living hinge at its bench defaults, 12.86 deg per row" }, { input: { id: "finger-joint", params: { k: 0.2 } }, note: "one kerf step moves tab and slot 0.02 mm" }],
  writes: "nothing",
  run: (i, ctx) => Promise.resolve(runMechDerive(i, ctx as CoreCtx)),
};

export const archFind: CommandDef<"arch.find"> = {
  name: "arch.find",
  group: "query",
  description: [
    "Search the archetypes registry for a printed, copper or board circuit by what it senses, its family and the feature kinds it emits.",
    "Each hit gives status, read channels, senses, emits, read model, tier, the resistances computed at load from the profile rows with each row's tier, provenance, reference ids and original; proven entries come first.",
    "process keeps archetypes made by that process and channels keeps those that fit the read channels available.",
    "Do not use it to place one; arch.apply writes the placement on a branch.",
  ].join(" "),
  input: inputOf<"arch.find">(z.object({
    behaviour: z.string().min(1).describe("what it senses or emits, for example press, slide or touch"),
    process: z.enum(PROCESSES).exactOptional().describe("fdm keeps printed archetypes, vinyl and laser copper ones, pcb boards"),
    channels: z.number().int().nonnegative().exactOptional().describe("read channels available, count"),
  }).strict()),
  output: outputOf<"arch.find">(),
  examples: [{ input: { behaviour: "press", process: "fdm" }, note: "the printed keys and buttons" }],
  writes: "nothing",
  run: (i, ctx) => Promise.resolve(runArchFind(i, ctx as CoreCtx)),
};

const vec3 = z.tuple([z.number(), z.number(), z.number()]);

export const archApply: CommandDef<"arch.apply"> = {
  name: "arch.apply",
  group: "author",
  description: [
    "Place a proven archetype on a declared face of a part: returns the feature and port ids the next part.build merge produces, the chase.applied record and the material slots the chase lacks.",
    "face is a face ref the part declares, or a frame lying on one; a param the archetype needs with no default, such as the blocks stud standard, comes back as E_PARAM_MISSING listing the options, and a stub, candidate or unproven id is E_REF with its reason.",
    "Until chase.patch lands the result is returned with written false and nothing is written.",
    "Do not use it to build; part.build merges every chase.applied entry and runs the checks.",
  ].join(" "),
  input: inputOf<"arch.apply">(z.object({
    chase: chase.exactOptional(),
    part: z.string().min(1).describe("part id the chase's build returns, for example body"),
    face: z.union([
      z.object({ ref: z.string().min(1), uv: z.tuple([z.number(), z.number()]), rotDeg: z.number() }).strict(),
      z.object({ origin: vec3, normal: vec3, u: vec3 }).strict(),
    ]).describe("a declared face {ref, uv, rotDeg}, or a frame {origin, normal, u} in mm on one"),
    id: z.string().min(1).describe("archetype id or alias, for example flex-cone-key"),
    params: z.record(z.string(), z.unknown()).exactOptional().describe("archetype params by key, json or k=v pairs, for example standard=boss-v1"),
  }).strict()),
  output: outputOf<"arch.apply">(),
  examples: [
    {
      input: { chase: "reference/conductors/blocks-stud-applied", part: "body", face: { ref: "body.top", uv: [0, 0], rotDeg: 0 }, id: "flex-cone-key" },
      note: "a flex cone key at the top face centre of the plain 32 by 24 prism; the tpu and conductive slots come back in slotsAdded",
    },
  ],
  writes: "branch",
  run: (i, ctx) => runArchApply(i, ctx as CoreCtx),
};

/** Every CommandDef hbf registers, in COMMAND_NAMES order. */
export const COMMANDS: readonly AnyCommandDef[] = [partBuild, partInspect, partProbe, asmSolve, checkRun, fitsTable, simRun, simSweep, circuitSolve, motionRun, rulesAudit, viewRender, projectGraph, nestPack, exportRun, constraintsQuery, catalogFind, catalogPinsCmd, mechFind, mechDerive, archFind, archApply];

/** The registered utility verbs (no verdict, no CommandDef). */
export const VERBS = ["doctor", "explain", "parity", "mcp"] as const satisfies readonly UtilityVerb[];

export function commandOf(name: string): AnyCommandDef | undefined {
  return COMMANDS.find((c) => c.name === name);
}

/** How one flag reads its value. */
export type FlagKind = "string" | "json" | "list" | "switch" | "size" | "facts" | "import" | "gap" | "pairs";

export interface CliForm {
  /** Input field the positional target fills. */
  readonly target: string;
  /** Flag name to input field and reading. */
  readonly flags: Readonly<Record<string, { readonly field: string; readonly kind: FlagKind }>>;
  /** Transport flags: not inputs. */
  readonly transport: readonly ("artifact" | "out")[];
  /** True when the target may be absent (check.run with --artifact). */
  readonly targetOptional?: boolean;
  /** List flags that may repeat; each value appends (constraints.query --param). */
  readonly repeat?: readonly string[];
  /** Flags the form does not name, each --name <number>, gathered into this field by name (motion.run program args). */
  readonly rest?: string;
}

const common = {
  params: { field: "params", kind: "json" },
  preset: { field: "preset", kind: "string" },
} as const;

export const CLI_FORM: Readonly<Record<string, CliForm>> = {
  "part.build": {
    target: "chase",
    flags: { ...common, import: { field: "import", kind: "import" }, detail: { field: "detail", kind: "string" }, cursor: { field: "cursor", kind: "string" } },
    transport: [],
    targetOptional: true,
    repeat: ["import"],
  },
  "part.inspect": { target: "part", flags: {}, transport: [] },
  "check.run": { target: "build", flags: { only: { field: "only", kind: "list" }, cursor: { field: "cursor", kind: "string" }, scene: { field: "scene", kind: "string" } }, transport: ["artifact"], targetOptional: true },
  "fits.table": { target: "build", flags: {}, transport: [] },
  "catalog.find": { target: "query", flags: { tier: { field: "tier", kind: "string" }, process: { field: "process", kind: "string" }, fetch: { field: "fetch", kind: "string" } }, transport: [] },
  "catalog.pins": { target: "part", flags: {}, transport: [] },
  "mech.find": { target: "behaviour", flags: { family: { field: "family", kind: "string" }, process: { field: "process", kind: "string" } }, transport: [] },
  "mech.derive": { target: "id", flags: { params: { field: "params", kind: "pairs" } }, transport: [] },
  "arch.apply": {
    target: "chase",
    flags: {
      chase: { field: "chase", kind: "string" }, part: { field: "part", kind: "string" }, face: { field: "face", kind: "json" },
      id: { field: "id", kind: "string" }, params: { field: "params", kind: "pairs" },
    },
    transport: [],
    targetOptional: true,
  },
  "arch.find": {
    target: "behaviour",
    flags: { behaviour: { field: "behaviour", kind: "string" }, process: { field: "process", kind: "string" }, channels: { field: "channels", kind: "json" } },
    transport: [],
    targetOptional: true,
  },
  "circuit.solve": {
    target: "build",
    flags: {
      engine: { field: "engine", kind: "string" }, mcu: { field: "mcu", kind: "string" }, pullup: { field: "pullup", kind: "string" },
      stimulus: { field: "stimulus", kind: "json" },
    },
    transport: [],
  },
  "rules.audit": { target: "chase", flags: { chase: { field: "chase", kind: "string" } }, transport: [], targetOptional: true },
  "view.render": { target: "target", flags: { mode: { field: "mode", kind: "string" }, size: { field: "size", kind: "size" } }, transport: ["out"] },
  "export.run": {
    target: "chase",
    flags: {
      ...common, kind: { field: "kind", kind: "string" }, machine: { field: "machine", kind: "string" },
      "kerf-mode": { field: "kerfMode", kind: "string" }, "dry-run": { field: "dryRun", kind: "switch" }, cursor: { field: "cursor", kind: "string" },
      scene: { field: "scene", kind: "string" }, dialect: { field: "dialect", kind: "string" },
    },
    transport: ["out"],
    targetOptional: true,
  },
  "nest.pack": {
    target: "build",
    flags: {
      build: { field: "build", kind: "string" }, scene: { field: "scene", kind: "string" }, params: { field: "params", kind: "json" },
      parts: { field: "parts", kind: "list" }, sheet: { field: "sheet", kind: "size" }, machine: { field: "machine", kind: "string" },
      mode: { field: "mode", kind: "string" }, gap: { field: "gap", kind: "gap" }, margin: { field: "margin", kind: "json" },
      "part-in-part": { field: "partInPart", kind: "switch" }, seed: { field: "seed", kind: "json" }, "kerf-mode": { field: "kerfMode", kind: "string" },
    },
    transport: [],
    targetOptional: true,
  },
  "motion.run": {
    target: "program",
    flags: {
      program: { field: "program", kind: "string" }, args: { field: "args", kind: "json" }, expect: { field: "expect", kind: "string" },
      audit: { field: "audit", kind: "switch" },
    },
    transport: [],
    targetOptional: true,
    rest: "args",
  },
  "sim.run": {
    target: "build",
    flags: { build: { field: "build", kind: "string" }, scene: { field: "scene", kind: "string" }, program: { field: "program", kind: "string" }, trials: { field: "trials", kind: "json" }, seed: { field: "seed", kind: "json" } },
    transport: [],
    targetOptional: true,
  },
  "sim.sweep": {
    target: "build",
    flags: { build: { field: "build", kind: "string" }, scene: { field: "scene", kind: "string" }, joint: { field: "joint", kind: "string" }, mode: { field: "mode", kind: "string" }, steps: { field: "steps", kind: "json" } },
    transport: [],
    targetOptional: true,
  },
  "asm.solve": {
    target: "build",
    flags: { build: { field: "build", kind: "string" }, scene: { field: "scene", kind: "string" }, pose: { field: "pose", kind: "string" }, clamp: { field: "clamp", kind: "string" } },
    transport: [],
    targetOptional: true,
  },
  "project.graph": {
    target: "project",
    flags: { stale: { field: "stale", kind: "switch" }, from: { field: "from", kind: "string" } },
    transport: [],
    targetOptional: true,
  },
  "part.probe": {
    target: "part",
    flags: { scene: { field: "scene", kind: "string" }, a: { field: "a", kind: "string" }, b: { field: "b", kind: "string" }, pose: { field: "pose", kind: "string" } },
    transport: [],
    targetOptional: true,
  },
  "constraints.query": {
    target: "dim",
    flags: {
      ...common, material: { field: "material", kind: "string" }, machine: { field: "machine", kind: "string" },
      facts: { field: "facts", kind: "facts" }, chase: { field: "chase", kind: "string" }, feature: { field: "feature", kind: "string" },
      param: { field: "pointers", kind: "list" },
    },
    transport: [],
    targetOptional: true,
    repeat: ["param"],
  },
};

export type { UtilityVerb };
