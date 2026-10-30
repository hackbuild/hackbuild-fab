// spec/bench.ts
/**
 * Status: draft until the M09 exit. MILESTONES.md 1.5, D-179.
 * M09 is the first milestone that runs this file.
 */
// The bench layout a chase renders into: shell, views, rail, welcome,
// status chips and slots. It lives in its own file next to the chase
// (designs/<id>/bench.ts, reference/<area>/<id>/bench.ts) and is built with
// defineBench, which checks every rail panel and welcome preset against the
// chase it lays out. A bench never enters BuildInputs: editing a tagline or
// reordering rail steps moves no build hash, no export approval and no
// E_REPEAT history (D-174). chase.scaffold writes a default bench generated
// from the params; a model never needs to edit it, a person may.
// Version 4, 2026-10-04. Carries D-120, D-124, D-125, D-126, D-128, D-129,
// D-174.
// 2026-10-05: gold standard gaps P-04, P-05, P-08 to P-11, P-13, P-21,
// P-28, P-29 (synthesis/gold-standard.md section 12).

import type { Chase } from "./chase.js";
import type { WidgetDecl } from "./widgets.js";

/** Current bench schema version. */
export const BENCH_SCHEMA_VERSION = 1;

/** Shell family (D-120, owner default): paper for every kind except board; instrument for board and live device views. */
export type Shell = "paper" | "instrument";

/** split: 3D above the 2D face boards (COLLAR art step, P-10). */
export type ViewMode =
  | "assembled" | "exploded" | "section" | "plate" | "sheet" | "layers"
  | "iso" | "action" | "field" | "board2d" | "board3d" | "silhouette" | "split";

/** eye: the installed view at eye height (COTTER, P-11). */
export type CamPreset = "iso" | "top" | "front" | "side" | "under" | "back" | "usb" | "motor" | "eye";

/** Stage overlays. drive is the stimulus pad (PIP, TOGGLE, BLOCKS). */
export type Overlay = "cams" | "legend" | "hud" | "tools" | "drive" | "busy" | "welcome";

/** What one drive readout line can carry (P-05, G-20). Every number is qualified. */
export const DRIVE_READOUTS = [
  "logic", "ohm", "settle", "adc", "travel", "dir", "pinV", "pullupOhm", "force", "pressure", "tilt",
] as const;
export type DriveReadout = (typeof DRIVE_READOUTS)[number];

/**
 * The drive pad (P-05). One contact function, exported by build.ts and
 * named in `contact`, maps a stimulus to contact state; the pad, the 3D
 * pose, the readout and BenchHook.drive all call it and agree to 0.01
 * (G-20). Every region and threshold the pad draws comes from metrics of
 * the current build, so a geometry change redraws the pad (G-19).
 */
export interface DriveDecl {
  /** Where stimulus targets come from, for example "metrics.keys", "model.axes". */
  readonly targets: string;
  /**
   * hold: press and release a key (PIP). tilt: a stick with tilt and
   * azimuth (TOGGLE). slide: a position along a membrane or pot (TANG).
   * stick: a tilt target split into hold targets per direction (`split`).
   */
  readonly gesture: "hold" | "tilt" | "slide" | "stick";
  /**
   * Name of the ContactFn build.ts exports (spec/build.ts). The kernel
   * runs it in node for the hook and the readout; the bake inlines it for
   * the pad and the 3D pose.
   */
  readonly contact: string;
  /** What the readout line shows per held target. */
  readonly readout: readonly DriveReadout[];
  /** Clicking a target in the 3D view also drives it; a click aimed at a direction reads that direction (G-22). */
  readonly pickInView: boolean;
  /**
   * What the pad draws, as metric ids of the build: `regions` one wedge or
   * key per contact pad, `threshold` the contact curve per azimuth (TOGGLE
   * dashed curve), `stop` the hard stop rim. draw "geometry" is the only
   * value: a pad drawn from anything else fails G-19.
   */
  readonly pad?: {
    readonly draw: "geometry";
    readonly regions: string;
    readonly threshold?: string;
    readonly stop?: string;
  };
  /** Spring back settle time after release, ms; exponential, cut at 6 tau. Default 360 (TOGGLE, computed from tau 60 ms). */
  readonly springMs?: number;
  /** A hold checkbox keeps the stimulus for inspection (TOGGLE). */
  readonly holdToggle?: boolean;
  /** Several targets may be held at once (PIP chords). */
  readonly chords?: boolean;
  /** stick only: four or eight hold targets by direction. */
  readonly split?: "4" | "8";
}

