// KiCad footprint and symbol readers for catalog rows (M08-T04 step 2).
// A module row parses its pads and pin names at load from the committed
// .kicad_mod and .kicad_sym beside it and asserts the count, the SPINDLE
// gen_board.py pattern (originals/spindle/files/gen_board.py lines 25 to
// 33). Both the v5 `(module ...)` and the v6+ `(footprint ...)` forms read
// here: kicadts 0.0.58 parseKicadMod throws on a v5 file ("model encountered
// unsupported child token at", measured 2026-10-09 on the KiCad v5 library
// R_0805_2012Metric.kicad_mod), so the reader is this small s-expression
// walk, the TypeScript twin of tools/py/board/kicad_fetch.py `pads`.
//
// Frames: KiCad writes footprints y down; the catalog part frame is +y up,
// top view (spec CatalogPad), so y is negated here and nowhere else.

import type { CatalogPad, PadShape, PinDef } from "@hackbuild/spec";
import { schemaError } from "@hackbuild/profile";
import type { FieldResolver } from "./load.js";

type Sx = string | readonly Sx[];

/** Tokens: quoted strings, parentheses, bare atoms. */
export function parseSexpr(text: string): readonly Sx[] {
  const toks = text.match(/"(?:[^"\\]|\\.)*"|\(|\)|[^\s()]+/g) ?? [];
  let i = 0;
  const read = (): Sx[] => {
    const out: Sx[] = [];
    while (i < toks.length) {
      const t = toks[i++]!;
      if (t === "(") out.push(read());
      else if (t === ")") return out;
      else out.push(t.startsWith("\"") ? t.slice(1, -1).replace(/\\(.)/g, "$1") : t);
    }
    return out;
  };
  return read();
}

const isList = (x: Sx | undefined): x is readonly Sx[] => Array.isArray(x);
const child = (node: readonly Sx[], head: string): readonly Sx[] | undefined => node.find((c): c is readonly Sx[] => isList(c) && c[0] === head);
const children = (node: readonly Sx[], head: string): readonly (readonly Sx[])[] => node.filter((c): c is readonly Sx[] => isList(c) && c[0] === head);
const num = (x: Sx | undefined, where: string): number => {
  const v = typeof x === "string" ? Number(x) : NaN;
  if (!Number.isFinite(v)) throw schemaError(where, `expected a number, got ${String(x)}`);
  return v;
};

const SHAPES: Readonly<Record<string, PadShape>> = { rect: "rect", circle: "circle", oval: "oval", roundrect: "roundrect" };

/** One pad as KiCad writes it, before names are joined. */
export interface ModPad {
  readonly pad: string;
  readonly type: string;
  readonly shape: PadShape;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly drill?: number;
  readonly holeDx?: number;
}

/**
 * A custom pad reads as its anchor (circle or rect) at the anchor size, and
 * only when every primitive lies inside the anchor's size box, so the copper
 * the catalog drops is bounded by that box. The KiCad Pico footprint marks
 * its GND pads this way: a 1.6 mm circle anchor with a half square inside
 * the same 1.6 mm box (Module.pretty/RaspberryPi_Pico_Common_THT pad 3).
 */
