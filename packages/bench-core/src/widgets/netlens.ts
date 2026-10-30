// view.netlens (plan v9 section 3.2: net highlighting): light one net of
// the Part IR and ghost the rest. A body's net is the net of the feature
// that shares its id, the rule the viewer's xray reads (PIP part3.js
// VIEW.update, lines 210 to 233, viewer/scene.ts); bodyNets is that rule's
// one copy, and the viewer draws a lens from the net this model names.

import type { WidgetDecl } from "@hackbuild/spec";
import { bodyNets } from "@hackbuild/viewer";
import { liveOutputs } from "./live.js";
import type { WidgetEntry, WidgetModel } from "./registry.js";

export interface NetlensModel extends WidgetModel {
  /** Every net with a body, sorted, for the picker; empty when the part draws none. */
  readonly nets: readonly string[];
}

export const viewNetlens: WidgetEntry<NetlensModel> = {
  model(decl: WidgetDecl, build) {
    const byBody = bodyNets(build.bodies ?? [], build.features);
    const nets = [...new Set(byBody.values())].sort();
    const refuse = (problem: string): NetlensModel => ({ id: decl.id, kind: decl.kind, outputs: {}, problem, nets });
    if (nets.length === 0) return refuse("no body of this part carries a net. build the design first.");
    const net = build.lenses?.[decl.id] ?? nets[0]!;
    if (!nets.includes(net)) return refuse(`net ${net} has no body in this part; nets: ${nets.join(", ")}`);
    const bodies = [...byBody].filter(([, n]) => n === net).map(([id]) => id).sort();
    const ghosted = (build.bodies ?? []).length - bodies.length;
    return { id: decl.id, kind: decl.kind, outputs: { net, nets, bodies, ghosted }, problem: null, nets };
  },
  liveness: liveOutputs,
};

/** The lens readout line. */
export function netlensLine(m: NetlensModel): string {
  if (m.problem !== null) return m.problem;
  const bodies = m.outputs["bodies"] as readonly string[];
  return `net ${String(m.outputs["net"])} lights ${bodies.length} bodies: ${bodies.join(", ")}`;
}
