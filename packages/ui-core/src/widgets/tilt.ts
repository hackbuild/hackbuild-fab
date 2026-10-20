// drive.tilt (plan v9 section 3.2: TOGGLE stick, PIP): the drive pad model
// of src/drive/drive.ts behind the widget registry, with no change to what
// the pad computes. The widget's fn names the ContactFn build.ts exports;
// it must be the one the bench's DriveDecl names, or the pad and the widget
// would call two functions and could disagree (G-20).

import type { DriveDecl, PinState, WidgetDecl } from "@hackbuild/spec";
import { padModel, type PadModel } from "../drive/drive.js";
import { liveOutputs } from "./live.js";
import type { WidgetEntry, WidgetModel } from "./registry.js";

/** Gestures drive.tilt draws: a tilt target, or a stick split into directions. */
export const TILT_GESTURES: readonly DriveDecl["gesture"][] = ["tilt", "stick"];

export interface TiltModel extends WidgetModel {
  /** The wrapped pad model, unchanged. */
  readonly pad: PadModel;
}

const EMPTY_PAD: PadModel = { targets: [], problem: null };

function refusal(decl: WidgetDecl, problem: string): TiltModel {
  return { id: decl.id, kind: decl.kind, outputs: {}, problem, pad: { ...EMPTY_PAD, problem } };
}

const byTarget = <T>(pad: PadModel, f: (t: PadModel["targets"][number]) => T): Record<string, T> =>
  Object.fromEntries(pad.targets.map((t) => [t.target, f(t)]));

export const driveTilt: WidgetEntry<TiltModel> = {
  model(decl, build) {
    const drive = build.drive;
    if (drive === undefined) return refusal(decl, "this bench declares no drive pad; drive.tilt drives it");
    if (!TILT_GESTURES.includes(drive.gesture)) return refusal(decl, `drive gesture ${drive.gesture} is not tilt or stick; declare a drive.press widget for it`);
    if (decl.fn !== drive.contact) return refusal(decl, `widget fn ${decl.fn} is not the drive pad contact ${drive.contact}; name one function for both`);
    const pad = padModel({
      decl: drive,
      hookup: build.hookup,
      features: build.features,
      metrics: build.metrics,
      results: build.results,
      contact: build.contacts[decl.fn] ?? null,
    });
    const outputs: Record<string, unknown> = {
      targets: pad.targets.map((t) => t.target),
      contacts: byTarget(pad, (t) => t.contacts),
      pins: byTarget(pad, (t) => t.read?.pin ?? null),
      logic: byTarget(pad, (t): PinState | null => t.read?.logic ?? null),
      idle: byTarget(pad, (t) => t.idle),
    };
    return { id: decl.id, kind: decl.kind, outputs, problem: pad.problem, pad };
  },
  liveness: liveOutputs,
};
