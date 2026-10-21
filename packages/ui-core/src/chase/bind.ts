// bindChase (M10-T06 step 1, single and composer kinds): one binding from a
// validated chase and its bench to the M09 bench core, the rail model, the
// welcome starts, the declared status chips, the drive model, the widget
// records and the BENCH hook. Framework-free; packages/ui ChaseBench.vue mounts the
// result through BenchShell, and mountBench is that mount.
//
// What the binding adds over the M09 mount: every loadDesign and every
// BENCH.state set runs the chase normaliser (D-131, M10-T03 step 3), whose
// report reaches the next build as W_NORMALISED warnings; the NaN check of
// D-131 runs after every build and a non-finite value fails the build with
// E_PARAM_MISSING, so the previous model stays on screen; and the drop,
// picker and share paths admit through packages/chase shareOptions (D-167).
// A build that throws keeps the last good model drawn and names the refusal
// (D-643): refused() gives the stale line and the closed export's reason, and
// a refusal at a range end writes one log line naming field, value and range.

import {
  type Bench, type Chase, type CheckResult, type ContactFn, type Metric, type ParamGroup, type RailStep, type StatusChip, type WidgetRecord,
} from "@hackbuild/spec";
import { isChaseDocument, nonFiniteError, normaliseParams, normalisedWarnings, shareOptions, storedParams } from "@hackbuild/chase";
import { createBenchCore, type BenchCore, type BuildOutput, type BuildResult, type CoreEvent } from "../bench/core.js";
import { createHook, installHook, FREE_EXPORTS, type Hook, type HookExport, type HookOptions } from "../bench/hook.js";
import { exportClosedLine, rangeEndLine, refusalLine } from "../bench/refusal.js";
import { admitDesign, type AdmitOptions } from "../bench/share.js";
import { startPreset, welcomeStarts, type WelcomeStart } from "../bench/welcome.js";
import { createPad, padModel, type Pad, type PadModel } from "../drive/drive.js";
import { widgetRecords, type WidgetBuild } from "../widgets/registry.js";
import type { WidgetClaimFn } from "../widgets/press.js";
import type { ViewPart } from "../viewer/scene.js";

export type Values = Record<string, unknown>;

/** What a chase build reports beside the part; the rest of a page's report passes through. */
export interface ChaseReport {
  readonly results?: readonly CheckResult[];
  readonly metrics?: readonly Metric[];
}

/** The part and report of the build on screen, or none before the first. */
export interface BuildView<R extends ChaseReport = ChaseReport> {
  readonly part: ViewPart | null;
  readonly report: R;
}

/** One export a page writes from a build (structurally packages/ui BenchWriter). */
export interface ChaseWriter<R extends ChaseReport = ChaseReport> {
  /** The file name a download takes. */
  readonly file: string;
  readonly media: string;
  write(result: BuildResult<ViewPart, R>): Promise<{ readonly bytes: Uint8Array | string }>;
}

/** How a rail panel id reads (spec/bench.ts PanelRef); `panel` ids resolve in the ui panel registry. */
export type PanelRow =
  | { readonly id: string; readonly kind: "params"; readonly group: ParamGroup }
  | { readonly id: string; readonly kind: "notes"; readonly key: string; readonly heading: string; readonly note: string | null }
  | { readonly id: string; readonly kind: "plot"; readonly plot: string }
  | { readonly id: string; readonly kind: "materials" }
  | { readonly id: string; readonly kind: "panel" }
  | { readonly id: string; readonly kind: "absent" };

export interface RailRow {
  readonly step: string;
  readonly goal: string;
  readonly panels: readonly PanelRow[];
  readonly focus?: string;
  readonly view?: string;
}

/** The export step's names (D-125): print for one process, make for a kit. */
export const EXPORT_STEPS: readonly string[] = ["print", "make"];

/** The status line while a page has no geometry build. */
export const NO_BUILD = "this bake carries no geometry build. the rail, undo and design files work; the stage stays empty.";

export const NOT_IN_BAKE = (kind: string): string => `${kind} export is not in this bake yet`;

/** The refusal of a chase document dropped on a bench. */
export const NOT_A_DESIGN = "this file is a chase, not a design. open it with hbf chase.validate";

const PARAMS = "params.";
const NOTES = "notes.";
const PLOT = "plot.";

/** How one rail panel id reads against the chase's param groups. */
export function panelRow(id: string, groups: readonly ParamGroup[]): PanelRow {
  if (id.startsWith(PARAMS)) {
    const group = groups.find((g) => g.id === id.slice(PARAMS.length));
    return group === undefined ? { id, kind: "absent" } : { id, kind: "params", group };
  }
  if (id.startsWith(NOTES)) {
    const key = id.slice(NOTES.length);
    const group = groups.find((g) => g.id === key);
    return { id, kind: "notes", key, heading: group?.label ?? key.toUpperCase(), note: group?.note ?? null };
  }
  if (id.startsWith(PLOT)) return { id, kind: "plot", plot: id.slice(PLOT.length) };
  if (id === "materials") return { id, kind: "materials" };
  return { id, kind: "panel" };
}

