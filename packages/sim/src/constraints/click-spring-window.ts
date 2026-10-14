// sim/click-spring-window (M01-T07, D-071, D-073, CHECKS.md 7.4): the rise
// window of the PIP click spring over Q, rise over beam thickness, as an
// FE-backed interval. Each grid Q runs clickRigid and clickReadout (the
// SNAPFE port of src/fe) with the declared l, t, w, E and sw; four
// criteria give four bounds, each with its reason:
//   floor snap        first grid Q that snaps with a drop above 0
//   floor drop        first grid Q whose drop is at least click.dropMin
//   ceiling strain    last grid Q before the strain at the stop first passes
//                     the material's click strain limit for the declared
//                     bend direction, searched up from the drop floor
//   ceiling bistable  last grid Q before the element first latches
// The window is the contiguous run from the effective floor to the effective
// ceiling. Snap and drop are the only criteria that can fail inside the
// run, because the strain ceiling is searched up from the drop floor and the
// bistable ceiling stops before the first bistable point. A point that fails
// snap or drop splits the run (D-229), and the def returns a split floor
// above a split ceiling, which the solver reports as E_UNSAT.
//
// A reason prints only facts, numbers read from profile and this def's own
// bound values, so every printed number traces (M01-T05 message numbers).
// The FE readouts at each bound are evidence for tests and goldens, never
// typed into a reason.

import {
  canonicalize, commandError, qualify, sha256Hex,
  type BendDirection, type Bound, type ConstraintCtx, type ConstraintDef, type ConstraintDim, type Qualification, type Tier,
} from "@hackbuild/spec";
import { CLICK_FE, CLICK_RULE_IDS, clickReadout, clickRigid, clickRules, type ClickReadout, type ClickRules, type ClickSpring } from "../fe/click.js";

export const CLICK_SPRING_WINDOW_ID = "sim/click-spring-window";

/** The dim this def bounds: the rise ratio Q of a click spring. */
export const SPRING_Q: ConstraintDim = "spring.Q";

/** Unit of spring.Q: a multiple of the beam thickness t. */
export const SPRING_Q_UNIT = "x t";

/**
 * The search grid over Q (M01-T07 step 1): Q = k / perStep for k from lo
 * to hi, so Q 1.00 to 2.60 in steps of 0.01, each value exact at two
 * decimals. A discretization of the search, not a physical row.
 */
export const Q_GRID = { lo: 100, hi: 260, perStep: 100 } as const;

/** Grid step of spring.Q, x t. */
export const Q_STEP = 1 / Q_GRID.perStep;

/** Grid index i (0 at Q_GRID.lo) as Q; -1 is one step under the grid, the grid length one step over it. */
export const qAt = (i: number): number => (Q_GRID.lo + i) / Q_GRID.perStep;

/** One FE readout of the spring at a grid Q. */
export type ClickRun = (p: ClickSpring, rules: ClickRules) => ClickReadout;

/** The FE run the def uses: SNAPFE_RIGID and the clickerDims readout. */
export const feRun: ClickRun = (p, rules) => clickReadout(clickRigid(p, rules), rules);

/** One grid point of the sweep. */
export interface SweepPoint {
  readonly Q: number;
  readonly r: ClickReadout;
}

/** Criteria limits the window reads from profile. */
export interface WindowLimits {
  /** click.dropMin, ratio. */
  readonly dropMin: number;
  /** Click strain limit for the bend direction, percent. */
  readonly strainPct: number;
}

/** Grid indexes each criterion gives; -1 and the grid length stand for under and over the grid. */
export interface WindowIndexes {
  readonly snap: number;
  readonly drop: number;
  readonly strain: number;
  readonly bistable: number;
  /** First grid index inside the floor to ceiling run that fails a criterion, or null. */
  readonly split: number | null;
}

const snaps = (r: ClickReadout): boolean => r.snaps && r.drop > 0;

/** Every criterion over a sweep, as grid indexes (M01-T07 steps 2 and 3). */
export function windowIndexes(pts: readonly SweepPoint[], lim: WindowLimits): WindowIndexes {
  const n = pts.length;
  const first = (from: number, ok: (r: ClickReadout) => boolean): number => {
    for (let i = Math.max(0, from); i < n; i++) if (ok(pts[i]!.r)) return i;
    return n;
  };
  const snap = first(0, snaps);
  const drop = first(0, (r) => r.drop >= lim.dropMin);
  const strain = first(drop < n ? drop : 0, (r) => r.eStopPct > lim.strainPct) - 1;
  const bistable = first(0, (r) => r.bistable) - 1;
  const lo = Math.max(snap, drop);
  const hi = Math.min(strain, bistable);
  let split: number | null = null;
  for (let i = lo; i <= hi && split === null; i++) {
    const r = pts[i]!.r;
    if (!snaps(r) || r.drop < lim.dropMin) split = i;
  }
  return { snap, drop, strain, bistable, split };
}

