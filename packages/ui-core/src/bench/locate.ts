// Locate a finding on the stage and write its fix (M09-T05, D-125). Every
// CheckResult carries a ResultTarget (spec/checks.ts); locate resolves it to
// the bodies and features of the Part IR the viewer draws, a box to frame and,
// where the target names a point or a horizontal plane, the height for the
// section. The bible 9 clause: clicking a row frames the target, sets the
// section at its z and outlines the feature; the legend badges the worst
// verdict per slot; a fix is one undoable commit.
//
// Resolution reads no feature kind. A feature resolves to the body that
// shares its id, plus every body that one of its own string fields names
// directly or through another feature (a contact names its two conductor
// halves and its actuator). Its host `body` counts only when nothing else
// resolves, so a trace on the pad frames the trace and a port frames the pad.

import type { CheckResult, Fix, LegalValues, Part, ResultTarget, SingleTarget, Vec3, Verdict } from "@hackbuild/spec";

/** The Part IR fields locate reads. */
export type LocatePart = Pick<Part, "id" | "bodies" | "features">;

export interface Located {
  /** Feature and body ids to outline; empty when the target is not on the stage. */
  readonly focus: readonly string[];
  /** Box to frame, min then max, mm; null when the target is not on the stage. */
  readonly bbox: readonly [Vec3, Vec3] | null;
  /** Section plane height, mm, when the target names a point or a horizontal plane. */
  readonly sectionZ?: number;
}

/** Row text for a finding whose target has no place on the stage. */
export const NOT_ON_STAGE = "not on the stage";

/** Worst first; a slot badge shows the first of these any of its findings carries. */
export const VERDICT_ORDER: readonly Verdict[] = ["fail", "warn", "pass", "skip"];

type Fields = Readonly<Record<string, unknown>>;

const HOST = "body";
const NOWHERE: Located = { focus: [], bbox: null };

function stringsOf(f: Fields, skip: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(f)) {
    if (skip.has(k)) continue;
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) for (const x of v) if (typeof x === "string") out.push(x);
  }
  return out;
}

const SKIP_OWN = new Set(["id", "kind", HOST]);

/** Body ids a feature resolves to, in Part.bodies order. */
export function bodiesOfFeature(part: LocatePart, featureId: string): string[] {
  const bodies = new Set(part.bodies.map((b) => b.id));
  const byId = new Map(part.features.map((f) => [f.id, f as unknown as Fields]));
  const f = byId.get(featureId);
  if (f === undefined) return bodies.has(featureId) ? [featureId] : [];
  const hit = new Set<string>();
  if (bodies.has(featureId)) hit.add(featureId);
  for (const s of stringsOf(f, SKIP_OWN)) if (bodies.has(s)) hit.add(s);
  // A string naming another feature that is not a body: that feature's own body, one level.
  for (const s of stringsOf(f, SKIP_OWN)) {
    const g = byId.get(s);
    if (g === undefined || s === featureId) continue;
    for (const t of stringsOf(g, SKIP_OWN)) if (bodies.has(t)) hit.add(t);
  }
  if (hit.size === 0) {
    const host = f[HOST];
    if (typeof host === "string" && bodies.has(host)) hit.add(host);
  }
  return part.bodies.map((b) => b.id).filter((id) => hit.has(id));
}

/** Feature ids that resolve to a body, the body's own feature first (the viewer's pick). */
export function featuresOfBody(part: LocatePart, bodyId: string): string[] {
  const own = part.features.filter((f) => f.id === bodyId).map((f) => f.id);
  const rest = part.features.filter((f) => f.id !== bodyId && bodiesOfFeature(part, f.id).includes(bodyId)).map((f) => f.id);
  return [...own, ...rest];
}

/** Height of a horizontal plane a feature declares in an own field or one level down, mm. */
function planeZ(f: Fields): number | undefined {
  const isPlane = (o: unknown): o is { origin: Vec3; normal: Vec3 } => {
    if (o === null || typeof o !== "object") return false;
    const p = o as { origin?: unknown; normal?: unknown };
    return Array.isArray(p.origin) && Array.isArray(p.normal) && p.normal[0] === 0 && p.normal[1] === 0 && Math.abs(Number(p.normal[2])) === 1;
  };
  for (const v of Object.values(f)) {
    if (isPlane(v)) return v.origin[2];
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      for (const w of Object.values(v as Fields)) if (isPlane(w)) return w.origin[2];
    }
  }
  return undefined;
}

