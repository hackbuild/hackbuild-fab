// Clip fields and edge rails (M05-T15). Rows stagger or fingers alternate
// depth so clip jaws nest, on a pitch the board sets (CHK-NET-21:
// gen_vernier.py lines 261 to 267, gen_quadrant.py lines 253 to 262 and
// the same in SPLINE to STAVE); the fan reaching them is crossing free,
// either parked on the arrival coordinate or monotone in arrival order on
// lanes the ranker placed, and routing channels keep their sub-lanes a
// trace and a clearance apart (CHK-NET-22: gen_vernier.py lines 259 to
// 260, gen_quadrant.py lines 263 to 264, gen_tessera.py lines 296 to 299
// and 346, gen_fret.py lines 341 to 349); the board has as many channels
// as its controller budget (gen_vernier.py line 268).

import type { FieldDecl, GateStep } from "@hackbuild/copper";
import { commandError } from "@hackbuild/spec";
import { boolGate, f, fill, intervalGate, k, sheetTarget, type Gate, type GateCtx } from "./gate.js";

type Step<K extends GateStep["kind"]> = Extract<GateStep, { kind: K }>;

function field(ctx: GateCtx, id: string): FieldDecl {
  const fd = ctx.board.draft.fields?.find((x) => x.id === id);
  if (fd === undefined) throw commandError({ code: "E_SCHEMA", path: "/fields", got: id, expected: "a declared clip field", record: "kernels/copper-routing", hint: "declare the field in the draft before a gate reads it" });
  return fd;
}

/** A rail's declared pitch and origin; a gate that reads them refuses a field without. */
function rail(fd: FieldDecl): { pitch: number; origin: number } {
  if (fd.pitch === undefined || fd.origin === undefined) {
    throw commandError({ code: "E_SCHEMA", path: `/fields/${fd.id}`, got: fd.id, expected: "a rail with a declared pitch and origin", record: "kernels/copper-routing", hint: "this gate reads the rail's pitch and first finger" });
  }
  return { pitch: fd.pitch, origin: fd.origin };
}

const along = (fd: FieldDecl) => [...fd.fingers].sort((a, b) => a.at - b.at);

export function fieldPitch(ctx: GateCtx, s: Step<"fieldPitch">): Gate[] {
  const fd = field(ctx, s.field);
  const ts = along(fd);
  const least = Math.min(...ts.slice(1).map((t, i) => t.at - ts[i]!.at));
  return [intervalGate("CHK-NET-21", least >= s.min, fill(s.msg, { least, ...(fd.pitch === undefined ? {} : { pitch: fd.pitch }) }), sheetTarget(ctx, s.field), least, s.min, null, "mm",
    `adjacent fingers of the ${s.field} field at least ${s.min} mm apart, set by the board's clip rule`)];
}

export function fieldJaws(ctx: GateCtx, s: Step<"fieldJaws">): Gate[] {
  const fd = field(ctx, s.field);
  const ts = along(fd);
  const jaws = Math.min(...ts.slice(2).map((t, i) => t.at - ts[i]!.at)) - fd.size;
  return [intervalGate("CHK-NET-21", jaws >= s.min, fill(s.msg, { jaws }), sheetTarget(ctx, s.field), jaws, s.min, null, "mm",
    `clip jaws on one row of the ${s.field} field at least ${s.min} mm apart`)];
}

export function fingerGap(ctx: GateCtx, s: Step<"fingerGap">): Gate[] {
  const fd = field(ctx, s.field);
  const gap = rail(fd).pitch - fd.size;
  return [intervalGate("CHK-NET-21", gap >= s.min, fill(s.msg, { gap }), sheetTarget(ctx, s.field), gap, s.min, null, "mm",
    `pitch less finger width at least ${s.min} mm, so a clip fits between fingers`)];
}

export function depthStep(ctx: GateCtx, s: Step<"depthStep">): Gate[] {
  const fd = field(ctx, s.field);
  const step = Math.abs((fd.deep ?? 0) - (fd.shallow ?? 0));
  return [intervalGate("CHK-NET-21", step >= s.min, fill(s.msg, { step }), sheetTarget(ctx, s.field), step, s.min, null, "mm",
    `deep and shallow fingers differ by at least ${s.min} mm so adjacent clip bodies nest`)];
}

