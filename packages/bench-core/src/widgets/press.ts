// drive.press (plan v9 section 3.2: PIP keys, the access switch): press a
// key the build places by a travel in mm and read the force and the
// contact. The force is the claim function the widget's fn names
// (spring.forceAt), called with the claim's own args and the travel, so
// the control and CHK-CLAIM-01 read one function (G-20, agree to 0.01).
// The contact is the design's ContactFn the bench's drive pad names, the
// one the pad, the 3D pose and BENCH.drive call. The host hands both in:
// the claim functions live in packages/checks, which a bake loads from the
// page build script (D-264), never from this package.

import type { ClaimDecl, ContactFn, DriveDecl, Metric, WidgetDecl } from "@hackbuild/spec";
import { targetIds } from "../drive/drive.js";
import { fmt } from "../bench/locate.js";
import { liveOutputs } from "./live.js";
import type { WidgetBuild, WidgetEntry, WidgetModel } from "./registry.js";

/** Claim arguments, as ClaimDecl.args declares them; units in the key suffix. */
export type WidgetClaimArgs = Readonly<Record<string, number | string>>;

/**
 * A claim function as the widgets call it: the shape of packages/checks
 * RegisteredClaimFn, so the host passes the registry's own entry.
 */
export interface WidgetClaimFn {
  /** Unit of the number fn returns, the claim's want.unit. */
  readonly unit: string;
  readonly inputs: Readonly<Record<string, { readonly unit?: string }>>;
  readonly fn: (metrics: readonly Metric[], args: WidgetClaimArgs, ctx: { readonly contact?: ContactFn }) => number;
  /** The curve behind the number: x in the stimulus unit, y in `unit`. */
  readonly curve?: (metrics: readonly Metric[], args: WidgetClaimArgs, ctx: { readonly contact?: ContactFn }) => readonly { readonly x: number; readonly y: number }[];
}

/** The stimulus argument both widgets drive: centre travel, mm (spring.forceAt `travelMm`). */
export const TRAVEL_ARG = "travelMm";

/** What a claim-reading widget resolves before it computes. */
export interface ClaimBinding {
  readonly claim: ClaimDecl;
  readonly def: WidgetClaimFn;
}

/**
 * The claim a widget reads: the one whose id is the widget id, else the
 * only claim calling the widget's fn. The function is the host's entry for
 * that id. A string says why there is none.
 */
export function claimBinding(decl: WidgetDecl, build: WidgetBuild): ClaimBinding | string {
  const claims = (build.claims ?? []).filter((c) => c.fn === decl.fn);
  const claim = claims.find((c) => c.id === decl.id) ?? (claims.length === 1 ? claims[0] : undefined);
  if (claim === undefined) {
    return claims.length === 0
      ? `no claim of this chase calls ${decl.fn}; declare one in chase claims`
      : `claims ${claims.map((c) => c.id).join(", ")} all call ${decl.fn}; give the widget the id of one`;
  }
  const def = build.claimFns?.[decl.fn];
  if (def === undefined) return `the bench carries no claim function ${decl.fn}; the page build hands the claim registry in`;
  if (def.unit !== claim.want.unit) return `${decl.fn} returns ${def.unit} and claim ${claim.id} wants ${claim.want.unit}`;
  return { claim, def };
}

/** The drive target a claim reads: the target whose metric prefix is the claim's `at`, else the only target. */
export function claimTarget(drive: DriveDecl, metrics: readonly Metric[], claim: ClaimDecl): string | null {
  const ids = targetIds(drive, metrics) ?? [];
  const at = claim.args?.["at"];
  const group = drive.targets.slice("metrics.".length);
  if (typeof at === "string" && at !== "") return ids.find((t) => `${group}.${t}` === at) ?? null;
  return ids.length === 1 ? ids[0]! : null;
}

/** The claim function's number at a travel, or the refusal it throws as a line. */
export function claimAt(b: ClaimBinding, metrics: readonly Metric[], travelMm: number, contact: ContactFn | undefined): number | string {
  try {
    return b.def.fn(metrics, { ...(b.claim.args ?? {}), [TRAVEL_ARG]: travelMm }, contact === undefined ? {} : { contact });
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

/** The travel the press drives: the host's current stimulus, else the widget's travelMm input, else the claim's own. */
export function pressTravel(decl: WidgetDecl, build: WidgetBuild, claim: ClaimDecl | null): number {
  if (build.travelMm !== undefined && Number.isFinite(build.travelMm)) return build.travelMm;
  const own = decl.inputs[TRAVEL_ARG];
  if (typeof own === "number") return own;
  const at = claim?.args?.[TRAVEL_ARG];
  return typeof at === "number" ? at : 0;
}

export interface PressModel extends WidgetModel {
  /** The drive target pressed, or null with the reason in problem. */
  readonly target: string | null;
  /** The travel the key returns to when released and the most it presses, mm. */
  readonly stopMm: number;
  /** The claim the force reads, or null. */
  readonly claim: ClaimDecl | null;
}

/** Gesture drive.press draws: a hold on a key. */
export const PRESS_GESTURE: DriveDecl["gesture"] = "hold";

function refusal(decl: WidgetDecl, problem: string, claim: ClaimDecl | null = null): PressModel {
  return { id: decl.id, kind: decl.kind, outputs: {}, problem, target: null, stopMm: 0, claim };
}

export const drivePress: WidgetEntry<PressModel> = {
  model(decl, build) {
    const b = claimBinding(decl, build);
    if (typeof b === "string") return refusal(decl, b);
    const drive = build.drive;
    if (drive === undefined) return refusal(decl, "this bench declares no drive pad; drive.press presses its keys", b.claim);
    if (drive.gesture !== PRESS_GESTURE) return refusal(decl, `drive gesture ${drive.gesture} is not hold; declare a drive.tilt widget for it`, b.claim);
    const contact = build.contacts[drive.contact];
    if (contact === undefined) return refusal(decl, `the bench carries no contact function ${drive.contact}; the key cannot close`, b.claim);
    const target = claimTarget(drive, build.metrics, b.claim);
    if (target === null) return refusal(decl, `no drive target under ${drive.targets} matches claim ${b.claim.id}. build the design first.`, b.claim);
    const stopMm = contact(build.metrics, target, true).pose?.travelMm ?? 0;
    const travel = pressTravel(decl, build, b.claim);
    const state = contact(build.metrics, target, travel);
    const force = claimAt(b, build.metrics, travel, contact);
    const outputs: Record<string, unknown> = {
      travel,
      forceN: typeof force === "number" ? force : null,
      contact: state.closed.length > 0,
    };
    return { id: decl.id, kind: decl.kind, outputs, problem: typeof force === "string" ? force : null, target, stopMm, claim: b.claim };
  },
  liveness: liveOutputs,
};

/** The press readout: travel, force with its qualifier, and the contact; the problem when there is one. */
export function pressLine(m: PressModel): string {
  if (m.problem !== null && m.outputs["forceN"] == null) return m.problem;
  const o = m.outputs;
  const force = typeof o["forceN"] === "number" ? `force ${fmt(o["forceN"])} N computed` : "force unknown";
  return `travel ${fmt(o["travel"] as number)} mm, ${force}, ${o["contact"] === true ? "closed" : "open"}`;
}
