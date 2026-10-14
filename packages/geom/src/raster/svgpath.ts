// SVG path data to closed rings. By default the commands are the ones the
// hack.build mark uses (M m L l H h V v Z z, measured: the two mark paths
// in collar.html lines 605 and 606 hold only m, h, l, v and z), with the
// implicit lineto after a moveto, and any other command is refused, so a
// curve is never filled as a straight chord.
//
// With `curves`, C c S s Q q T t are flattened at a fixed count of points
// per segment, the rule of the KEYWAY family's svgpath.py
// (reference/copper/keyway/legacy/svgpath.py lines 16 to 33 and 85 to 114:
// cubic n 12, quadratic n 10, S and T reflect the previous control point
// of their own kind, any other command clears it). Arcs stay refused, as
// svgpath.py raises on them.

import { commandError, type Ring, type Vec2 } from "@hackbuild/spec";

/** SVG matrix(a, b, c, d, e, f): x' = a x + c y + e, y' = b x + d y + f. */
export type Affine = readonly [a: number, b: number, c: number, d: number, e: number, f: number];

export const IDENTITY: Affine = [1, 0, 0, 1, 0, 0];

export interface FlattenOptions {
  /** Points per cubic and per quadratic segment; absent refuses curves. */
  readonly curves?: { readonly cubic: number; readonly quad: number };
  /** Fewest points a kept ring holds, default 2. svgpath.py keeps rings of 3 or more. */
  readonly minPoints?: number;
}

const TOKEN = /[A-Za-z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
const LINES: Readonly<Record<string, number>> = { M: 2, L: 2, H: 1, V: 1, Z: 0 };
const CURVES: Readonly<Record<string, number>> = { ...LINES, C: 6, S: 4, Q: 4, T: 2 };

function bad(got: unknown, expected: string, hint: string): Error {
  return commandError({ code: "E_SCHEMA", path: "/svgPath", got, expected, record: "kernels/art-inlay", hint });
}

/**
 * One ring per subpath, in path order, each point mapped by `transform`.
 * A subpath is closed implicitly, as a fill closes it. Subpaths with fewer
 * than `minPoints` points are dropped.
 */
export function flattenSvgPath(d: string, transform: Affine = IDENTITY, opts: FlattenOptions = {}): Ring[] {
  const arity = opts.curves === undefined ? LINES : CURVES;
  const minPoints = opts.minPoints ?? 2;
  const tokens = d.match(TOKEN) ?? [];
  const rest = d.replace(TOKEN, "").replace(/[\s,]/g, "");
  if (rest.length > 0) throw bad(rest.slice(0, 16), "path data of commands and numbers", "remove the characters that are neither a command nor a number");
  const [a, b, c, dd, e, f] = transform;
  const rings: Vec2[][] = [];
  let cur: Vec2[] = [];
  let x = 0, y = 0, sx = 0, sy = 0;
  // Last cubic second control and last quadratic control, absolute, for S and T.
  let c2: Vec2 | null = null;
  let q1: Vec2 | null = null;
  let cmd = "";
  const end = (): void => {
    if (cur.length >= minPoints) rings.push(cur);
    cur = [];
  };
  const put = (px: number = x, py: number = y): void => {
    cur.push([a * px + c * py + e, b * px + dd * py + f]);
  };
  const cubic = (p1: Vec2, p2: Vec2, p3: Vec2, n: number): void => {
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      const u = 1 - t;
      put(u * u * u * x + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
        u * u * u * y + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1]);
    }
  };
  const quad = (p1: Vec2, p2: Vec2, n: number): void => {
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      const u = 1 - t;
      put(u * u * x + 2 * u * t * p1[0] + t * t * p2[0], u * u * y + 2 * u * t * p1[1] + t * t * p2[1]);
    }
  };
  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i]!;
    if (/^[A-Za-z]$/.test(tok)) {
      if (arity[tok.toUpperCase()] === undefined) {
        throw opts.curves === undefined
          ? bad(tok, "one of M m L l H h V v Z z", `path command ${tok} is not supported; convert curves to line segments before import`)
          : bad(tok, "one of M L H V C S Q T Z, either case", `path command ${tok} is not supported; convert arcs to curves before import`);
      }
      cmd = tok;
      i++;
      if (cmd === "Z" || cmd === "z") {
        end();
        x = sx;
        y = sy;
        c2 = q1 = null;
        continue;
      }
    } else if (cmd === "" || cmd === "Z" || cmd === "z") {
      throw bad(tok, "a command before the number", "start the path with M or m");
    }
    const n = arity[cmd.toUpperCase()]!;
    const nums: number[] = [];
    for (let k = 0; k < n; k++) {
      const t = tokens[i + k];
      if (t === undefined || /^[A-Za-z]$/.test(t)) throw bad(t ?? null, `${n} numbers after ${cmd}`, `give ${cmd} ${n} numbers`);
      nums.push(Number(t));
    }
    i += n;
    const rel = cmd === cmd.toLowerCase();
    const pt = (k: number): Vec2 => [rel ? x + nums[k]! : nums[k]!, rel ? y + nums[k + 1]! : nums[k + 1]!];
    // A drawing command after Z starts a new subpath at the point Z returned to.
    if (cur.length === 0 && cmd.toUpperCase() !== "M") put();
    const up = cmd.toUpperCase();
    switch (up) {
      case "M":
        end();
        [x, y] = pt(0);
        sx = x;
        sy = y;
        put();
        cmd = rel ? "l" : "L";
        break;
      case "L":
        [x, y] = pt(0);
        put();
        break;
      case "H":
        x = rel ? x + nums[0]! : nums[0]!;
        put();
        break;
      case "V":
        y = rel ? y + nums[0]! : nums[0]!;
        put();
        break;
      case "C": {
        const p1 = pt(0), p2 = pt(2), p3 = pt(4);
        cubic(p1, p2, p3, opts.curves!.cubic);
        [x, y] = p3;
        c2 = p2;
        break;
      }
      case "S": {
        const p2 = pt(0), p3 = pt(2);
        const p1: Vec2 = c2 === null ? [x, y] : [2 * x - c2[0], 2 * y - c2[1]];
        cubic(p1, p2, p3, opts.curves!.cubic);
        [x, y] = p3;
        c2 = p2;
        break;
      }
      case "Q": {
        const p1 = pt(0), p2 = pt(2);
        quad(p1, p2, opts.curves!.quad);
        [x, y] = p2;
        q1 = p1;
        break;
      }
      case "T": {
        const p2 = pt(0);
        const p1: Vec2 = q1 === null ? [x, y] : [2 * x - q1[0], 2 * y - q1[1]];
        quad(p1, p2, opts.curves!.quad);
        [x, y] = p2;
        q1 = p1;
        break;
      }
    }
    if (up !== "C" && up !== "S") c2 = null;
    if (up !== "Q" && up !== "T") q1 = null;
  }
  end();
  return rings;
}
