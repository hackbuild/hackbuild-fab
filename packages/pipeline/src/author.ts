// The Author a build function receives (spec/build.ts Author). It runs
// next to build.ts, in core's build sandbox child over the profile
// snapshot the parent sends, or in a baked bench page (D-264); kernel
// stage contexts read machineView. Every value it returns is plain data,
// so the draft crosses IPC unchanged. Author.arch places from the
// archetype registry as loaded; registerSolvers (./solvers.ts) puts
// sim's click solver on it, called by core at load (core/src/canon.ts)
// and by createPageBuild in a page.

import { qualify, type Author, type BuildWarning, type Chase, type FitClassId, type MachineView, type Metric, type ParamField, type Ring, type Vec2 } from "@hackbuild/spec";
import { layerIndex, layerTop, snapLayer, type SkeletonLookup } from "@hackbuild/profile";
import { circleRing, rrect, rrectRing, snapRing } from "@hackbuild/geom";
import { commandError as cmdError, didYouMean } from "@hackbuild/spec";
import { archetypes, placeArchetype } from "@hackbuild/archetypes";
import { mechApply } from "./mech-apply.js";
import { resolveFace } from "./face-frame.js";

/**
 * Points per circle when build.ts names none, count. Fixed so the flex-pair
 * geometry and its goldens hold (D-175).
 */
export const AUTHOR_CIRCLE_SEGMENTS = 64;
/** Points per rounded-rectangle corner quarter, count; the ring reads the table at 4 * this. */
export const AUTHOR_CORNER_SEGMENTS = 8;

/** Author.ring.circle: geom's table circle, snapped (D-175). */
function circle(r: number, at: Vec2 = [0, 0], segments: number = AUTHOR_CIRCLE_SEGMENTS): Ring {
  return circleRing(r, at, segments);
}

/**
 * Author.ring.roundRect: w by h centred at `at`, corner r clamped into
 * [0, min(w, h) / 2], corners from the D-175 table, snapped to 1/1024 mm.
 */
function roundRect(w: number, h: number, r: number, at: Vec2 = [0, 0]): Ring {
  return snapRing(rrectRing(rrect(at[0], at[1], w / 2, h / 2, r), 4 * AUTHOR_CORNER_SEGMENTS));
}

export function machineView(profile: SkeletonLookup, id: string): MachineView {
  const p = profile.preset(id);
  return {
    id, layerHeight: p.layer, firstLayer: p.firstLayer, lineWidth: p.lineWidth,
    layer: (z) => snapLayer(p, z), layerTop: (i) => layerTop(p, i), layerIndex: (z) => layerIndex(p, z),
    line: (n) => n * p.lineWidth,
  };
}

function outsideSlice(name: string): () => never {
  return () => {
    throw cmdError({ code: "E_KERNEL", path: `/author/${name}`, hint: `k.${name} is not available in this kernel build`, record: "agent-capability" });
  };
}

/** A field k.derive may fill: a derived field by its fn, or an auto field by its auto.fn. */
interface DeriveTarget {
  /** Metric id stem, "derived.<field id>" (the StatusChip derived.<field>, P-09), list items add ".<list id>". */
  readonly stem: string;
  readonly unit?: string;
  /** True when the field sits in a list item, so one call per item is expected. */
  readonly perItem: boolean;
}

/** Every Author.derive id the chase declares (ParamField derived fn, AutoSpec fn), by id. */
export function deriveTargets(chase: Chase): ReadonlyMap<string, DeriveTarget> {
  const out = new Map<string, DeriveTarget>();
  const visit = (fields: readonly ParamField[], list: string | undefined): void => {
    for (const f of fields) {
      if (f.type === "list") {
        visit(f.item, f.id);
        continue;
      }
      const fn = f.type === "derived" ? f.fn : "auto" in f ? f.auto?.fn : undefined;
      if (fn === undefined || out.has(fn)) continue;
      const unit = f.type === "derived" || f.type === "number" ? f.unit : f.type === "mm" || f.type === "deg" ? f.type : undefined;
      out.set(fn, { stem: list === undefined ? `derived.${f.id}` : `derived.${list}.${f.id}`, perItem: list !== undefined, ...(unit === undefined ? {} : { unit }) });
    }
  };
  for (const g of chase.params) visit(g.fields, undefined);
  return out;
}

