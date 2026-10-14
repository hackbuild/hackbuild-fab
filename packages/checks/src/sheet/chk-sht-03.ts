// CHK-SHT-03 kernel, version 2.0.0 (M07-T06 step 5): the emitted DXF
// reloads closed, in millimetres, with a version header, read by the
// reader in dxf-reader.ts. The rules are those of tools/py/audit_dxf.py
// (the port of COTTER audit_dxf.py, lineage cotter.audit-dxf/r5) less the
// ezdxf audit, which runs in Python only; a rule fails with the name both
// tools print and tools/corpus/dxf/MANIFEST.json lists:
//   acadver   $ACADVER is AC1024 in the file text
//   insunits  $INSUNITS is 4 (millimetres)
//   entities  every entity is LWPOLYLINE or CIRCLE
//   layers    every entity is on ENGRAVE, SCORE, CUT_INNER, CUT or LIGHT
//   closed    every polyline is flagged closed and repeats its first vertex
//   handles   every entity has a handle, unique, below $HANDSEED
//   extents   the drawing extents equal the SVG twin's content box within
//             0.6 mm; not run when no twin is at hand
// 2.0.0 is a major bump (CHECKS.md 2.3): the verdict flips on files the
// 1.0.0 wording passed; every shipped emitter in the M07 DXF inventory
// (packages/nest/records/dxf-inventory.json) fails at least one rule.

import type { Finding, ResultTarget } from "@hackbuild/spec";
import { extents, polylines, readDxf } from "./dxf-reader.js";
import { svgContentBox } from "./svg-box.js";

export const SHT03_RULES = ["acadver", "insunits", "entities", "layers", "closed", "handles", "extents"] as const;
export type Sht03Rule = (typeof SHT03_RULES)[number];

/** The five cut layers, typed here from M07-T06 step 1, never read from the writer's template. */
export const SHT03_LAYERS: readonly string[] = ["ENGRAVE", "SCORE", "CUT_INNER", "CUT", "LIGHT"];
const KINDS = new Set(["LWPOLYLINE", "CIRCLE"]);
/** Largest gap between the DXF extents and the twin's content box on any edge, mm (COTTER audit_dxf.py). */
export const TWIN_TOL_MM = 0.6;
/** Distance under which the last vertex repeats the first, mm. */
const SAME = 1e-9;

export interface Sht03Report {
  /** Failed rules in SHT03_RULES order, each with its detail. */
  readonly fails: readonly { readonly rule: Sht03Rule; readonly detail: string }[];
  /** Rules that could not run, with the reason. */
  readonly notRun: readonly { readonly rule: Sht03Rule; readonly reason: string }[];
  /** Entities read, count. */
  readonly entities: number;
}

const text = (b: Uint8Array | string): string => (typeof b === "string" ? b : new TextDecoder("utf-8").decode(b));

/** Every rule on one DXF file and, when given, its SVG twin. */
export function auditDxf(dxf: Uint8Array | string, twin?: string): Sht03Report {
  const f = readDxf(text(dxf));
  const fail = new Map<Sht03Rule, string>();
  const notRun: { rule: Sht03Rule; reason: string }[] = [];
  const ver = f.header.get("$ACADVER");
  if (ver !== "AC1024") fail.set("acadver", `$ACADVER ${ver ?? "absent"}, legal AC1024`);
  const units = f.header.get("$INSUNITS");
  if (units !== "4") fail.set("insunits", `$INSUNITS ${units ?? "absent"}, legal 4 (mm)`);
  const kinds = [...new Set(f.entities.map((e) => e.type))].filter((k) => !KINDS.has(k)).sort();
  if (kinds.length > 0) fail.set("entities", `entity types ${kinds.join(" ")}, legal LWPOLYLINE CIRCLE`);
  const layers = [...new Set(f.entities.map((e) => e.layer ?? "absent"))].filter((l) => !SHT03_LAYERS.includes(l)).sort();
  if (layers.length > 0) fail.set("layers", `layers ${layers.join(" ")}, legal ${[...SHT03_LAYERS].sort().join(" ")}`);
  const open = polylines(f).filter((p) => {
    const a = p.pts[0], b = p.pts[p.pts.length - 1];
    const repeated = p.pts.length > 1 && a !== undefined && b !== undefined && Math.abs(a[0] - b[0]) < SAME && Math.abs(a[1] - b[1]) < SAME;
    return !(p.closed && repeated);
  }).length;
  if (open > 0) fail.set("closed", `${open} polylines not flagged closed with the first vertex repeated`);
  const handles = f.entities.map((e) => e.handle);
  const seed = f.header.get("$HANDSEED");
  const missing = handles.filter((h) => h === null).length;
  if (missing > 0) fail.set("handles", `${missing} of ${handles.length} entities have no handle`);
  else if (seed === undefined) fail.set("handles", "no $HANDSEED");
  else {
    const vals = handles.map((h) => parseInt(h!, 16));
    const top = vals.reduce((m, v) => Math.max(m, v), -1);
    if (new Set(vals).size !== vals.length) fail.set("handles", `${vals.length - new Set(vals).size} repeated handles`);
    else if (top >= parseInt(seed, 16)) fail.set("handles", `handle ${top.toString(16).toUpperCase()} at or above $HANDSEED ${seed}`);
  }
  const box = extents(f);
  if (twin === undefined) notRun.push({ rule: "extents", reason: "no SVG twin at hand" });
  else if (box === null) fail.set("extents", "the drawing has no extents");
  else {
    const sb = svgContentBox(twin);
    if (sb === null) fail.set("extents", "the twin draws no path");
    else {
      const worst = Math.max(...box.map((v, i) => Math.abs(v - sb[i]!)));
      if (worst > TWIN_TOL_MM) {
        fail.set("extents", `extents ${box.map((v) => v.toFixed(3)).join(" ")} against twin ${sb.map((v) => v.toFixed(3)).join(" ")}, worst ${worst.toFixed(3)} mm, legal ${TWIN_TOL_MM}`);
      }
    }
  }
  return {
    fails: SHT03_RULES.filter((r) => fail.has(r)).map((rule) => ({ rule, detail: fail.get(rule)! })),
    notRun,
    entities: f.entities.length,
  };
}

/** The boolean finding of one sheet's file. */
export function sht03Finding(target: ResultTarget, name: string, r: Sht03Report): Finding {
  const ok = r.fails.length === 0;
  return {
    verdict: ok ? "pass" : "fail", target, measured: ok, legal: { kind: "boolean", must: true },
    constraint: ok
      ? `${name} reloads closed: AC1024, millimetres, LWPOLYLINE and CIRCLE on the five cut layers, every polyline closed with its first vertex repeated, handles under $HANDSEED${r.notRun.length === 0 ? ", extents equal to the svg twin within 0.6 mm" : ""}`
      : `${name} fails ${r.fails.map((f) => `${f.rule} (${f.detail})`).join("; ")}; write the sheet through the nest DXF writer`,
    extra: {
      file: name, entities: r.entities, failed: r.fails.map((f) => f.rule).join(" "),
      ...(r.notRun.length === 0 ? {} : { notRun: r.notRun.map((n) => `${n.rule}: ${n.reason}`).join("; ") }),
    },
  };
}
