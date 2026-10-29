// Pure drive-pad contact function. The bench entry imports this file alone so the
// kernel author surface stays out of the UI bundle; build.ts re-exports it.
import type { ContactFn } from "@hackbuild/spec";

export const ID = "click-spring-key";

// The drive pad's contact function (bench.ts views.drive.contact, G-20): a
// travel stimulus in mm, or a hold that presses the paddle to its stop
// (paddle.travel). The tip closes the pad split once the travel reaches the
// spring's contact travel cg; the force is the archetype's sampled SNAPFE
// curve, linear between samples and held at its ends. One function for the
// pad, the 3D pose, the readout, the curve panel and BENCH.drive.
export const contact: ContactFn = (metrics, target, stimulus) => {
  const num = (id: string): number | undefined => {
    const v = metrics.find((m) => m.id === id)?.value;
    return typeof v === "number" ? v : undefined;
  };
  const key = `${ID}.${target}`;
  const cg = num(`${key}.spring.cg`);
  const stop = num("paddle.travel") ?? 0;
  const asked = stimulus === true ? stop : typeof stimulus === "number" ? stimulus : 0;
  const travel = Math.min(Math.max(asked, 0), stop);
  const n = num(`${key}.spring.curve.n`) ?? 0;
  const d: number[] = [], F: number[] = [];
  for (let i = 0; i < n; i++) {
    const di = num(`${key}.spring.curve.d${i}`), Fi = num(`${key}.spring.curve.F${i}`);
    if (di === undefined || Fi === undefined) break;
    d.push(di);
    F.push(Fi);
  }
  let forceN: number | undefined;
  if (d.length > 0) {
    let j = 1;
    while (j < d.length && d[j]! < travel) j++;
    if (travel <= d[0]!) forceN = F[0]!;
    else if (j >= d.length) forceN = F[d.length - 1]!;
    else {
      const span = d[j]! - d[j - 1]!;
      forceN = span > 0 ? F[j - 1]! + ((F[j]! - F[j - 1]!) * (travel - d[j - 1]!)) / span : F[j]!;
    }
  }
  return {
    closed: cg !== undefined && travel >= cg ? [`${key}.conductor.pad`, `${key}.conductor.padCommon`] : [],
    pose: { travelMm: travel },
    ...(forceN === undefined ? {} : { forceN }),
  };
};
