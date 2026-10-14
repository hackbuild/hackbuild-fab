// The STYLUS THINPOT electrical maths and the encoder marks (M06-T10),
// ported from originals/thinpot/files/feeler_thinpot.html: dividerR and
// niceR (lines 1086 to 1095), the ladder levels of SIM.ladder (lines 4950
// to 4956), the loaded thinpot divider of SIM.thinpot (lines 4914 to 4916)
// and the quadrature marks of the encoder (lines 3147 to 3151) with its
// defect fixed: the page offsets B by step / 2, 180 electrical degrees, so
// B is A's complement and carries no direction; the port offsets B by
// step / 4, as the FEELER sim does (D-097, benches-conductive-a.md line 624).
// Resistances in ohm come from the caller, who reads them through profile
// sectionResistance (D-098); FEELER's own rho values stay in provenance.

/** A divider resistor matching the sensor and keeping the current under 20 mA at vcc (line 1086). */
export function dividerR(r0: number, vcc = 3.3): number {
  return Math.max(r0, vcc / 0.02 - r0, 47);
}

/** E24 values a decade spans (line 1092). */
export const E24: readonly number[] = [1, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2, 2.2, 2.4, 2.7, 3, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1, 10];

/** The nearest E24 value in r's decade (line 1090). */
export function niceR(r: number): number {
  const e = Math.pow(10, Math.floor(Math.log10(Math.max(1, r))));
  const m = r / e;
  let best = E24[0] as number;
  for (const v of E24) if (Math.abs(v - m) < Math.abs(best - m)) best = v;
  return best * e;
}

/**
 * Ladder levels, SIM.ladder lines 4950 to 4956: key k (from 0) sees k
 * links above the tap and N - k below, the lower part in parallel with the
 * contact plus pull down; V(k) = Rpar / (k R + Rpar), as a fraction of vcc.
 */
export function ladderLevels(n: number, rLink: number, rPullDown: number, rContact = 4000): number[] {
  const out: number[] = [];
  for (let k = 0; k < n; k++) {
    const rUp = k * rLink, rDn = (n - k) * rLink, rl = rContact + rPullDown;
    const rPar = (rDn * rl) / (rDn + rl);
    out.push(rPar / (rUp + rPar));
  }
  return out;
}

/** The loaded thinpot divider, SIM.thinpot lines 4914 to 4916: the tap at rLo, the contact rc, the load rLoad, as a fraction of vin. */
export function thinpotOut(rLo: number, rHi: number, rc: number, rLoad: number): number {
  const rPar = (rLo * (rc + rLoad)) / (rLo + rc + rLoad);
  return rPar / (rPar + rHi);
}

/** Marks as [start, end] angles in rad. */
export type Marks = readonly (readonly [number, number])[];

/**
 * The A and B tracks of a quadrature disc of ppr pulses per turn, marks
 * step / 2 long on a step period. `bOffset` is B's lead over A as a
 * fraction of the step: 0.25 (90 electrical degrees) in the port; the page
 * used 0.5.
 */
export function quadratureMarks(ppr: number, bOffset = 0.25): { readonly a: Marks; readonly b: Marks; readonly step: number } {
  const step = (Math.PI * 2) / ppr;
  const track = (phase: number): Marks => Array.from({ length: ppr }, (_, i) => [phase + i * step, phase + i * step + step / 2] as const);
  return { a: track(0), b: track(bOffset * step), step };
}

/** True when B is A rotated by a quarter of the mark period (step / 4) within tol rad. */
export function isQuadrature(m: { readonly a: Marks; readonly b: Marks; readonly step: number }, tol = 1e-9): boolean {
  if (m.a.length !== m.b.length) return false;
  return m.a.every((x, i) => {
    const y = m.b[i] as readonly [number, number];
    return Math.abs(y[0] - (x[0] + m.step / 4)) <= tol && Math.abs(y[1] - (x[1] + m.step / 4)) <= tol;
  });
}