/** Declared spring facts with the tier of each profile row the numbers came from. */
interface Declared {
  readonly spring: Omit<ClickSpring, "Q">;
  readonly bend: BendDirection;
  /** Tier of the material row E came from, or null when E is a declared fact. */
  readonly eTier: Tier | null;
}

const BENDS: readonly BendDirection[] = ["inPlane", "acrossLayers"];

const BEND_WORDS: Readonly<Record<BendDirection, string>> = { inPlane: "bent in the layer plane", acrossLayers: "bent across layers" };

const own = (facts: ConstraintCtx["facts"], k: string): unknown => (Object.hasOwn(facts, k) ? facts[k] : undefined);

/**
 * The declared facts, or null when a numeric fact is absent or not finite:
 * the def then returns a non-finite bound and the solver names the fact
 * (E_PARAM_MISSING, spec ConstraintDef.bounds).
 */
function declared(ctx: ConstraintCtx): Declared | null {
  const facts = ctx.facts;
  const num = (k: string): number | null => {
    const v = own(facts, k);
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };
  const l = num("l"), t = num("t"), w = num("w"), sw = num("sw");
  // E is a declared fact when given, else the material's modulus row.
  const eFact = own(facts, "E");
  const mat = eFact === undefined ? ctx.profile.material(ctx.material) : undefined;
  const E = eFact === undefined ? mat?.modulusMPa ?? null : num("E");
  const bendRaw = own(facts, "bend");
  if (l === null || t === null || w === null || sw === null || E === null) return null;
  for (const [k, v, min] of [["l", l, 0], ["t", t, 0], ["w", w, 0], ["E", E, 0]] as const) {
    if (!(v > min)) throw commandError({ code: "E_SCHEMA", path: `/facts/${k}`, got: String(v), expected: "a number above 0", hint: `fact ${k} must be above 0; pass a positive ${k}`, record: CLICK_SPRING_WINDOW_ID });
  }
  if (!(sw >= 0)) throw commandError({ code: "E_SCHEMA", path: "/facts/sw", got: String(sw), expected: "a number at least 0", hint: "fact sw is the shuttle width; pass 0 or more", record: CLICK_SPRING_WINDOW_ID });
  if (bendRaw === undefined) {
    throw commandError({ code: "E_PARAM_MISSING", path: "/facts/bend", got: null, expected: "inPlane or acrossLayers", hint: "the strain limit depends on the bend direction; pass bend=inPlane or bend=acrossLayers in facts", record: CLICK_SPRING_WINDOW_ID });
  }
  if (typeof bendRaw !== "string" || !BENDS.includes(bendRaw as BendDirection)) {
    throw commandError({ code: "E_SCHEMA", path: "/facts/bend", got: bendRaw, expected: "inPlane or acrossLayers", hint: "bend is inPlane or acrossLayers", record: CLICK_SPRING_WINDOW_ID });
  }
  return { spring: { l, t, w, E, sw }, bend: bendRaw as BendDirection, eTier: mat === undefined ? null : mat.provenance.tier };
}

/** Readouts cached per def by the RFC 8785 hash of the spring, the rules, the FE settings and the grid. */
const CACHE_MAX = 64;