function customShape(p: readonly Sx[], w: number, h: number, at: string): PadShape {
  const anchor = child(child(p, "options") ?? [], "anchor")?.[1];
  const shape = anchor === "circle" ? "circle" : anchor === "rect" ? "rect" : undefined;
  if (shape === undefined) throw schemaError(at, `custom pad anchor ${String(anchor)} has no catalog form`);
  const pts: [number, number][] = [];
  for (const g of (child(p, "primitives") ?? []).filter(isList)) {
    if (g[0] === "gr_poly") for (const xy of children(child(g, "pts") ?? [], "xy")) pts.push([num(xy[1], at), num(xy[2], at)]);
    else if (g[0] === "gr_rect") for (const k of ["start", "end"]) { const c = child(g, k); pts.push([num(c?.[1], at), num(c?.[2], at)]); }
    else if (g[0] === "gr_circle") {
      const c = child(g, "center");
      const e = child(g, "end");
      const cx = num(c?.[1], at);
      const cy = num(c?.[2], at);
      const r = Math.hypot(num(e?.[1], at) - cx, num(e?.[2], at) - cy);
      pts.push([cx - r, cy - r], [cx + r, cy + r]);
    } else throw schemaError(at, `custom pad primitive ${String(g[0])} has no catalog form`);
  }
  const out = pts.find(([x, y]) => Math.abs(x) > w / 2 + 1e-9 || Math.abs(y) > h / 2 + 1e-9);
  if (out !== undefined) throw schemaError(at, `custom pad primitive reaches (${out[0]}, ${out[1]}) mm, outside the ${w} x ${h} mm anchor box`);
  return shape;
}

/** Pads of a .kicad_mod, part frame (+y up), in file order. `where` names the file in errors. */
export function kicadModPads(text: string, where: string): readonly ModPad[] {
  const root = parseSexpr(text)[0];
  if (!isList(root) || (root[0] !== "module" && root[0] !== "footprint")) throw schemaError(where, "not a KiCad footprint: the first form is neither module nor footprint");
  return children(root, "pad").map((p, i): ModPad => {
    const at = `${where} pad ${i}`;
    const a = child(p, "at");
    const s = child(p, "size");
    if (a === undefined || s === undefined) throw schemaError(at, "pad has no at or size");
    const shape = p[3] === "custom" ? customShape(p, num(s[1], at), num(s[2], at), at) : SHAPES[String(p[3])];
    if (shape === undefined) throw schemaError(at, `pad shape ${String(p[3])} has no catalog form`);
    const rot = a[3] === undefined ? 0 : num(a[3], at);
    if (rot % 90 !== 0) throw schemaError(at, `pad rotation ${rot} deg is not a multiple of 90`);
    const turned = Math.abs(rot % 180) === 90;
    const [w, h] = turned ? [num(s[2], at), num(s[1], at)] : [num(s[1], at), num(s[2], at)];
    const d = child(p, "drill");
    let drill: number | undefined;
    let holeDx: number | undefined;
    if (d !== undefined) {
      if (d[1] === "oval") throw schemaError(at, "oval drills have no catalog form");
      drill = num(d[1], at);
      const off = child(d, "offset");
      if (off !== undefined) {
        if (num(off[2], at) !== 0) throw schemaError(at, "a drill offset off the pad x axis has no catalog form");
        holeDx = num(off[1], at);
      }
    }
    return {
      pad: String(p[1]), type: String(p[2]), shape, x: num(a[1], at), y: -num(a[2], at), w, h,
      ...(drill === undefined ? {} : { drill }), ...(holeDx === undefined ? {} : { holeDx }),
    };
  });
}

/** Pin number to name and electrical type from a .kicad_sym, first symbol, every unit. */
export function kicadSymPins(text: string, where: string): ReadonlyMap<string, { readonly name: string; readonly type: string }> {
  const root = parseSexpr(text)[0];
  if (!isList(root) || root[0] !== "kicad_symbol_lib") throw schemaError(where, "not a KiCad symbol library");
  const sym = child(root, "symbol");
  if (sym === undefined) throw schemaError(where, "library holds no symbol");
  const out = new Map<string, { name: string; type: string }>();
  const walk = (n: readonly Sx[]): void => {
    for (const c of n) {
      if (!isList(c)) continue;
      if (c[0] === "pin") {
        const nm = child(c, "name")?.[1];
        const no = child(c, "number")?.[1];
        if (typeof nm !== "string" || typeof no !== "string") throw schemaError(where, "a pin lacks a name or number");
        if (out.has(no)) throw schemaError(where, `pin ${no} appears twice`);
        out.set(no, { name: nm, type: String(c[1]) });
      } else walk(c);
    }
  };
  walk(sym);
  return out;
}