/** Plot behaviour word bands, ascending `below` (PIP soft spring, clicks, latches). */
export interface PlotBehaviour {
  /** Metric id the bands read. */
  readonly metric: string;
  readonly words: readonly { readonly below: number; readonly word: string }[];
}

/**
 * A solved curve drawn as a panel (P-04, gold standard 4.2 rule 4): the
 * curve, the contact line, the peak dot and one behaviour word chosen by
 * thresholds. Rendered by the "plot.<id>" panel.
 */
export interface PlotDecl {
  /**
   * Metric id of the curve in the axes' units. Metric values are scalars
   * (part-ir.ts), so the curve is sampled metrics `<metric>.n`,
   * `<metric>.d<i>` (x) and `<metric>.F<i>` (y), as click-spring-key
   * emits spring.curve.
   */
  readonly metric: string;
  readonly x: { readonly label: string; readonly unit: string };
  readonly y: { readonly label: string; readonly unit: string };
  readonly marks: readonly ("contact" | "peak" | "zero")[];
  readonly behaviour?: PlotBehaviour;
  /**
   * A claim band shaded behind the curve, as metric ids of its low and
   * high edges in the y unit (a design-local claim until function claims
   * land, plan v9 section 3.2).
   */
  readonly band?: { readonly lo: string; readonly hi: string };
  /**
   * Prefix of measured points in the axes' units, `<prefix>.n`,
   * `<prefix>.d<i>`, `<prefix>.F<i>`, as the curve's sampled metrics are
   * written; the panel draws none until a coupon enters them.
   */
  readonly measured?: string;
}

/** A stage tool (P-13): BLOCKS place, wire, rotate, delete; COTTER move on the lattice. */
export interface StageTool {
  readonly id: "move" | "wire" | "rotate" | "delete" | "place" | "run";
  /** JSON pointer into params the tool writes, for example "/hooks". */
  readonly writes: string;
  /** Rail step names where the tool shows. */
  readonly steps: readonly string[];
}

/**
 * Installed context (P-11, COTTER): the product at its real mount height
 * over a floor, with an eye-height mark and the "eye" cam. Props are
 * preview only, seeded by part id, and never export.
 */
export interface SceneContext {
  /** Mount height of the model origin above the floor, mm. */
  readonly mountMm: number;
  readonly floor: boolean;
  /** Eye height for the eye cam and mark, mm. */
  readonly eyeMm?: number;
  readonly props?: { readonly seed: "part.id"; readonly export: false };
}

