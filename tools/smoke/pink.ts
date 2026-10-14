// The pink budget of one view (M09-T14 step 2, D-125, UI.md section 10,
// aesthetic-voice-ux-bible.md 5.7). Counts visible elements whose computed
// background-color, any border side with non-zero width, or (with a direct
// non-empty text node) color is the package pink, then removes the
// structural set: an element the shell marks `data-hb-pink="structural"`,
// the focused element's border (the focus ring); the busy meter segments
// carry the structural mark while they render. A slot swatch marked `data-hb-pink="data"` shows
// a material's preview colour, the data class of UI.md section 10, and is
// left out the same way. The mark is read on the element itself, never
// inherited, so a structural header cannot hide a pink control inside it.
// Shadows and range accent-color are never counted, so the stage pink
// shadow and the range thumb stay out by construction.
// More than one remaining element fails the view.

import type { Page } from "@playwright/test";

/** `--hb-pink` #FE0386 as getComputedStyle reports it. */
export const PINK_RGB = "rgb(254, 3, 134)";

export interface PinkHit {
  /** tag, data-hb and first two classes, for the failure print. */
  el: string;
  /** Which property carried the pink. */
  via: ("background" | "border" | "text")[];
  text: string;
  structural: boolean;
  /** The view the element belongs to: the scope element's label, or "page". */
  view: string;
}

export interface PinkView {
  /** Raw pink elements before the structural set is removed. */
  raw: number;
  /** Elements left after the structural set; the budget is 1. */
  focal: PinkHit[];
  structural: number;
}

/**
 * Runs in the page. Self-contained: page.evaluate serialises it, so it
 * may reference nothing outside its own body.
 */
export function scanPink([pink, scope]: [string, string | null]): PinkHit[] {
  const hits: PinkHit[] = [];
  const active = document.activeElement;
  for (const node of Array.from(document.querySelectorAll("body *"))) {
    const e = node as HTMLElement;
    const r = e.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    const cs = getComputedStyle(e);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) continue;
    const via: PinkHit["via"] = [];
    if (cs.backgroundColor === pink) via.push("background");
    const sides = ["Top", "Right", "Bottom", "Left"] as const;
    const border = sides.some((s) => {
      const w = parseFloat(cs.getPropertyValue(`border-${s.toLowerCase()}-width`));
      const st = cs.getPropertyValue(`border-${s.toLowerCase()}-style`);
      return w > 0 && st !== "none" && st !== "hidden" && cs.getPropertyValue(`border-${s.toLowerCase()}-color`) === pink;
    });
    if (border && e !== active) via.push("border");
    const ownText = Array.from(e.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent ?? "").join("").trim();
    if (ownText !== "" && cs.color === pink) via.push("text");
    if (via.length === 0) continue;
    const mark = e.getAttribute("data-hb-pink");
    const structural = mark === "structural" || mark === "data";
    const hb = e.getAttribute("data-hb");
    const cls = Array.from(e.classList).slice(0, 2).join(".");
    hits.push({
      el: `${e.tagName.toLowerCase()}${hb === null ? "" : `[data-hb=${hb}]`}${cls === "" ? "" : `.${cls}`}`,
      via,
      text: (ownText || (e.textContent ?? "").trim()).slice(0, 40),
      structural,
      view: scope === null ? "page" : (e.closest(scope)?.getAttribute("data-kit") ?? "page"),
    });
  }
  return hits;
}

const viewOf = (hits: PinkHit[]): PinkView => {
  const focal = hits.filter((h) => !h.structural);
  return { raw: hits.length, focal, structural: hits.length - focal.length };
};

/** The whole page as one view: a bench step or the welcome. */
export async function pinkView(page: Page): Promise<PinkView> {
  return viewOf(await page.evaluate(scanPink, [PINK_RGB, null] as [string, string | null]));
}

/**
 * A specimen page as many views: each element under `scope` (the kit's
 * `[data-kit]` sections, one shell part in one state each) is its own view.
 */
export async function pinkViews(page: Page, scope: string): Promise<Map<string, PinkView>> {
  const hits = await page.evaluate(scanPink, [PINK_RGB, scope] as [string, string | null]);
  const by = new Map<string, PinkHit[]>();
  for (const h of hits) by.set(h.view, [...(by.get(h.view) ?? []), h]);
  return new Map([...by].map(([k, v]) => [k, viewOf(v)]));
}

/** The failure text: count and each focal element. */
export const pinkMessage = (where: string, v: PinkView): string =>
  `${where}: ${v.focal.length} focal pink elements, budget 1 (measured)\n${v.focal.map((h) => `  ${h.el} ${h.via.join("+")} "${h.text}"`).join("\n")}`;
