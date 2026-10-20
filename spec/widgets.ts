// spec/widgets.ts
/**
 * Status: draft until the release 1 exit. MILESTONES.md 1.5, D-179.
 * Release 1 item R1-engine-12 is the first that runs this file (the widget
 * registry in packages/ui-core/src/widgets and packages/ui/src/widgets).
 */
// Widgets (PLAN.md section 3.2). A widget is a registry entry: a kind, the
// claim or contact function it calls, its inputs, its outputs and the
// tolerance the bench, the studio and the check agree to. The bench, the
// studio and the check call the same function, so the control, the 3D pose
// and the check agree, as TOGGLE's drive pad does. A bench declares its
// widgets in views.widgets (spec/bench.ts); chase.validate refuses a kind
// no registry holds with E_REF, record "chase-ref/widget-kind". M10-T06's
// slot registry is this registry (finding F5): `region` places a widget
// where a slot would have gone.
// Version 1, 2026-10-20.

/** The first kinds, from the benches (PLAN.md 3.2). */
export const WIDGET_KINDS = [
  "drive.tilt", "drive.press", "drive.touch", "drive.fader", "drive.code",
  "plot.curve", "readout.signal", "view.light", "view.netlens",
] as const;

/**
 * drive.tilt: TOGGLE stick, PIP. drive.press: PIP keys, access switch.
 * drive.touch: PIP touch pads. drive.fader: BLOCKS slider. drive.code:
 * tumbler and lockbox wheels. plot.curve: force or resistance against
 * travel. readout.signal: what the MCU reads. view.light: coin preview.
 * view.netlens: net highlighting.
 */
export type WidgetKind = (typeof WIDGET_KINDS)[number];

/** Where a widget draws; the slot regions of M10-T06 that release 1 keeps. */
export type WidgetRegion = "stage.overlay" | "rail.after-params" | "status.extra";

/** A widget input bound to a param: a JSON pointer into params, as StageTool.writes is ("/travel/contactTilt"). */
export interface ParamRef {
  readonly param: string;
}

export interface WidgetDecl {
  /** Unique within the bench. */
  readonly id: string;
  readonly kind: WidgetKind;
  /**
   * What the widget calls: a claim function id (packages/checks claim
   * registry) or the name of a ContactFn build.ts exports; for drive.touch
   * the charge-release check id (CHK-NET-29), for drive.fader the metric
   * prefix of the placed finger pot (finger-pot.0), for readout.signal the
   * hookup port it reads.
   */
  readonly fn: string;
  /** Inputs beside the build, a param binding or a number; units in the key suffix. */
  readonly inputs: Readonly<Record<string, ParamRef | number>>;
  /** Output names the widget publishes; BENCH.widgets() reads them and liveness tests cover them. */
  readonly outputs: readonly string[];
  /** Agreement between the control, the pose and the check, in the output's unit (G-20: 0.01). */
  readonly tolerance: number;
  readonly region: WidgetRegion;
}

/** One widget as BENCH.widgets() returns it: its outputs on the current build and which of them are live. */
export interface WidgetRecord {
  readonly id: string;
  readonly kind: string;
  readonly outputs: Readonly<Record<string, unknown>>;
  /** Declared outputs that hold a value on this build. */
  readonly live: readonly string[];
  /** Why the widget has nothing to show; null when it has. */
  readonly problem: string | null;
}