export interface ViewsDecl {
  readonly default: ViewMode;
  readonly modes: readonly ViewMode[];
  /** Ghost and xray fade structural bodies only; conductive and flex bodies stay solid (G-16). wire draws edges. */
  readonly render: readonly ("solid" | "ghost" | "xray" | "wire")[];
  readonly overlays: readonly Overlay[];
  /** Required when overlays includes "drive"; chase.validate refuses otherwise. */
  readonly drive?: DriveDecl;
  /** Camera presets and view modes share one strip on the stage. */
  readonly cams?: readonly CamPreset[];
  /** Stage ground: void, or void with the graph rule. Never paper; the void is where the machine draws (UI.md section 5, GUIDELINES). */
  readonly stage?: "void" | "graph";
  /**
   * Sets of modes and renders that may be on together (P-10, G-17), for
   * example [["exploded", "section"]]. Absent: modes are exclusive. plate
   * excludes xray unless a set lists both.
   */
  readonly combine?: readonly (readonly (ViewMode | "ghost" | "xray" | "wire")[])[];
  /** What the section plane follows (P-10, G-23); the legend names the cut. */
  readonly section?: { readonly follows: "drive" | "selection" | "plane" };
  /**
   * Explode along each body's insertion vector from its joint, in multiples
   * of the metric named by `unit`, a derived height (P-10, TANG r6_4).
   */
  readonly explode?: { readonly along: "insertion"; readonly unit: string };
  /** Installed context (P-11). Required when cams includes "eye". */
  readonly scene?: SceneContext;
  /** Stage tools (P-13); requires overlays "tools". */
  readonly tools?: readonly StageTool[];
  /**
   * Registered widgets (spec/widgets.ts, plan v9 section 3.2). A kind no
   * widget registry holds is E_REF at chase.validate.
   */
  readonly widgets?: readonly WidgetDecl[];
}

/**
 * Panel registry id, a param group or a plot: "materials", "fits",
 * "checks", "nets", "hookup", "exports", "notes", "coupon",
 * "params.<groupId>" (plan-deltas R90), "plot.<plotId>" (P-04).
 * "coupon" takes per-cell entries for a printed coupon and emits a coupon
 * record for a person to commit, never a profile row (PROFILE.md 11.1).
 * defineBench refuses a "params.<groupId>" naming no group of its chase and
 * a "plot.<plotId>" naming no entry of BenchDecl.plots.
 */
export type PanelRef = string;

export interface RailStep {
  /** Step name, lowercase in source; the steps strip uppercases it by CSS. The last step is the export step, print for one process or make for a kit (D-125). */
  readonly step: string;
  /** One line for the guide bar. */
  readonly goal: string;
  readonly panels: readonly PanelRef[];
  /**
   * Param id, derived field id or action id that is this pane's one focal
   * pink element (D-125, P-08). A derived id makes that value the focus,
   * as COLLAR's pause layer on PRINT.
   */
  readonly focus?: string;
  /** View mode applied on step entry (P-08, G-44): PRINT opens plate. */
  readonly view?: ViewMode;
  /** Camera applied on step entry (P-08, G-44): underside work opens under. */
  readonly cam?: CamPreset;
}

/**
 * Status strip chips, each a worded lit chip (P-09). mesh.fresh reads
 * `mesh current` or `mesh stale` (G-03); warn.count counts the findings in
 * the rail for the view on screen (G-36); bed.fit reads `fits bed` or
 * `over bed` (G-18); derived.<id> shows a declared derived field.
 */
export type StatusChip =
  | "n_parts" | "fits.verdict" | "checks.verdict" | "build.hash" | "print.time" | "nets.verdict" | "trials"
  | "mesh.fresh" | "mesh.manifold" | "route.verdict" | "warn.count" | "bed.fit" | "mass"
  | `derived.${string}`;

/** A welcome start written as an intent (P-28, COTTER and TOGGLE). */
export interface WelcomeStart {
  /** Chase preset id; defineBench refuses an id the chase lacks. */
  readonly preset: string;
  /** One line, lowercase, what the person wants to make. */
  readonly intent: string;
  /** Process line, for example "fdm, two filaments". */
  readonly process?: string;
  /** Print or make time as a person reads it, for example "2 h 10 min", qualified where shown. */
  readonly time?: string;
}

export interface Welcome {
  /** One line under the tool title. */
  readonly tagline?: string;
  /** Chase preset ids offered on the welcome card (D-125); defineBench refuses an id the chase lacks. */
  readonly presets?: readonly string[];
  /** Starts written as intents (P-28); when present they replace `presets` on the card. */
  readonly starts?: readonly WelcomeStart[];
}

/** Build behaviour the shell exposes (P-29, G-56). */
export interface BuildDecl {
  /** Show the auto-rebuild switch and a rebuild-now verb. */
  readonly autoToggle: boolean;
  /** A build over this logs a slow-build line naming the param to lower, ms. Default 2500 (COLLAR). */
  readonly slowMs: number;
}