/** The rail model: one row per declared step, each panel read against the chase. */
export function railRows(chase: Pick<Chase, "params">, rail: readonly RailStep[]): RailRow[] {
  return rail.map((s) => ({
    step: s.step, goal: s.goal, panels: s.panels.map((p) => panelRow(p, chase.params)),
    ...(s.focus === undefined ? {} : { focus: s.focus }),
    ...(s.view === undefined ? {} : { view: s.view }),
  }));
}

/** Error line when a rail's last step is not an export step; null when it is. */
export function railEndError(steps: readonly { readonly step: string }[]): string | null {
  const last = steps.at(-1)?.step;
  if (last !== undefined && EXPORT_STEPS.includes(last.toLowerCase())) return null;
  return `rail ends in ${last ?? "no step"}; the last step is the export step, print or make (D-125)`;
}

/** Welcome starts: start blank first, then each preset the bench's welcome names, in its order (D-125). */
export function chaseStarts(chase: Pick<Chase, "presets">, bench: Pick<Bench, "welcome">): WelcomeStart[] {
  const presets = (bench.welcome?.presets ?? []).flatMap((id) => {
    const p = chase.presets?.find((x) => x.id === id);
    return p === undefined ? [] : [{ id: p.id, label: p.label }];
  });
  return welcomeStarts(presets);
}

/** The drive pad on a build, or null when the bench declares none or hides its overlay. */
export function driveModel(chase: Chase, bench: Bench, contact: ContactFn | null, src: BuildView): PadModel | null {
  const decl = bench.views.drive;
  if (decl === undefined || !bench.views.overlays.includes("drive")) return null;
  return padModel({
    decl, hookup: chase.hookup ?? [], features: src.part?.part.features ?? [],
    metrics: src.report.metrics ?? [], results: src.report.results ?? [], contact,
  });
}

/** A build as the widgets read it: the claim functions and the press stimulus beside the part and report. */
export interface WidgetView extends BuildView {
  /** Claim functions by id, from the page build's claim registry; without them the claim widgets name what is missing. */
  readonly claimFns?: Readonly<Record<string, WidgetClaimFn>>;
  /** The drive.press travel, mm, the person dragged to. */
  readonly travelMm?: number;
  /** drive.code gates, dialed codes and insertion; view.light aims; view.netlens lit nets (WidgetBuild fields of one name). */
  readonly widgetInputs?: Pick<WidgetBuild, "gates" | "codes" | "insertion" | "lights" | "lenses">;
}

/** The records BENCH.widgets() returns for the bench's declared widgets on a build (the R1-engine-12 registry). */
export function widgetsModel(chase: Chase, bench: Bench, contact: ContactFn | null, src: WidgetView): WidgetRecord[] {
  const decls = bench.views.widgets ?? [];
  if (decls.length === 0) return [];
  const drive = bench.views.drive;
  return widgetRecords(decls, {
    features: src.part?.part.features ?? [], metrics: src.report.metrics ?? [], results: src.report.results ?? [],
    hookup: chase.hookup ?? [],
    contacts: drive !== undefined && contact !== null ? { [drive.contact]: contact } : {},
    ...(drive === undefined ? {} : { drive }),
    ...(chase.claims === undefined ? {} : { claims: chase.claims }),
    ...(src.claimFns === undefined ? {} : { claimFns: src.claimFns }),
    ...(src.travelMm === undefined ? {} : { travelMm: src.travelMm }),
    ...(src.part === null ? {} : { bodies: src.part.part.bodies }),
    ...src.widgetInputs,
  });
}

export interface BindOptions<R extends ChaseReport = ChaseReport> {
  readonly chase: Chase;
  readonly bench: Bench;
  /** The library build (packages/ui pageBench); without one each build throws NO_BUILD and the stage stays empty. */
  readonly build?: (state: Values) => Promise<BuildOutput<ViewPart, R>>;
  /** Export writers by kind beside json; a declared kind with none refuses with NOT_IN_BAKE. */
  readonly writers?: Readonly<Record<string, ChaseWriter<R>>>;
  /** The ContactFn the bench's DriveDecl.contact names, from the design's build.ts. */
  readonly contact?: ContactFn | null;
  /** Claim functions by id for the drive.press and plot.curve widgets (packages/checks claimFn entries). */
  readonly claimFns?: Readonly<Record<string, WidgetClaimFn>>;
  /** The drive.press travel, mm, the person dragged to; undefined leaves the claim's own travel. */
  readonly travel?: () => number | undefined;
  /** designs/<id>/migrate/legacy.ts, when the design reads legacy saves. */
  readonly legacy?: (doc: unknown) => unknown;
  /** Runs on every core event and pad change, after the binding exists. */
  readonly onChange?: (event: CoreEvent | "held") => void;
  /** Define `BENCH` on globalThis; default true. The kit mounts several benches and sets it false. */
  readonly install?: boolean;
  /** Pauses the viewer for an export and returns the resume. */
  readonly pause?: () => () => void;
  /** Page boot (kernel, share link), handed the binding; the first build runs after it. */
  readonly boot?: (binding: ChaseBinding<R>) => Promise<unknown>;
}

