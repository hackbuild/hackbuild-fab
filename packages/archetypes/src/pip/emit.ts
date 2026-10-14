// Building an ApplyOut for one PIP button: bodies on local slots, conductor
// regions over z bands, pockets cut down from a face, and the readouts as
// metrics. Every ring is local (u, v) about the button centre and placed
// through the face frame here, so a button turns with face.u.

import {
  qualify,
  type ApplyOut, type BodyDraft, type BodyRole, type BuildWarning, type ConductorFeature, type Feature, type FitClassId,
  type MaterialSlot, type Metric, type PocketFeature, type ShapeDecl, type Tier, type Vec2,
} from "@hackbuild/spec";
import { EZ, circle, place, sep, type Frame, type PipStack } from "./common.js";

/** The local slots a PIP button may use, by material (PIP slots, layout.js lines 47 to 52). */
export const PIP_SLOTS: Readonly<Record<string, MaterialSlot>> = {
  petg: { slot: 1, material: "petg", role: "body", label: "body", preview: "#F4F1EA" },
  cpla: { slot: 2, material: "cpla", role: "conductor", label: "traces", preview: "#1A1A1A" },
  tpu95: { slot: 3, material: "tpu95", role: "flex", label: "keys", preview: "#FE0386" },
  ctpu: { slot: 4, material: "ctpu", role: "flex-conductor", label: "contacts", preview: "#6E6E6E" },
};

const up = (z: number) => ({ origin: [0, 0, z] as const, normal: [0, 0, 1] as const, u: [1, 0, 0] as const });

/** Collects one button's declarations; ids are local and the caller prefixes them. */
export class Emit {
  readonly bodies: BodyDraft[] = [];
  readonly features: Feature[] = [];
  readonly ports: string[] = [];
  readonly metrics: Metric[] = [];
  readonly warnings: BuildWarning[] = [];
  private readonly used = new Set<string>();

  constructor(readonly f: Frame, readonly stack: PipStack) {}

  /** A body on its local slot; the material decides the slot and the role. */
  body(id: string, material: keyof typeof PIP_SLOTS, base: ShapeDecl, role?: BodyRole): void {
    const s = PIP_SLOTS[material] as MaterialSlot;
    this.used.add(material);
    this.bodies.push({ id, role: role ?? s.role, slot: s.slot, material: s.material, base });
  }

  /** A prism of a local ring over z0 to z1, placed. */
  prism(ring: readonly Vec2[], z0: number, z1: number): ShapeDecl {
    return { route: "prism", outline: [place(this.f, ring)], z: [z0, z1] };
  }

  /** A revolve of an (r, z) profile about the button axis. */
  revolve(profile: readonly Vec2[], segments: number): ShapeDecl {
    return { route: "revolve", profile, axis: { origin: [this.f.x, this.f.y, 0], dir: [0, 0, 1] }, segments };
  }

  /** A conductor region: a local ring over z0 to z1 on its net, in cPLA. */
  conductor(id: string, net: string, ring: readonly Vec2[], z0: number, z1: number, width: number): void {
    this.used.add("cpla");
    const c: ConductorFeature = { kind: "conductor", id, material: "cpla", net, region: { path: place(this.f, ring), face: up(z0) }, width, t: z1 - z0 };
    this.features.push(c);
  }

  /**
   * A routed terminal (model.js lines 41 and 50): a post of radius
   * sep(r) from mid trace layer 1 up past the floor, and a disc sep(r) +
   * discPad on each trace layer for the route to land on.
   */
  terminal(tag: string, net: string, at: Vec2, r: number): void {
    const s = this.stack;
    const pr = sep(s, r);
    const disc = pr + s.discPad;
    this.conductor(`conductor.post${tag}`, net, circle(pr, at, 20), s.z.l1[0] + s.layer / 2, s.z.floor + EZ, 2 * pr);
    this.conductor(`conductor.disc1${tag}`, net, circle(disc, at, 24), s.z.l1[0], s.z.l1[1], 2 * disc);
    this.conductor(`conductor.disc2${tag}`, net, circle(disc, at, 24), s.z.l2[0], s.z.l2[1], 2 * disc);
  }

  /** A pocket cut from the host, down from a face at z by depth, flat floor. */
  pocket(id: string, ring: readonly Vec2[], z: number, depth: number, fit: FitClassId, drawnPerSide: number): void {
    const p: PocketFeature = { kind: "pocket", id, outline: place(this.f, ring), face: up(z), depth, floor: "flat", fit: { class: fit, drawnPerSide, basis: "perSide" } };
    this.features.push(p);
  }

  feature(f: Feature): void {
    this.features.push(f);
    if (f.kind === "port") this.ports.push(f.id);
  }

  metric(id: string, value: number | string, unit: string | undefined, note: string, tiers: readonly (Tier | null)[], gate: Metric["gate"] = "informational", group = "readouts"): void {
    this.metrics.push({ id, value, ...(unit === undefined ? {} : { unit }), ...qualify(tiers), note, gate, group });
  }

  out(): ApplyOut {
    const slots = Object.values(PIP_SLOTS).filter((s) => this.used.has(s.material));
    return { bodies: this.bodies, features: this.features, ports: this.ports, slots, metrics: this.metrics, warnings: this.warnings };
  }
}