export type SlotRegion = "rail.before" | "rail.after-params" | "stage.overlay" | "status.extra";

/** What a bench file declares; defineBench adds the chase id. */
export interface BenchDecl {
  readonly shell: Shell;
  readonly views: ViewsDecl;
  /**
   * One pane per step. Optional for the surface kind. Materials and
   * resistivity are a step pane or a fold in the first step, and the stage
   * legend is the colour key on every step (P-21: owner decision pending;
   * this is the gold default, from all six gold benches).
   */
  readonly rail?: readonly RailStep[];
  readonly welcome?: Welcome;
  readonly status?: readonly StatusChip[];
  /** Solved curves, keyed by plot id, rendered by "plot.<id>" panels (P-04). */
  readonly plots?: Readonly<Record<string, PlotDecl>>;
  readonly build?: BuildDecl;
  /** Named regions to a custom component; the escape hatch. */
  readonly slots?: Partial<Readonly<Record<SlotRegion, string>>>;
}

/**
 * A bench bound to one chase. benchHash (RFC 8785 canonical JSON of this
 * value) enters the bake's hash and BenchHook, never BuildInputs.
 */
export interface Bench extends BenchDecl {
  /** meta.id of the chase this bench lays out. */
  readonly chase: string;
  /** Bench schema version. */
  readonly bench: typeof BENCH_SCHEMA_VERSION;
}

// Reference checks: a rail panel "params.<g>" must name a param group of the
// chase, and a welcome preset must name a chase preset. A bad reference
// turns the offending string into a message type, so tsc fails on that line.

type GroupId<C extends Chase> = C["params"][number]["id"];
type PresetId<C extends Chase> = C extends { readonly presets: readonly (infer P)[] } ? (P extends { readonly id: infer I } ? I : never) : never;

type PlotId<B> = B extends { readonly plots: infer P } ? keyof P & string : never;

type CheckPanel<C extends Chase, B, P> =
  P extends `params.${infer G}` ? (G extends GroupId<C> ? P : `unknown param group: ${G}`)
  : P extends `plot.${infer I}` ? (I extends PlotId<B> ? P : `unknown plot: ${I}`)
  : P;

type CheckStep<C extends Chase, B, S> =
  S extends { readonly panels: readonly (infer P)[] }
    ? Omit<S, "panels"> & { readonly panels: readonly CheckPanel<C, B, P>[] }
    : S;

type CheckPreset<C extends Chase, P> = P extends PresetId<C> ? P : `unknown preset: ${P & string}`;

type CheckedRail<C extends Chase, B> =
  B extends { readonly rail: infer R extends readonly unknown[] } ? { readonly rail: { readonly [I in keyof R]: CheckStep<C, B, R[I]> } } : unknown;

type CheckStart<C extends Chase, S> =
  S extends { readonly preset: infer P } ? { readonly preset: CheckPreset<C, P> } : unknown;

type CheckedWelcome<C extends Chase, B> =
  & (B extends { readonly welcome: { readonly presets: readonly (infer P)[] } }
      ? { readonly welcome: { readonly presets: readonly CheckPreset<C, P>[] } }
      : unknown)
  & (B extends { readonly welcome: { readonly starts: readonly (infer S)[] } }
      ? { readonly welcome: { readonly starts: readonly (WelcomeStart & CheckStart<C, S>)[] } }
      : unknown);

/** The bench as written, with every chase reference checked. */
export type CheckedBench<C extends Chase, B extends BenchDecl> = B & CheckedRail<C, B> & CheckedWelcome<C, B>;

/** Binds a bench to its chase and checks its references. */
export function defineBench<const C extends Chase, const B extends BenchDecl>(
  chase: C,
  bench: B & NoInfer<CheckedBench<C, B>>,
): Bench & B {
  return { ...bench, chase: chase.meta.id, bench: BENCH_SCHEMA_VERSION };
}