/** A refused current build as the shell shows it (D-643). */
export interface RefusedView {
  /** The stale line: what refused, why, and that the model drawn is the last good one. */
  readonly line: string;
  /** Why every export stays disabled. */
  readonly exportWhy: string;
}

export interface ChaseBinding<R extends ChaseReport = ChaseReport> {
  readonly chase: Chase;
  readonly bench: Bench;
  readonly core: BenchCore<Values, ViewPart, R>;
  readonly contact: ContactFn | null;
  readonly pad: Pad;
  readonly rail: readonly RailRow[];
  /** Non-null when the rail does not end in the export step. */
  readonly railError: string | null;
  readonly starts: readonly WelcomeStart[];
  /** The bench's declared chips, in order. */
  readonly status: readonly StatusChip[];
  readonly exports: readonly HookExport<ViewPart, R>[];
  /** Declared export kinds this page writes. */
  readonly writable: readonly string[];
  /** Declared export kinds gated as fabrication. */
  readonly fabrication: readonly string[];
  readonly writers: Readonly<Record<string, ChaseWriter<R>>>;
  /** Drop, picker and share link admission (packages/chase shareOptions). */
  readonly admit: AdmitOptions;
  readonly hook: Hook["hook"];
  readonly whenReady: Promise<void>;
  /** The build on screen. */
  view(): BuildView<R>;
  /** The refusal of the build the stage is not showing; null after a good build. */
  refused(): RefusedView | null;
  drive(): PadModel | null;
  widgets(): WidgetRecord[];
  /** Admits a dropped or picked file and loads it; a refusal goes to the log. */
  open(text: string): void;
  /** A welcome start: BLANK_START, or a preset's presetStart id. */
  start(id: string): void;
}

type Obj = Record<string, unknown>;
const isPlain = (v: unknown): v is Obj => v !== null && typeof v === "object" && !Array.isArray(v);

