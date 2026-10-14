// CHK-INL-04 bed-face art mirrored in X at extrude (CHECKS.md 6, version
// 1.0.1: origin corrected to the python hackbuild coin v1, whose back
// wordmark printed backwards; D-063 mirrorOnFlip). Measured: whether the
// bottom slab the generator emits (the label volume's [0, depth] band,
// art slots only) equals the bed face as read in hand, cleaned and mirrored
// in X. extra.mirrorDistinct says whether the art differs from its mirror;
// art symmetric in X passes either way, so it is reported.

import type { CheckCtx, Finding, Part } from "@hackbuild/spec";
import { artFaces, artOf } from "../kind.js";
import { mirrorX } from "../mirror.js";
import { distinctArts, hostOf, splitOf } from "./common.js";

export const CHK_INL_04 = "CHK-INL-04" as const;
export const CHK_INL_04_VERSION = "1.0.1";

const same = (a: Uint8Array, b: Uint8Array): boolean => a.length === b.length && a.every((v, i) => v === b[i]);

export function runInl04(t: { readonly part: Part }, ctx: CheckCtx): readonly Finding[] {
  const out: Finding[] = [];
  for (const f of distinctArts(t.part)) {
    const target = { level: "part" as const, part: t.part.id };
    const host = hostOf(t.part, f, ctx);
    const asRead = artFaces(artOf(f)).bed.art;
    const art = asRead.labels.map((s) => (s === host.slot ? 0 : s));
    const cells = art.reduce((n, s) => n + (s === 0 ? 0 : 1), 0);
    if (cells === 0) {
      out.push({ verdict: "skip", target, measured: "no bed-face art", legal: { kind: "none" }, constraint: `art ${f.art} paints nothing on the bed face; nothing to mirror` });
      continue;
    }
    const split = splitOf(t.part, f, ctx);
    const bottom = split.shape.layers[0];
    const mask = bottom === undefined ? undefined : split.masks.get(bottom.mask);
    const want = mirrorX(art, asRead.w, asRead.h);
    const ok = mask !== undefined && bottom!.z[0] === 0 && same(mask.labels, want);
    out.push({
      verdict: ok ? "pass" : "fail",
      target, measured: ok,
      legal: { kind: "boolean", must: true },
      constraint: "art on the bed face is read from the other side once the part is off the plate, so the bottom slab is the as-read face mirrored in X (D-063 mirrorOnFlip)",
      extra: { art: f.art, bedCells: cells, mirrorDistinct: same(art, want) ? "no" : "yes" },
    });
  }
  return out;
}