function boxOf(part: LocatePart, ids: readonly string[], at: Vec3 | undefined): readonly [Vec3, Vec3] | null {
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  const grow = (p: readonly number[]): void => {
    for (let i = 0; i < 3; i++) {
      lo[i] = Math.min(lo[i] as number, p[i] as number);
      hi[i] = Math.max(hi[i] as number, p[i] as number);
    }
  };
  for (const b of part.bodies) {
    if (!ids.includes(b.id)) continue;
    grow(b.mesh.bbox[0]);
    grow(b.mesh.bbox[1]);
  }
  if (at !== undefined) grow(at);
  if (!Number.isFinite(lo[0])) return null;
  return [lo as unknown as Vec3, hi as unknown as Vec3];
}

function locateOne(t: SingleTarget, part: LocatePart): Located {
  const at = "at" in t ? t.at : undefined;
  if (!("part" in t) || t.part !== part.id) return NOWHERE;
  let focus: string[];
  let z = at?.[2];
  switch (t.level) {
    case "part":
      focus = part.bodies.map((b) => b.id);
      break;
    case "body":
      focus = part.bodies.some((b) => b.id === t.body) ? [t.body] : [];
      break;
    case "feature": {
      const bodies = bodiesOfFeature(part, t.feature);
      const known = part.features.some((f) => f.id === t.feature) || bodies.length > 0;
      focus = known ? [t.feature, ...bodies.filter((b) => b !== t.feature)] : [];
      const f = part.features.find((x) => x.id === t.feature);
      if (z === undefined && f !== undefined) z = planeZ(f as unknown as Fields);
      break;
    }
    case "net": {
      const ids = new Set(part.bodies.map((b) => b.id));
      focus = part.features.filter((f) => (f as unknown as Fields)["net"] === t.net && ids.has(f.id)).map((f) => f.id);
      break;
    }
    default:
      // assembly and sheet targets name no body of this part.
      focus = [];
  }
  if (focus.length === 0 && at === undefined) return NOWHERE;
  const bbox = boxOf(part, focus, at);
  if (bbox === null) return NOWHERE;
  return z === undefined ? { focus, bbox } : { focus, bbox, sectionZ: z };
}

/** Resolves a result's target on a built part. A target that does not resolve returns { focus: [] }. */
export function locate(result: { readonly target: ResultTarget }, part: LocatePart): Located {
  const t = result.target;
  if (t.level !== "pair") return locateOne(t, part);
  const a = locateOne(t.a, part);
  const b = locateOne(t.b, part);
  const focus = [...new Set([...a.focus, ...b.focus])];
  const boxes = [a.bbox, b.bbox].filter((x): x is readonly [Vec3, Vec3] => x !== null);
  if (boxes.length === 0 && t.at === undefined) return NOWHERE;
  const pts = boxes.flatMap((x) => [x[0], x[1]]);
  if (t.at !== undefined) pts.push(t.at);
  const lo = [0, 1, 2].map((i) => Math.min(...pts.map((p) => p[i] as number))) as unknown as Vec3;
  const hi = [0, 1, 2].map((i) => Math.max(...pts.map((p) => p[i] as number))) as unknown as Vec3;
  const z = t.at?.[2] ?? a.sectionZ ?? b.sectionZ;
  return z === undefined ? { focus, bbox: [lo, hi] } : { focus, bbox: [lo, hi], sectionZ: z };
}

export function worstVerdict(vs: Iterable<Verdict>): Verdict | null {
  let best: number | null = null;
  for (const v of vs) {
    const i = VERDICT_ORDER.indexOf(v);
    if (best === null || i < best) best = i;
  }
  return best === null ? null : (VERDICT_ORDER[best] as Verdict);
}

