// flexCapBridgeOhm against the PIP source line itself: model.js line 404 is
// read from the originals and evaluated on the same inputs, so a change to
// the port's arithmetic fails here (lineage pip.model/pip-controller-b137deb-flex-switch).
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { flexCapBridgeOhm, rcCrossingUs, rcTauUs } from "../src/index.js";
import { originalPath } from "../../../tools/test-support/originals-root.js";

const MODEL = originalPath("pip/files/pip-controller/src/model.js");

/** PIP's own Rsw expression, model.js line 404, evaluated with rhoT in ohm m. */
function pipRsw(rhoOhmM: number, colGap: number, colR: number, cap: number): number {
  const line = readFileSync(MODEL, "utf8").split("\n")[403]!;
  const m = line.match(/Rsw = (.*);\s*$/);
  if (!m) throw new Error(`model.js line 404 no longer holds Rsw: ${line.trim()}`);
  return new Function("rhoT", "F", "fd", `return ${m[1]};`)(rhoOhmM, { colGap, cap }, { colR }) as number;
}

describe("flex cap bridge, PIP model.js:404", () => {
  it.skipIf(!existsSync(MODEL))("equals the source line bit for bit over a spread of cap geometries", () => {
    const cases: [number, number, number, number][] = [
      // ohm cm, colGap, colR, cap (mm)
      [12, 1.0, 1.6, 1.2], [12, 0.6, 2.0, 0.8], [3.5, 1.4, 1.2, 1.6], [120, 0.8, 2.4, 1.0],
    ];
    for (const [ohmCm, colGapMm, colRMm, capTMm] of cases) {
      expect(flexCapBridgeOhm({ ohmCm, colGapMm, colRMm, capTMm })).toBe(pipRsw(ohmCm * 1e-2, colGapMm, colRMm, capTMm));
    }
  });

  it("grows with the split and falls with the column radius", () => {
    const base = { ohmCm: 12, colGapMm: 1, colRMm: 1.6, capTMm: 1.2 };
    expect(flexCapBridgeOhm({ ...base, colGapMm: 1.5 })).toBeGreaterThan(flexCapBridgeOhm(base));
    expect(flexCapBridgeOhm({ ...base, colRMm: 2.4 })).toBeLessThan(flexCapBridgeOhm(base));
  });
});

describe("RC crossing", () => {
  it("is R C ln(VDD / VIL) for a high drive returning to GND", () => {
    // 100 kohm, 27 pF, 3.3 V to 0.8 V: tau 2.7 us, crossing 2.7 ln(4.125) us (computed by hand).
    expect(rcTauUs(100e3, 27)).toBeCloseTo(2.7, 12);
    expect(rcCrossingUs({ ohm: 100e3, capPf: 27, vDrive: 3.3, vRet: 0, vThreshold: 0.8 })).toBeCloseTo(2.7 * Math.log(3.3 / 0.8), 12);
  });

  it("reads the threshold swing against the return net, so a power return mirrors a GND return", () => {
    const toGnd = rcCrossingUs({ ohm: 50e3, capPf: 10, vDrive: 3.3, vRet: 0, vThreshold: 0.8 });
    const toVdd = rcCrossingUs({ ohm: 50e3, capPf: 10, vDrive: 0, vRet: 3.3, vThreshold: 2.5 });
    expect(toVdd).toBeCloseTo(toGnd, 12);
  });
});