export function bindChase<R extends ChaseReport = ChaseReport>(opts: BindOptions<R>): ChaseBinding<R> {
  const { chase, bench } = opts;
  const contact = opts.contact ?? null;
  let binding: ChaseBinding<R> | undefined;
  const notify = (e: CoreEvent | "held"): void => {
    if (binding !== undefined) opts.onChange?.(e);
  };

  /** W_NORMALISED warnings of the last load, carried by the next build. */
  let pending: ReturnType<typeof normalisedWarnings> = [];
  const build = opts.build;
  const guarded = async (state: Values): Promise<BuildOutput<ViewPart, R>> => {
    if (build === undefined) throw new Error(NO_BUILD);
    const out = await build(state);
    const bad = nonFiniteError({
      metrics: out.report.metrics ?? [],
      bodies: Object.entries(out.part.meshes).map(([id, m]) => ({ id, positions: m.positions })),
    });
    if (bad !== undefined) throw new Error(`${bad.code} at ${bad.path}: ${bad.hint}`);
    const carried = pending;
    pending = [];
    return carried.length === 0 ? out : { ...out, warnings: [...(out.warnings ?? []), ...carried] };
  };

  /** rev whose refusal has been logged, so each refused build writes its range-end line once. */
  let loggedRev = -1;
  const onCore = (e: CoreEvent): void => {
    const r = e === "error" ? core.refusal : null;
    if (r !== null && r.rev !== loggedRev) {
      loggedRev = r.rev;
      const line = rangeEndLine(chase.params, r);
      if (line !== null) core.appendLog(line);
    }
    notify(e);
  };

  const blank = normaliseParams(chase, undefined).params;
  const core: BenchCore<Values, ViewPart, R> = createBenchCore<Values, ViewPart, R>({
    app: chase.meta.id,
    v: chase.meta.chase,
    blank: () => structuredClone(blank),
    build: guarded,
    migrate: (doc) => {
      const { params, report } = normaliseParams(chase, storedParams(doc));
      pending = normalisedWarnings(report);
      for (const w of pending) core.appendLog(w.text);
      return { ...(isPlain(doc) && typeof doc["app"] === "string" ? { app: doc["app"] } : {}), state: params };
    },
    ...(bench.build === undefined ? {} : { slowMs: bench.build.slowMs }),
    onChange: onCore,
  });
  const pad = createPad(() => notify("held"));

  const shared = shareOptions({ chase, ...(opts.legacy === undefined ? {} : { legacy: opts.legacy }) });
  const admit: AdmitOptions = {
    migrate: shared.migrate,
    ...(shared.legacy === undefined ? {} : { legacy: shared.legacy }),
    validate: (d) => (isChaseDocument(d) ? NOT_A_DESIGN : shared.validate(d)),
  };

  const json: ChaseWriter<R> = { file: `${chase.meta.id}.json`, media: "application/json", write: async () => ({ bytes: core.designJson() }) };
  const writers: Readonly<Record<string, ChaseWriter<R>>> = { ...opts.writers, json };
  // One export path: the export button and BENCH.exportBytes both run the hook's gate.
  const exports: HookExport<ViewPart, R>[] = chase.exports.map((x) => ({
    kind: x.kind,
    fabrication: !FREE_EXPORTS.includes(x.kind),
    write: async (result) => {
      const w = writers[x.kind];
      if (w === undefined) throw new Error(NOT_IN_BAKE(x.kind));
      return (await w.write(result)).bytes;
    },
  }));

  const view = (): BuildView<R> => ({ part: core.result?.part ?? null, report: core.result?.report ?? ({} as R) });
  const drive = (): PadModel | null => driveModel(chase, bench, contact, view());
  const widgets = (): WidgetRecord[] => {
    const travelMm = opts.travel?.();
    return widgetsModel(chase, bench, contact, {
      ...view(),
      ...(opts.claimFns === undefined ? {} : { claimFns: opts.claimFns }),
      ...(travelMm === undefined ? {} : { travelMm }),
    });
  };
  // BENCH.model is one object per build, as PIP's MODEL is: the part and meshes, the metrics drive targets read, the check results.
  const models = new WeakMap<object, unknown>();
  const model = (r: BuildResult<ViewPart, R>): unknown => {
    let m = models.get(r);
    if (m === undefined) {
      m = { ...r.part, metrics: r.report.metrics ?? [], report: { results: r.report.results ?? [] } };
      models.set(r, m);
    }
    return m;
  };

  const hookOptions: HookOptions<ViewPart, R> = {
    exports,
    params: chase.params,
    checks: (r) => r.report.results ?? [],
    model,
    drive: async (target, value) => {
      await core.ensureMesh();
      const m = drive();
      if (m === null) throw new Error("this bench declares no drive pad");
      if (m.problem !== null) throw new Error(m.problem);
      const t = m.targets.find((x) => x.target === target);
      if (t === undefined) throw new Error(`no drive target ${target}; targets are ${m.targets.map((x) => x.target).join(", ")}`);
      if (t.read === null) throw new Error(t.missing ?? `${target} has no read`);
      pad.drive(target, value);
      const { waitFrom: _from, ...record } = t.read;
      return record;
    },
    release: async (target) => pad.release(target),
    widgets,
    ...(opts.pause === undefined ? {} : { pause: opts.pause }),
    boot: Promise.resolve().then(() => opts.boot?.(binding as ChaseBinding<R>)),
  };
  const hooked = opts.install === false ? createHook(core, hookOptions) : installHook(core, hookOptions);
  const rail = railRows(chase, bench.rail ?? []);
  binding = {
    chase, bench, core, contact, pad, rail,
    railError: bench.rail === undefined ? null : railEndError(bench.rail),
    starts: chaseStarts(chase, bench),
    status: bench.status ?? [],
    exports,
    writable: chase.exports.map((x) => x.kind).filter((k) => writers[k] !== undefined),
    fabrication: exports.filter((x) => x.fabrication).map((x) => x.kind),
    writers, admit,
    hook: hooked.hook,
    whenReady: hooked.whenReady,
    view, drive,
    refused() {
      const r = core.refusal;
      return r === null ? null : { line: refusalLine(chase.params, r), exportWhy: exportClosedLine(chase.params, r) };
    },
    widgets,
    open(text) {
      const got = admitDesign(text, admit);
      if (!got.ok) core.appendLog(`design file not opened: ${got.error.record ?? "design"}, ${got.error.hint}`);
      else core.loadDesign(JSON.stringify(got.design));
    },
    start(id) {
      const name = startPreset(id);
      const preset = name === null ? undefined : chase.presets?.find((p) => p.id === name);
      if (preset === undefined) core.reset();
      else core.loadPreset((fresh) => normaliseParams(chase, { ...fresh, ...structuredClone(preset.params) }).params);
    },
  };
  return binding;
}
