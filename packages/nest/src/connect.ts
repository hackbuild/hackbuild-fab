// Connectivity refusal inside nest (M07-T04), ported from OGEE16 cutfiles.py
// check_connected() (designs/ogee16/legacy/source/cutfiles.py lines 109 to
// 121; lineage ogee16.cutfiles/r16p): a part that falls into two pieces is
// a part that does not exist. The original printed a line per severed part
// and stopped main(); here every part gets a finding, and packSheets
// refuses the nest before it places anything when one fails.
//
// Three kernels, one finding each, in the legal kinds their seed rows
// declare (packages/checks/seed/checks.seed.json), so the CHK-SHT run
// bodies can hand these findings to the registry unchanged once a sheet
// target exists:
//   CHK-SHT-01  the compensated profile is one piece (boolean)
//   CHK-SHT-02  every declared hole is a hole ring of it (interval, count)
//   CHK-SHT-07  a hub hole leaves a web of the stock's minimum feature on
//               both sides (boolean)
// nest may not import checks (tools/tiers.json), so severity and origin are
// stamped where the registry runs; the finding names its check id.

import {
  commandError, type CheckId, type Finding, type KerfMode, type NestItem, type NestRequest, type NestResult, type NextCall,
  type ProfileLookup, type Ring, type Vec2,
} from "@hackbuild/spec";
import type { Geom, Section } from "@hackbuild/geom";
import { compensate, partProfile } from "./profile.js";
import { nest, validate } from "./sheet-loop.js";

/** A finding and the check it belongs to. */
export interface SheetFinding {
  readonly check: ("CHK-SHT-01" | "CHK-SHT-02" | "CHK-SHT-07") & CheckId;
  readonly finding: Finding;
}

/** One part after compensation. */
export interface ConnectedPart {
  readonly id: string;
  /** The region the cutter frees, kerf applied, mm. */
  readonly section: Section;
  /** Separate pieces of the region, count. */
  readonly pieces: number;
  /** Hole rings of the region, count. */
  readonly holeRings: number;
}

export interface Connectivity {
  readonly parts: readonly ConnectedPart[];
  readonly findings: readonly SheetFinding[];
  /** True when any finding failed; nothing may be placed or emitted. */
  readonly refused: boolean;
}

/** The pointer a null kerf names (spec/errors.ts, E_PARAM_MISSING). */
export const kerfPointer = (machine: string): string => `hbf://profile/machine/${machine}#/kerf`;

/**
 * The beam width a kerf mode applies, mm: the machine row's kerf in mode
 * outline, 0 in mode none. A machine whose kerf is null (D-101: no coupon
 * yet) cannot cut in mode outline, so the call raises E_PARAM_MISSING
 * naming the row; kerfNext gives the two calls that resolve it.
 */
export function beamOf(profile: ProfileLookup, machine: string, mode: KerfMode): number {
  if (mode === "none") return 0;
  if (mode !== "outline") {
    throw commandError({ code: "E_SCHEMA", path: "/kerfMode", got: mode, expected: "outline or none", hint: "set kerf mode outline or none" });
  }
  const width = profile.machine(machine).kerf;
  if (width === null || width === undefined) {
    throw commandError({
      code: "E_PARAM_MISSING", path: kerfPointer(machine), got: null, expected: "a kerf in mm from a cut coupon",
      hint: `machine ${machine} has no kerf; cut the kerf coupon and enter it, or cut with kerf mode none`,
      record: "knowledge:kernels/sheet-design#connectivity-the-check-that-refuses",
    });
  }
  return width;
}

/**
 * The next calls for a null kerf (spec/errors.ts): the same call at kerf
 * mode none, and the knowledge search for the coupon a person cuts.
 */
export function kerfNext(command: NextCall["command"], args: Readonly<Record<string, unknown>>): NextCall[] {
  return [
    { command, args: { ...args, kerfMode: "none" }, why: "cut at nominal; slots carry the design slop" },
    { command: "knowledge.search", args: { query: "kerf coupon" }, why: "a person cuts the coupon and enters kerf" },
  ];
}

const part = (id: string) => ({ level: "part" as const, part: id });

/** A length for a message, mm, to 4 decimals with trailing zeros dropped. */
const mm = (v: number): string => String(Number(v.toFixed(4)));