/** A click-spring window def over the given FE run; tests pass a scripted run, the registry uses feRun. */
export function createClickSpringWindow(run: ClickRun = feRun): ConstraintDef {
  const cache = new Map<string, readonly SweepPoint[]>();

  function sweep(spring: Omit<ClickSpring, "Q">, rules: ClickRules): readonly SweepPoint[] {
    const key = sha256Hex(canonicalize({ spring, rules, fe: CLICK_FE, grid: Q_GRID }));
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const pts: SweepPoint[] = [];
    for (let i = 0; i <= Q_GRID.hi - Q_GRID.lo; i++) {
      const Q = qAt(i);
      const r = run({ ...spring, Q }, rules);
      if (!r.ok) {
        throw commandError({
          code: "E_KERNEL", path: "/facts", got: Q.toFixed(2), expected: "an FE curve that converges at every load step",
          hint: `snapfe did not converge at Q ${Q.toFixed(2)}; the window is not trusted. Check l, t, w, E and sw`, record: "viewer-sim",
        });
      }
      pts.push({ Q, r });
    }
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
    cache.set(key, pts);
    return pts;
  }

  return {
    id: CLICK_SPRING_WINDOW_ID,
    version: "1.0.0",
    dims: [SPRING_Q],
    kernels: ["sim", "profile"],
    units: { [SPRING_Q]: SPRING_Q_UNIT },
    steps: { [SPRING_Q]: Q_STEP },
    bounds(dim, ctx): readonly Bound[] {
      if (dim !== SPRING_Q) return [];
      const d = declared(ctx);
      if (d === null) return [{ value: Number.NaN, side: "lo", kernel: "sim", reason: "a spring fact is missing", ...qualify([]) }];
      const rules = clickRules(ctx.profile);
      const ruleTiers = Object.values(CLICK_RULE_IDS).map((id) => ctx.profile.constant(id).provenance.tier);
      const spanTier = ctx.profile.constant(CLICK_RULE_IDS.rigidSpanMin).provenance.tier;
      const dropRow = ctx.profile.constant("click.dropMin");
      const strainRow = ctx.profile.strain(ctx.material, "click", d.bend);
      const lim: WindowLimits = { dropMin: dropRow.value, strainPct: strainRow.pct };
      const ix = windowIndexes(sweep(d.spring, rules), lim);
      const n = Q_GRID.hi - Q_GRID.lo + 1;

      const e = d.eTier === null ? [] : [d.eTier];
      const qFe: Qualification = qualify([spanTier, ...e]);
      const qDrop: Qualification = qualify([spanTier, dropRow.provenance.tier, ...e]);
      const qStrain: Qualification = qualify([...ruleTiers, strainRow.provenance.tier, ...e]);
      const qAll: Qualification = qualify([...ruleTiers, dropRow.provenance.tier, strainRow.provenance.tier, ...e]);
      const s = d.spring;
      const fe = `snapfe at l ${s.l} t ${s.t} w ${s.w} E ${s.E} sw ${s.sw}`;
      const q = (i: number): string => qAt(i).toFixed(2);
      const dropMin = `click.dropMin ${lim.dropMin.toFixed(2)} (profile constant, ${dropRow.provenance.tier})`;
      const limit = `${lim.strainPct.toFixed(2)} percent, ${ctx.material} click ${BEND_WORDS[d.bend]} (profile, ${strainRow.provenance.tier})`;

      const out: Bound[] = [
        {
          value: qAt(ix.snap), side: "lo", kernel: "sim", ...qFe,
          reason: ix.snap < n ? `snaps: force drops past the peak from ${q(ix.snap)}; ${fe}` : `no Q on the search grid snaps; ${fe}`,
        },
        {
          value: qAt(ix.drop), side: "lo", kernel: "sim", ...qDrop, source: "CHK-KEY-04",
          reason: ix.drop < n ? `drop at least ${dropMin} from ${q(ix.drop)}` : `drop never reaches ${dropMin} on the search grid`,
        },
        {
          value: qAt(ix.strain), side: "hi", kernel: "profile", ...qStrain, source: "CHK-KEY-04",
          reason: ix.drop < n && ix.strain === ix.drop - 1
            ? `strain at the stop passes ${limit} at the drop floor ${q(ix.drop)}; the ceiling is one step under it`
            : ix.strain >= 0
              ? `strain at the stop at most ${limit}, searched up from the drop floor to ${q(ix.strain)}`
              : `strain at the stop passes ${limit} from the bottom of the search grid`,
        },
        {
          value: qAt(ix.bistable), side: "hi", kernel: "sim", ...qFe,
          reason: ix.bistable < n - 1 ? `not bistable: the beam springs back when released, up to ${q(ix.bistable)}` : "not bistable anywhere on the search grid",
        },
      ];
      if (ix.split !== null) {
        const i = ix.split;
        const why = `the run fails a criterion between ${q(i - 1)} and ${q(i + 1)}, so the legal set splits`;
        out.push(
          { value: qAt(i + 1), side: "lo", kernel: "sim", ...qAll, reason: `${why}; upper run from ${q(i + 1)}` },
          { value: qAt(i - 1), side: "hi", kernel: "sim", ...qAll, reason: `${why}; lower run to ${q(i - 1)}` },
        );
      }
      return out;
    },
  };
}

/** The registered def, on the SNAPFE port. */
export const clickSpringWindow: ConstraintDef = createClickSpringWindow();
