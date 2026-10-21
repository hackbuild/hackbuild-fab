// view.light (plan v9 section 3.2: the coin preview): move the stage's key
// light around the part to rake a flush inlay or a relief. The key light
// is PIP's (part3.js lines 14 to 17, viewer/scene.ts LIGHTS.key); the
// widget keeps its distance and intensity and turns its position into an
// azimuth about +z and an elevation above the bed, so the rest pose is the
// ported light exactly. The viewer's keyLight takes the position this
// model returns, so the control and the stage read one number.

import type { WidgetDecl } from "@hackbuild/spec";
import { LEGACY_LIGHT_SCALE, LIGHTS } from "../viewer/scene.js";
import { liveOutputs } from "./live.js";
import type { WidgetEntry, WidgetModel } from "./registry.js";

/** A light direction in degrees: azimuth from +x toward +y, elevation above the bed. */
export interface LightAim {
  readonly azDeg: number;
  readonly elDeg: number;
}

const D2R = Math.PI / 180;
const [KX, KY, KZ] = LIGHTS.key.at;
/** Distance of PIP's key light from the origin, mm (computed from LIGHTS.key.at). */
export const KEY_DIST = Math.hypot(KX, KY, KZ);
/** PIP's key light as an aim (computed from LIGHTS.key.at): the rest pose of the widget. */
export const KEY_AIM: LightAim = { azDeg: Math.atan2(KY, KX) / D2R, elDeg: Math.atan2(KZ, Math.hypot(KX, KY)) / D2R };
/** Elevation range the control offers, degrees (inferred: at 0 the light grazes the bed, at 90 it is overhead). */
export const EL_RANGE: readonly [number, number] = [0, 90];

/** The key light position for an aim, at the ported distance. */
export function lightAt(aim: LightAim): [number, number, number] {
  const az = aim.azDeg * D2R;
  const el = aim.elDeg * D2R;
  return [KEY_DIST * Math.cos(el) * Math.cos(az), KEY_DIST * Math.cos(el) * Math.sin(az), KEY_DIST * Math.sin(el)];
}

export interface LightModel extends WidgetModel {
  readonly aim: LightAim | null;
}

const num = (v: unknown, fallback: number): number => (typeof v === "number" ? v : fallback);

export const viewLight: WidgetEntry<LightModel> = {
  model(decl: WidgetDecl, build) {
    const aim = build.lights?.[decl.id] ?? { azDeg: num(decl.inputs["azDeg"], KEY_AIM.azDeg), elDeg: num(decl.inputs["elDeg"], KEY_AIM.elDeg) };
    if (!Number.isFinite(aim.azDeg) || !Number.isFinite(aim.elDeg) || aim.elDeg < EL_RANGE[0] || aim.elDeg > EL_RANGE[1]) {
      return { id: decl.id, kind: decl.kind, outputs: {}, problem: `light elevation ${aim.elDeg} deg is outside ${EL_RANGE[0]} to ${EL_RANGE[1]}`, aim: null };
    }
    const outputs: Record<string, unknown> = {
      azDeg: aim.azDeg, elDeg: aim.elDeg, at: lightAt(aim), intensity: LIGHTS.key.intensity * LEGACY_LIGHT_SCALE,
      qualifier: { at: "computed", intensity: "inferred" },
    };
    return { id: decl.id, kind: decl.kind, outputs, problem: null, aim };
  },
  liveness: liveOutputs,
};

/** The light readout line. */
export function lightLine(m: LightModel): string {
  if (m.aim === null) return m.problem ?? "";
  return `key light at ${Math.round(m.aim.azDeg)} deg around, ${Math.round(m.aim.elDeg)} deg up`;
}