function inRing(ring: Ring, [x, y]: Vec2): boolean {
  let c = false;
  for (let i = 0, n = ring.length, j = n - 1; i < n; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** CHK-SHT-01: the region is one piece. */
export function chkSht01(id: string, pieces: number): SheetFinding {
  const ok = pieces === 1;
  return {
    check: "CHK-SHT-01",
    finding: {
      verdict: ok ? "pass" : "fail", target: part(id), measured: ok, legal: { kind: "boolean", must: true },
      constraint: ok
        ? "the cut profile is one connected piece"
        : `the cut profile falls into ${pieces} pieces, legal 1; a part in pieces does not exist, so nothing is nested`,
      extra: { pieces },
    },
  };
}

/**
 * CHK-SHT-02: each declared hole is a hole ring of the cut region. Measured
 * is the declared holes found, legal at least the declared count; a hole
 * that ran out through the outline or merged away is named in missing.
 */
export function chkSht02(id: string, section: Section, declared: NestItem["holes"]): SheetFinding {
  const want = declared ?? [];
  const holes = section.components().flatMap((c) => c.holes);
  const missing = want.filter((h) => !holes.some((r) => inRing(r, h.at))).map((h) => h.feature);
  const found = want.length - missing.length;
  const ok = missing.length === 0;
  return {
    check: "CHK-SHT-02",
    finding: {
      verdict: ok ? "pass" : "fail", target: part(id), measured: found,
      legal: { kind: "interval", lo: want.length, hi: null, unit: "count", nearest: ok ? found : want.length },
      constraint: ok
        ? `every declared hole is a ring of the cut profile, ${found} of ${want.length}`
        : `${found} of ${want.length} declared holes are rings of the cut profile; ${missing.join(", ")} escaped the boundary or merged`,
      extra: { holeRings: holes.length, ...(ok ? {} : { missing: missing.join(" ") }) },
    },
  };
}

/**
 * CHK-SHT-07, the hub rule (knowledge/kernels/sheet-design.md, connectivity
 * section: a hole at radius r spans r plus or minus d/2 and must clear the
 * bore; check arithmetically): legal when r - d/2 >= b + w and
 * r + d/2 <= R - w, w the stock's minimum feature from the profile.
 */
export function chkSht07(id: string, hub: NonNullable<NestItem["hubs"]>[number], web: number): SheetFinding[] {
  return hub.holes.map((h): SheetFinding => {
    const inner = h.r - h.d / 2 - hub.bore;
    const outer = hub.outer - (h.r + h.d / 2);
    const ok = inner >= web && outer >= web;
    return {
      check: "CHK-SHT-07",
      finding: {
        verdict: ok ? "pass" : "fail", target: { level: "feature", part: id, feature: h.feature }, measured: ok,
        legal: { kind: "boolean", must: true },
        constraint: `hole ${h.feature} d ${mm(h.d)} at r ${mm(h.r)} spans ${mm(h.r - h.d / 2)} to ${mm(h.r + h.d / 2)} mm, legal ${mm(hub.bore + web)} to ${mm(hub.outer - web)}: bore ${mm(hub.bore)} and rim ${mm(hub.outer)} less the ${mm(web)} mm minimum feature`,
        extra: { innerWebMm: inner, outerWebMm: outer, minFeatureMm: web, hub: hub.feature },
      },
    };
  });
}

/** The stock's minimum feature, mm: profile constant <stock>.minFeature (ply3 1.0, inferred). */
export function minFeatureOf(profile: ProfileLookup, stock: string): number {
  return profile.constant(`${stock}.minFeature`).value;
}

/**
 * Run the three kernels on every item: the profile from its rings, the
 * beam applied, pieces and holes counted, hubs checked. An item with qty 0
 * is still checked; a part that does not exist is refused whether or not a
 * copy is asked for.
 */
export function connect(geom: Geom, items: readonly NestItem[], beam: number, profile: ProfileLookup): Connectivity {
  const parts: ConnectedPart[] = [];
  const findings: SheetFinding[] = [];
  for (const it of items) {
    const section = compensate(partProfile(geom, it.rings).section, beam);
    const comps = section.components();
    const pieces = comps.length;
    parts.push({ id: it.id, section, pieces, holeRings: comps.reduce((n, c) => n + c.holes.length, 0) });
    findings.push(chkSht01(it.id, pieces), chkSht02(it.id, section, it.holes));
    const hubs = it.hubs ?? [];
    if (hubs.some((h) => h.holes.length > 0)) {
      const web = minFeatureOf(profile, it.stock);
      for (const hub of hubs) findings.push(...chkSht07(it.id, hub, web));
    }
  }
  return { parts, findings, refused: findings.some((f) => f.finding.verdict === "fail") };
}

export interface PackOptions {
  readonly profile: ProfileLookup;
  /** Machine profile id the kerf is read from. */
  readonly machine: string;
  readonly kerfMode: KerfMode;
}

export interface PackOutcome {
  readonly findings: readonly SheetFinding[];
  /** Beam applied, mm: the machine kerf in mode outline, 0 in mode none. */
  readonly beam: number;
  /** The layout of the compensated parts; null when a kernel refused. */
  readonly result: NestResult | null;
  /** The items the layout packed, rings compensated by the beam; the DXF writer draws these (dxf.ts drawSheets). */
  readonly items: readonly NestItem[];
}

/** Rings of a compensated region, outer then its holes per piece. */
const ringsOf = (s: Section): Ring[] => s.components().flatMap((c) => [c.outer, ...c.holes]);

/**
 * The checked nest: validate, read the beam (E_PARAM_MISSING on a null
 * kerf in mode outline), run the kernels, and pack only when none failed.
 * The packers see the compensated outlines, since those are what the beam
 * leaves on the sheet (cutfiles.py packs the buffered bounds). nest.pack
 * and the DXF exporter go through this entry (M07-T04 step 6).
 */
export function packSheets(geom: Geom, req: NestRequest, opts: PackOptions): PackOutcome {
  validate(req);
  const beam = beamOf(opts.profile, opts.machine, opts.kerfMode);
  const c = connect(geom, req.items, beam, opts.profile);
  if (c.refused) return { findings: c.findings, beam, result: null, items: req.items };
  const items = beam === 0 ? req.items : req.items.map((it, i) => ({ ...it, rings: ringsOf(c.parts[i]!.section) }));
  return { findings: c.findings, beam, result: nest({ ...req, items }, geom), items };
}
