// designs/sprue/test/parity.entry.ts
// The package side of the SPRUE browser parity (M03-T10 steps 3 and 4).
// The harness (tools/py/harness/sprue_parity.py, or its puppeteer form
// tools/legacy/sprue-parity.mjs on hosts Playwright refuses) bundles this
// file with tsdown 0.23.0 as one IIFE (dist/parity.entry.iife.js, loaded by
// parity.html from file://) and calls SPRUE_PARITY.run in the same Chromium
// that drives the legacy page.
//
// It composes the layers the legacy page holds after a preset with
// @hackbuild/inlay: sprueGeo for the blank and zone, the text layers painted
// by the bench-core canvas surface in its "px" text mode, the `sprue` hygiene
// recipe and thinFlags. The fonts arrive from the harness, cut from the
// legacy page's own embedded @font-face rules, so both pages paint one face.

import {
  composeSprue, sprueFont, sprueGeo, sprueThin,
  type SprueBlank, type SprueLayer, type ThinFlag,
} from "@hackbuild/inlay";
import { canvasSurface } from "@hackbuild/bench-core";
import { blankOutline, holeYOf } from "../build";
import { chase, type SprueParams } from "../chase";

export interface ParityFont {
  readonly family: string;
  readonly weight: string;
  /** a data: url of the font bytes */
  readonly url: string;
}

/** The legacy page's ST fields that shape the faces (sprue.html line 956). */
export interface LegacyState {
  readonly kind: "pick" | "coin";
  readonly pickScale: number;
  readonly pickHole: boolean;
  readonly holeD: number;
  readonly coinD: number;
  readonly ring: boolean;
  readonly ringW: number;
  readonly ringIn: number;
  readonly margin: number;
  readonly ppm: number;
  readonly minF: number;
  readonly minGap: number;
}

export interface ParityInput {
  readonly st: LegacyState;
  readonly faces: { readonly front: readonly SprueLayer[]; readonly back: readonly SprueLayer[] };
  readonly fonts: readonly ParityFont[];
}

export interface ParityFace {
  /** raw ink in the zone, row 0 at the top, base64 */
  readonly raw: string;
  /** after the sprue recipe, base64 */
  readonly clean: string;
  /** one flag per unmuted layer, in layer order */
  readonly thin: readonly ThinFlag[];
}

export interface ParityOutput {
  readonly w: number;
  readonly h: number;
  readonly front: ParityFace;
  readonly back: ParityFace;
}

function b64(a: Uint8Array): string {
  let s = "";
  for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode(...a.subarray(i, i + 0x8000));
  return btoa(s);
}

async function addFonts(fonts: readonly ParityFont[]): Promise<void> {
  for (const f of fonts) {
    const face = new FontFace(f.family, `url(${f.url})`, { weight: f.weight, style: "normal" });
    document.fonts.add(await face.load());
  }
}

function chaseDefaults(): SprueParams {
  const out: Record<string, unknown> = {};
  for (const grp of chase.params) for (const f of grp.fields) out[f.id] = f.default;
  return out as SprueParams;
}

async function run(input: ParityInput): Promise<ParityOutput> {
  await addFonts(input.fonts);
  const st = input.st;
  // The bench's ST over the chase defaults; hole height and keepout have no ST field and keep theirs.
  const p: SprueParams = { ...chaseDefaults(), kind: st.kind, pickScale: st.pickScale, coinD: st.coinD };
  const blank: SprueBlank = {
    kind: st.kind, pickHole: st.pickHole, holeD: st.holeD, holeY: holeYOf(p), coinD: st.coinD,
    ring: st.ring, ringW: st.ringW, ringIn: st.ringIn, margin: st.margin, keep: p.keep, ppm: st.ppm,
  };
  const clean = { minF: st.minF, minGap: st.minGap };
  const g = sprueGeo(blank, blankOutline(p));
  const surface = canvasSurface({ w: g.w, h: g.h, res: g.ppm }, { text: "px" });
  const used = new Set<string>();
  for (const L of [...input.faces.front, ...input.faces.back]) if (L.type === "text" && !L.mute) used.add(sprueFont(L));
  await surface.fontsReady([...used]);
  const face = (side: "front" | "back"): ParityFace => {
    const layers = input.faces[side];
    const c = composeSprue(layers, surface, g, blank, clean);
    const t = sprueThin(layers, side, surface, g, clean);
    return { raw: b64(c.raw), clean: b64(c.clean), thin: t.layers.map((r) => r.flag) };
  };
  return { w: g.w, h: g.h, front: face("front"), back: face("back") };
}

(globalThis as { SPRUE_PARITY?: unknown }).SPRUE_PARITY = { run };
