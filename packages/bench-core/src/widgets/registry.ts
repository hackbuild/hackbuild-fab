// The widget registry (plan v9 section 3.2, R1-engine-12): one entry per
// widget kind, framework free. An entry turns a bench WidgetDecl and the
// current build into a model, and names which declared outputs the model
// holds a value for (liveness). The Vue side maps a kind to a component in
// packages/bench/src/widgets/registry.ts; BENCH.widgets() reads the records
// built here, so the control, the hook and the smoke suite read one model.
// M10-T06's slot registry is this registry (finding F5).

import type {
  Body, CheckResult, ClaimDecl, ContactFn, DriveDecl, Feature, HookupDecl, Metric, WidgetDecl, WidgetRecord,
} from "@hackbuild/spec";
import { driveTilt } from "./tilt.js";
import { drivePress, type WidgetClaimFn } from "./press.js";
import { plotCurve, type CurvePoint } from "./curve.js";
import { driveTouch } from "./touch.js";
import { driveFader } from "./fader.js";
import { readoutSignal } from "./signal.js";
import { driveCode, type WidgetCodeGate } from "./code.js";
import { viewLight, type LightAim } from "./light.js";
import { viewNetlens } from "./netlens.js";

export { isLive, liveOutputs } from "./live.js";

/** What a widget model reads from the current build. */
export interface WidgetBuild {
  readonly features: readonly Feature[];
  readonly metrics: readonly Metric[];
  readonly results: readonly CheckResult[];
  readonly hookup: readonly HookupDecl[];
  /** ContactFns build.ts exports, by name; WidgetDecl.fn names one. */
  readonly contacts: Readonly<Record<string, ContactFn>>;
  /** The bench's drive pad declaration, for the drive kinds that wrap it. */
  readonly drive?: DriveDecl;
  /** The chase's function claims (Chase.claims), for the kinds that read a claim. */
  readonly claims?: readonly ClaimDecl[];
  /** Claim functions by id, the entries of the packages/checks registry the host hands in; WidgetDecl.fn names one. */
  readonly claimFns?: Readonly<Record<string, WidgetClaimFn>>;
  /** The current drive.press stimulus, travel in mm; plot.curve draws it as the cursor. */
  readonly travelMm?: number;
  /** Measured points by claim id, travel mm and force N, from evidence rows; absent until a person enters a coupon. */
  readonly measured?: Readonly<Record<string, readonly CurvePoint[]>>;
  /** Hookup ports whose path is closed now: a touched pad or a held key (drive.touch, readout.signal). */
  readonly closed?: readonly string[];
  /** Finger positions 0 to 1 by finger-pot prefix (drive.fader, readout.signal). */
  readonly positions?: Readonly<Record<string, number>>;
  /** Code gates by id, bound by the host to the build's params (drive.code); WidgetDecl.fn names one. */
  readonly gates?: Readonly<Record<string, WidgetCodeGate>>;
  /** Dialed codes by widget id (drive.code). */
  readonly codes?: Readonly<Record<string, readonly number[]>>;
  /** Key insertion 0 to 1 by widget id (drive.code). */
  readonly insertion?: Readonly<Record<string, number>>;
  /** Key light aims by widget id (view.light). */
  readonly lights?: Readonly<Record<string, LightAim>>;
  /** The Part IR bodies, for the kinds that read a body's net (view.netlens). */
  readonly bodies?: readonly Pick<Body, "id">[];
  /** The lit net by widget id (view.netlens). */
  readonly lenses?: Readonly<Record<string, string>>;
  /** Measured readings by claim id in the claim's unit, from evidence rows (packages/checks measuredValues); plot.curve draws them where measured gives none. */
  readonly readings?: Readonly<Record<string, readonly number[]>>;
}

/** A widget's model: every output the kind computes, and why it computes none. */
export interface WidgetModel {
  readonly id: string;
  readonly kind: string;
  readonly outputs: Readonly<Record<string, unknown>>;
  readonly problem: string | null;
}

export interface WidgetEntry<M extends WidgetModel = WidgetModel> {
  model(decl: WidgetDecl, build: WidgetBuild): M;
  /** Declared outputs the model holds a value for. */
  liveness(model: M, decl: WidgetDecl): string[];
}

const entries = new Map<string, WidgetEntry>();

/** Registers a kind; a second registration of one kind throws. */
export function registerWidget<M extends WidgetModel>(kind: string, entry: WidgetEntry<M>): void {
  if (entries.has(kind)) throw new Error(`widget kind ${kind} is registered twice`);
  entries.set(kind, entry as unknown as WidgetEntry);
}

/** Registered kinds, sorted; chase.validate reads them as ChaseRegistries.widgetKinds. */
export function widgetKinds(): string[] {
  return [...entries.keys()].sort();
}

/** The entry of a kind; an unregistered kind throws, naming the registered ones. */
export function widgetEntry(kind: string): WidgetEntry {
  const e = entries.get(kind);
  if (e === undefined) throw new Error(`widget kind ${kind} is not registered. registered: ${widgetKinds().join(", ")}`);
  return e;
}

/** The model of one declared widget on the current build. */
export function widgetModel(decl: WidgetDecl, build: WidgetBuild): WidgetModel {
  return widgetEntry(decl.kind).model(decl, build);
}

/**
 * What BENCH.widgets() returns: per declared widget, its declared outputs
 * on this build and the live ones. A declared output the kind does not
 * compute is a problem on the record, never a silent gap.
 */
export function widgetRecords(decls: readonly WidgetDecl[], build: WidgetBuild): WidgetRecord[] {
  return decls.map((decl) => {
    const entry = widgetEntry(decl.kind);
    const model = entry.model(decl, build);
    const unknown = decl.outputs.filter((o) => !(o in model.outputs));
    const outputs = Object.fromEntries(decl.outputs.filter((o) => o in model.outputs).map((o) => [o, model.outputs[o]]));
    const problem = unknown.length > 0 ? `${decl.kind} has no output ${unknown.join(", ")}` : model.problem;
    return { id: decl.id, kind: decl.kind, outputs, live: entry.liveness(model, decl), problem };
  });
}

// The registered kinds, one line each.
registerWidget("drive.tilt", driveTilt);
registerWidget("drive.press", drivePress);
registerWidget("plot.curve", plotCurve);
registerWidget("drive.touch", driveTouch);
registerWidget("drive.fader", driveFader);
registerWidget("readout.signal", readoutSignal);
registerWidget("drive.code", driveCode);
registerWidget("view.light", viewLight);
registerWidget("view.netlens", viewNetlens);
