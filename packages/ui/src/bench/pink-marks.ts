/// <reference lib="dom" />
// The pink budget's structural and data classes (UI.md section 10), marked
// on the element that carries the pink: the header bottom rule and title
// dots, the step underline, the guide strip `STEP N NAME` label, the status
// strip top rule, the busy meter segments, which render only while a build
// runs (structural); slot swatches, which show a material's
// preview colour (data). tools/smoke/pink.ts subtracts exactly these marks
// and reads them on the element itself, never inherited.

const STRUCTURAL = ".hb-header, .hb-steps .hb-tab, .hb-guide-step, .hb-statusbar, .hb-spinner > i";
const DOTS = ".hb-header span, .hb-welcome h2 > span";
const DATA = ".hb-mat-sw, .hb-legend-sw";

export function tagPink(el: ParentNode): void {
  el.querySelectorAll(STRUCTURAL).forEach((e) => e.setAttribute("data-hb-pink", "structural"));
  el.querySelectorAll(DOTS).forEach((e) => {
    if (e.textContent === ".") e.setAttribute("data-hb-pink", "structural");
  });
  el.querySelectorAll(DATA).forEach((e) => e.setAttribute("data-hb-pink", "data"));
}