export function depthAlternates(ctx: GateCtx, s: Step<"depthAlternates">): Gate[] {
  const fd = field(ctx, s.field);
  const ts = along(fd);
  const ok = ts.every((t, i) => i === 0 || t.deep !== ts[i - 1]!.deep);
  return [boolGate("CHK-NET-21", ok, fill(s.msg, { deep: fd.deep ?? Number.NaN, shallow: fd.shallow ?? Number.NaN }), sheetTarget(ctx, s.field),
    "finger depth alternates every finger along the rail")];
}

export function railOrder(ctx: GateCtx, s: Step<"railOrder">): Gate[] {
  const fd = field(ctx, s.field);
  const tol = k(ctx, "vinyl.coordTol");
  const { pitch, origin } = rail(fd);
  const order = [...fd.fingers].sort((a, b) => a.arrive - b.arrive);
  const ok = order.every((t, i) => Math.abs(t.at - origin - i * pitch) < tol);
  return [boolGate("CHK-NET-22", ok, s.msg, sheetTarget(ctx, s.field), "fingers in arrival order on the rail pitch: a monotone fan, so no escape crosses another")];
}

export function parked(ctx: GateCtx, s: Step<"parked">): Gate[] {
  const fd = field(ctx, s.field);
  const tol = k(ctx, "vinyl.coordTol");
  const ok = fd.fingers.every((t) => Math.abs(t.at - t.arrive) < tol);
  return [boolGate("CHK-NET-22", ok, s.msg, sheetTarget(ctx, s.field), "every terminal sits on the coordinate its trace arrives on, so the field has no fan")];
}

export function lanes(ctx: GateCtx, s: Step<"lanes">): Gate[] {
  const fan = ctx.board.lanes;
  if (fan === undefined) throw commandError({ code: "E_SCHEMA", path: "/fan", got: null, expected: "a declared fan", record: "kernels/copper-routing", hint: "a lanes gate reads the fan the lane ranker placed" });
  const n = s.style === "fits" ? fan.used : fan.need;
  return [intervalGate("CHK-NET-22", n <= fan.have, fill(s.msg, { used: fan.used, nets: fan.nets, need: fan.need, have: fan.have }), sheetTarget(ctx, "copper"),
    n, 0, fan.have, "lanes", `the lane graph ranks into the ${fan.have} lanes the board has`)];
}

export function subLanes(ctx: GateCtx, s: Step<"subLanes">): Gate[] {
  const tol = k(ctx, "vinyl.spacingTol");
  const at = [...s.at].sort((a, b) => a - b);
  const least = Math.min(...at.slice(1).map((x, i) => x - at[i]!)) * s.scale;
  const gap = (at[1]! - at[0]!) * s.scale;
  return [intervalGate("CHK-NET-22", least >= s.min - tol, fill(s.msg, { gap, n: at.length }), sheetTarget(ctx, "copper"), least, s.min, null, "mm",
    `sub-lanes of one channel at least trace width plus clearance apart, ${f(s.min, 2)} mm`)];
}

export function laneBudget(ctx: GateCtx, s: Step<"laneBudget">): Gate[] {
  const most = Math.max(...s.counts);
  return [intervalGate("CHK-NET-22", s.counts.every((c) => c <= s.max), s.msg, sheetTarget(ctx, "copper"), most, 0, s.max, "traces",
    `no routing channel carries more than ${s.max} traces`)];
}

export function channels(ctx: GateCtx, s: Step<"channels">): Gate[] {
  const terms = (ctx.board.draft.fields ?? []).reduce((n, fd) => n + fd.fingers.length, 0);
  const nets = ctx.board.draft.nets.length;
  const ok = terms === s.want && (!s.nets || nets === s.want);
  return [boolGate("CHK-NET-43", ok, s.msg, sheetTarget(ctx, "copper"), `${s.want} channels, the controller budget the board is drawn for`, { terminals: terms, nets })];
}
