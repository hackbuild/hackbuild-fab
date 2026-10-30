// BENCH.verbs.art: the art controller as one hook verb, so a smoke test or a
// script drives the same state the board draws (spec BenchHook.verbs). The
// first argument names the operation, the second carries its arguments; the
// param names which `art` field when a chase has more than one. Every call
// returns the controller's state after the operation, or throws a line that
// names what was wrong.

import type { ArtLayerKind } from "@hackbuild/spec";
import type { ArtDocController, ArtDocState } from "./controller.js";

type Args = Record<string, unknown>;

export const ART_OPS = ["state", "add", "remove", "reorder", "duplicate", "select", "set", "move", "scale", "rotate", "nudge", "face", "copy", "dropSvg", "dropRaster"] as const;

const str = (a: Args, k: string): string => {
  const v = a[k];
  if (typeof v !== "string") throw new Error(`art ${k} is ${JSON.stringify(v) ?? "missing"}, expected a string`);
  return v;
};
const num = (a: Args, k: string, d?: number): number => {
  const v = a[k] ?? d;
  if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(`art ${k} is ${JSON.stringify(v) ?? "missing"}, expected a number`);
  return v;
};

/** The verb for a set of controllers by param id; `ids` lists them in chase order, the first is the default. */
export function artVerb(ids: readonly string[], get: (id: string) => ArtDocController | null): (op?: unknown, args?: unknown) => ArtDocState {
  return (op, args) => {
    const a = (typeof args === "object" && args !== null ? args : {}) as Args;
    const id = typeof a["param"] === "string" ? a["param"] : ids[0];
    const c = id === undefined ? null : get(id);
    if (c === null) throw new Error(`no art param ${String(id)}; art params are ${ids.join(", ") || "none"}`);
    const mods = { shiftKey: a["shift"] === true, altKey: a["alt"] === true };
    switch (op) {
      case "state": case undefined: break;
      case "add": c.add(str(a, "kind") as ArtLayerKind, (a["over"] ?? {}) as Record<string, string | number | boolean>); break;
      case "remove": if (!c.remove(str(a, "id"))) throw new Error(`no layer ${str(a, "id")}`); break;
      case "reorder": c.reorder(str(a, "id"), num(a, "by")); break;
      case "duplicate": c.duplicate(str(a, "id")); break;
      case "select": c.select(a["id"] === null ? null : str(a, "id")); break;
      case "set": {
        const v = a["value"];
        if (typeof v !== "string" && typeof v !== "number" && typeof v !== "boolean") throw new Error(`art value is ${JSON.stringify(v) ?? "missing"}, expected a string, number or boolean`);
        const line = c.set(str(a, "id"), str(a, "key"), v);
        if (line !== null) throw new Error(line);
        break;
      }
      case "move": c.moveBy(str(a, "id"), num(a, "dx"), num(a, "dy"), mods); break;
      case "scale": c.scaleBy(str(a, "id"), num(a, "k"), mods.shiftKey); break;
      case "rotate": c.rotateTo(str(a, "id"), num(a, "deg"), mods); break;
      case "nudge": c.nudge(str(a, "id"), num(a, "ax", 0), num(a, "ay", 0), mods.shiftKey); break;
      case "face": {
        const f = str(a, "face");
        if (f !== "front" && f !== "back") throw new Error(`art face is ${f}, expected front or back`);
        c.setFace(f);
        break;
      }
      case "copy": c.copyToOtherFace(str(a, "id")); break;
      case "dropSvg": c.dropSvg(str(a, "text")); break;
      case "dropRaster": c.dropRaster(str(a, "name")); break;
      default: throw new Error(`art op ${String(op)}, expected one of ${ART_OPS.join(", ")}`);
    }
    return c.state();
  };
}