const count = (spec: Readonly<Record<string, unknown>>, path: string): number => {
  const n = spec["count"];
  if (typeof n !== "number" || !Number.isInteger(n) || n <= 0) throw schemaError(`${path}/from/count`, "from.count is the pad count the row asserts");
  return n;
};

/**
 * `from: {kind: "kicad", mod, sym?, count, origin?}` on a pads field: the
 * land pattern, names from the symbol. `origin: "pads-centre"` moves the
 * frame to the centre of the pad bounding box, for a library footprint
 * whose origin is pad 1 while the row's dims read from the module centre.
 */
export const kicadPads: FieldResolver = (spec, ctx) => {
  const mod = String(spec["mod"]);
  const raw = kicadModPads(ctx.text(mod), mod);
  const want = count(spec, ctx.path);
  if (raw.length !== want) throw schemaError(`${ctx.path}/from/count`, `${mod} holds ${raw.length} pads, the row asserts ${want}`, { got: raw.length, expected: String(want) });
  const origin = spec["origin"];
  if (origin !== undefined && origin !== "pads-centre") throw schemaError(`${ctx.path}/from/origin`, `origin ${String(origin)} is not pads-centre`, { got: origin, expected: "pads-centre" });
  let pads = raw;
  if (origin === "pads-centre") {
    const xs = raw.map((p) => p.x);
    const ys = raw.map((p) => p.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    // Rounded to 1e-6 mm so 17.78 / 2 lands on 8.89, not 8.889999999999999.
    const r6 = (v: number): number => Math.round(v * 1e6) / 1e6 + 0;
    pads = raw.map((p) => ({ ...p, x: r6(p.x - cx), y: r6(p.y - cy) }));
  }
  const names = spec["sym"] === undefined ? undefined : kicadSymPins(ctx.text(String(spec["sym"])), String(spec["sym"]));
  if (names !== undefined && names.size !== want) throw schemaError(`${ctx.path}/from/count`, `${String(spec["sym"])} holds ${names.size} pins, the row asserts ${want}`);
  return pads.map((p): CatalogPad => {
    const name = names === undefined ? p.pad : names.get(p.pad)?.name;
    if (name === undefined) throw schemaError(`${ctx.path}/from`, `pad ${p.pad} of ${mod} has no pin in the symbol`);
    const { type: _type, ...rest } = p;
    return { ...rest, name };
  });
};

const isPower = (type: string): boolean => type === "power_in" || type === "power_out";

/**
 * `from: {kind: "kicad-sym", sym, count}` on a pins field: number and name
 * from the symbol; role is the name lowercased for power_in and power_out
 * pins and "gpio" for the rest, which is what the symbol's electrical type
 * says. A passive pin named like a power pin of the same symbol takes the
 * power role: the KiCad library types one of a set of same-net pins as
 * power and the others passive (KLC S4.3), as the Pico's seven GND pins are.
 */
export const kicadPins: FieldResolver = (spec, ctx) => {
  const sym = String(spec["sym"]);
  const pins = kicadSymPins(ctx.text(sym), sym);
  const want = count(spec, ctx.path);
  if (pins.size !== want) throw schemaError(`${ctx.path}/from/count`, `${sym} holds ${pins.size} pins, the row asserts ${want}`, { got: pins.size, expected: String(want) });
  const power = new Set([...pins.values()].filter((p) => isPower(p.type)).map((p) => p.name));
  return [...pins.entries()].map(([no, p]): PinDef => {
    const n = Number(no);
    if (!Number.isInteger(n)) throw schemaError(`${ctx.path}/from`, `pin number ${no} is not an integer`);
    const powered = isPower(p.type) || (p.type === "passive" && power.has(p.name));
    return { n, name: p.name, role: powered ? p.name.toLowerCase() : "gpio" };
  }).sort((a, b) => a.n - b.n);
};

/** The resolvers a committed catalog loads with. */
export const KICAD_RESOLVERS = { kicad: kicadPads, "kicad-sym": kicadPins } as const;