/** The worst verdict of the findings that locate on each slot's bodies, for the legend badge. */
export function slotVerdicts(results: readonly CheckResult[], part: LocatePart): Map<number, Verdict> {
  const slotOf = new Map(part.bodies.map((b) => [b.id, b.slot]));
  const per = new Map<number, Verdict[]>();
  for (const r of results) {
    const slots = new Set<number>();
    for (const id of locate(r, part).focus) {
      const s = slotOf.get(id);
      if (s !== undefined) slots.add(s);
    }
    for (const s of slots) per.set(s, [...(per.get(s) ?? []), r.verdict]);
  }
  const out = new Map<number, Verdict>();
  for (const [s, vs] of [...per.entries()].sort((x, y) => x[0] - y[0])) {
    const w = worstVerdict(vs);
    if (w !== null) out.set(s, w);
  }
  return out;
}

/** A number as the panels print it: at most four significant digits, no trailing zeros. */
export function fmt(n: number): string {
  return String(Number(n.toPrecision(4)));
}

function legalText(l: LegalValues): string | null {
  const u = "unit" in l && l.unit !== undefined ? ` ${l.unit}` : "";
  switch (l.kind) {
    case "interval":
      if (l.lo !== null && l.hi !== null) return `${fmt(l.lo)} to ${fmt(l.hi)}${u}`;
      if (l.lo !== null) return `${fmt(l.lo)}${u} or more`;
      if (l.hi !== null) return `up to ${fmt(l.hi)}${u}`;
      return null;
    case "set":
      return `one of ${l.values.map((v) => (typeof v === "number" ? fmt(v) : v)).join(", ")}${u}`;
    case "multipleOf":
      return `a multiple of ${fmt(l.base)}${u}${l.offset ? ` from ${fmt(l.offset)}` : ""}`;
    case "boolean":
      return l.must ? "yes" : "no";
    case "exactSet":
      return l.values.length === 0 ? "none" : l.values.join(", ");
    case "none":
      return null;
  }
}

function measuredText(r: CheckResult): string {
  const m = r.measured;
  const u = "unit" in r.legal && r.legal.unit !== undefined ? ` ${r.legal.unit}` : "";
  if (typeof m === "number") return `${fmt(m)}${u}`;
  if (typeof m === "boolean") return m ? "yes" : "no";
  if (Array.isArray(m)) return m.length === 0 ? "none" : m.join(", ");
  return String(m);
}

/** First line of the bible 2.5 shape: what, measured, legal, constraint. */
export function findingLine(r: CheckResult): string {
  const legal = legalText(r.legal);
  return `${r.id.toLowerCase()} ${measuredText(r)}${legal === null ? "" : `, legal ${legal}`}, set by ${r.constraint}`;
}

/** A JSON pointer into params as the dotted path BenchCore.get and set take. */
export function pointerPath(pointer: string): string {
  if (pointer === "" || !pointer.startsWith("/")) throw new Error(`fix param ${JSON.stringify(pointer)} is not a json pointer`);
  return pointer
    .slice(1)
    .split("/")
    .map((s) => {
      const k = s.replace(/~1/g, "/").replace(/~0/g, "~");
      if (k.includes(".")) throw new Error(`fix param ${pointer} has a key with a dot; the bench path cannot carry it`);
      return k;
    })
    .join(".");
}

function valueText(v: Fix["set"]): string {
  return typeof v === "number" ? fmt(v) : String(v);
}

/** Second line of the bible 2.5 shape: the verb names the param and the direction. */
export function fixLine(fix: Fix, current: unknown): string {
  const verb = typeof current === "number" && typeof fix.set === "number" ? (fix.set > current ? "raise" : fix.set < current ? "lower" : "set") : "set";
  return `${verb} ${pointerPath(fix.param)} to ${valueText(fix.set)}, legal ${fmt(fix.paramLegal[0])} to ${fmt(fix.paramLegal[1])}`;
}

/** The fix button label: `set <param> to <value>`. */
export function fixLabel(fix: Fix): string {
  return `set ${pointerPath(fix.param)} to ${valueText(fix.set)}`;
}

/** The slice of BenchCore a fix writes through. */
export interface FixTarget {
  set(path: string, value: unknown): void;
  commit(): void;
}

/** Writes fix.set at fix.param as one commit, so one undo restores the previous value. */
export function applyFix(core: FixTarget, fix: Fix): void {
  core.set(pointerPath(fix.param), fix.set);
  core.commit();
}
