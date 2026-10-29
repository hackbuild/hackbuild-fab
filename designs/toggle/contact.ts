// Pure drive-pad contact function. The bench entry imports this file alone so the
// kernel author surface stays out of the UI bundle; build.ts re-exports it.
import type { ContactFn } from "@hackbuild/spec";

export const STICK = "tilt-stick";

const num = (metrics: Parameters<ContactFn>[0], id: string): number | undefined => {
  const v = metrics.find((m) => m.id === id)?.value;
  return typeof v === "number" ? v : undefined;
};
const pads = (metrics: Parameters<ContactFn>[0], id: string): string[] => {
  const v = metrics.find((m) => m.id === id)?.value;
  return typeof v === "string" && v !== "" ? v.split(",").map((s) => `${STICK}.0.conductor.pad${s}`) : [];
};

// The drive pad's contact function (G-20): target is a direction name, E, N
// and so on. A hold tilts the stick to its stop toward that direction's
// sector centre and closes the pads the archetype's solver lists there; a
// number is the tilt in degrees toward it (pads at contact from the contact
// tilt, at the stop from the stop); a tilt and an angle take the direction
// whose sector centre is nearest the angle. Between two sectors the solver
// may close both; that case reads the nearest sector's lists, and a drive
// over the full solver lands with the bench.
export const contact: ContactFn = (metrics, target, stimulus) => {
  const centre = (n: string): number | undefined => num(metrics, `drive.${n}.deg`);
  let dirName = target;
  let tilt: number;
  const thContact = num(metrics, `${STICK}.0.stick.thContact`) ?? Infinity;
  const thStop = num(metrics, `${STICK}.0.stick.thStop`) ?? thContact;
  if (typeof stimulus === "object") {
    const ids = metrics.filter((m) => /^drive\.[A-Z]+$/.test(m.id)).map((m) => m.id.slice(6));
    const off = (n: string): number => { const d = Math.abs(((stimulus.phiDeg - (centre(n) ?? 0)) % 360 + 540) % 360 - 180); return d; };
    dirName = ids.reduce((a, b) => (off(b) < off(a) ? b : a), ids[0] ?? target);
    tilt = stimulus.tiltDeg;
  } else tilt = stimulus === true ? thStop : stimulus === false ? 0 : stimulus;
  const k = num(metrics, `drive.${dirName}`);
  const phiDeg = centre(dirName) ?? 0;
  if (k === undefined || !(tilt >= thContact - 1e-6)) return { closed: [], dir: "none", pose: { tiltDeg: tilt, phiDeg } };
  const closed = pads(metrics, `${STICK}.0.drive.${k}.${tilt >= thStop - 1e-6 ? "stop" : "contact"}`);
  return { closed, dir: closed.length > 0 ? dirName : "none", pose: { tiltDeg: tilt, phiDeg } };
};