/**
 * Author for one build. Author.warn records go to `warnings`; Author.derive
 * values go to `derived` as informational metrics (D-049, D-075), which the
 * parent appends to Part.metrics so they hash and reach the HUD.
 */
export function makeAuthor(chase: Chase, profile: SkeletonLookup, warnings: BuildWarning[], derived: Metric[] = []): Author {
  const defaultMachine = chase.meta.machines?.[0] ?? "ffc5p";
  const targets = deriveTargets(chase);
  const calls = new Map<string, number>();
  const archCalls = new Map<string, number>();
  const mechCalls = new Map<string, number>();
  return {
    profile,
    machine: (id) => machineView(profile, id ?? defaultMachine),
    ring: { roundRect, circle, offset: outsideSlice("ring.offset") },
    body: (id, o) => ({
      id, role: o.role, slot: o.slot, base: o.base,
      material: o.material ?? chase.materials.find((m) => m.slot === o.slot)?.material ?? "",
    }),
    part: (o) => ({ ...o, frame: { originOnAxis: false, carriesOffset: false, pose: "print", ...o.frame } }) as ReturnType<Author["part"]>,
    // The profile fits table answers, so a dropped class names its replacement
    // and the row read enters profileHash.
    fit: (id) => profile.fit(id as FitClassId).class,
    derive: (id, value, note, drivenBy) => {
      const t = targets.get(id);
      if (t === undefined) {
        const ids = [...targets.keys()].sort();
        throw cmdError({ code: "E_SCHEMA", path: "/author/derive", got: id, expected: "the fn of a derived field or auto spec in chase.ts", didYouMean: didYouMean(id, ids), hint: "declare a derived field whose fn names this id, or call k.derive with a declared fn" });
      }
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw cmdError({ code: "E_SCHEMA", path: "/author/derive", got: String(value), expected: "a finite number", hint: `k.derive("${id}") needs a finite value` });
      }
      const n = calls.get(id) ?? 0;
      if (n > 0 && !t.perItem) {
        throw cmdError({ code: "E_SCHEMA", path: "/author/derive", got: id, expected: "one k.derive call per derived field", hint: `k.derive("${id}") was already called; a field outside a list has one value` });
      }
      calls.set(id, n + 1);
      derived.push({
        id: t.perItem ? `${t.stem}.${n}` : t.stem, value, ...(t.unit === undefined ? {} : { unit: t.unit }), ...qualify([]),
        note, ...(drivenBy === undefined ? {} : { drivenBy: [...drivenBy] }), gate: "informational",
      });
      return value;
    },
    bind: (f, map) => ({ ...f, drivenBy: map }) as typeof f,
    warn: (code, text, extra) => { warnings.push({ ...extra, code, text }); },
    face: (id, frame, extent) => ({ id, frame, ...(extent === undefined ? {} : { extent }) }),
    applied: (partId) => (chase.applied ?? []).filter((a) => a.part === partId),
    // Author.arch (D-165, M06-T08): the archetype's apply() on a face of
    // this build, ids prefixed `<id>.<call index>.`, slots mapped onto the
    // chase's materials; build.ts spreads the result into its PartDraft.
    arch: (id, face, params, draft) => {
      const key = archetypes.resolve(id).id;
      const index = archCalls.get(key) ?? 0;
      archCalls.set(key, index + 1);
      const host = draft ?? { id: "", name: "", process: "fdm", machine: defaultMachine, frame: { originOnAxis: false, carriesOffset: false, pose: "print" }, bodies: [], features: [] };
      const frame = resolveFace(face, host.faces ?? [], "/author/arch/face/ref");
      const out = placeArchetype(archetypes, { id, face: frame, params, draft: host, profile, index, materials: chase.materials });
      if (out.warnings !== undefined) warnings.push(...out.warnings);
      return out;
    },
    mech: (id, face, params, draft) => mechApply(id, face, params, draft, { chase, profile, warnings, machine: defaultMachine, calls: mechCalls }),
  };
}

