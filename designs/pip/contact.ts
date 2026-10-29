// Pure drive-pad contact function. The bench entry imports this file alone so the
// kernel author surface stays out of the UI bundle; build.ts re-exports it.
import type { ContactFn } from "@hackbuild/spec";

// The drive pad's contact function (G-20): target is a key name, A, SELECT
// and so on, or a stick direction. A hold closes the contact region the
// key's actuator bridges to its common: the flex column halves, the click
// half pads, the touch combs, or the stick's wall pad and the ring above
// it. Its partner region is the same id with Common for keys.
export const contact: ContactFn = (metrics, target, stimulus) => {
  const v = metrics.find((m) => m.id === `drive.${target}`)?.value;
  const held = stimulus === true || (typeof stimulus === "number" && stimulus > 0) || (typeof stimulus === "object" && stimulus.tiltDeg > 0);
  if (typeof v !== "string" || v === "" || !held) return { closed: [], dir: "none" };
  const stickPad = /\.conductor\.pad\d$/.test(v);
  return { closed: stickPad ? [v] : [v, `${v}Common`], dir: target };
};
