// reference/fit/ogee16-r16p/build.ts
// The 18 OGEE R16-P fit rows as Part IR metrics (D-049), ported from the
// FITS list of fits.py lines 51 to 77 (lineage ogee16.fits/r16p): for each
// row, hole and shaft as fits.py computes them, drawn = hole - shaft, and
// the profile class id (k.fit, so PSLIDE resolves to PSLIP, D-100). The
// arithmetic keeps fits.py's operation order, so every drawn value is the
// same double fits.py printed. fits.table reads these rows and bounds each
// one through profile/fit-band; build.ts reads no band.
//
// Frame profiles shrink PRINT_SHRINK on every edge (printed.scad fr()), so
// a printed tab in a printed slot gains 2 x SH on the slot and loses 2 x SH
// on the tab, and the rail groove of the latch plate is drawn FIT_SLIDE
// minus 4 x SH (printed.scad RAIL_GAP): the factors 2 and 4 count edges.
//
// spec/build.ts needs a body, so the first row is built as a coupon: the
// shaft standing in its bore, both T tall, on the prism route.

import { defineBuild, qualify, type Metric } from "@hackbuild/spec";
import { chase } from "./chase";

/** Fit model the rows are banded by (packages/profile FIT_MODELS). */
const MODEL = "ogee16-fits-v1";

export const build = defineBuild(chase, (p, k) => {
  const T = p.T;
  const SH = p.PRINT_SHRINK;
  const FIT_PSLIP = k.derive("FIT_PSLIP", p.FIT_SLIP + p.PRINT_OVER + p.PSLIP_GIVE, "params.scad line 31", ["/FIT_SLIP", "/PRINT_OVER", "/PSLIP_GIVE"]);
  const LUG_BORE = k.derive("LUG_BORE", p.ROD_D - p.LUG_GRIP, "params.scad line 113", ["/ROD_D", "/LUG_GRIP"]);
  const LINK_BORE = k.derive("LINK_BORE", p.ROD_D + p.FIT_BORE, "params.scad line 114", ["/ROD_D", "/FIT_BORE"]);
  const CRANK_BORE = k.derive("CRANK_BORE", p.ROD_D + p.FIT_BORE, "params.scad line 154", ["/ROD_D", "/FIT_BORE"]);
  const PIN_PLAY = k.derive("PIN_PLAY", (p.NOTCH_W - T) / 2, "params.scad line 86", ["/NOTCH_W", "/T"]);
  const CAM = k.derive("CAM", (p.PIN_W / 2 + p.LUG_P + PIN_PLAY) - p.SLOT_E, "params.scad line 96", ["/PIN_W", "/LUG_P", "/NOTCH_W", "/T", "/SLOT_E"]);
  const SLOT_X = k.derive("SLOT_X", T + FIT_PSLIP, "params.scad line 91", ["/T", "/FIT_SLIP", "/PRINT_OVER", "/PSLIP_GIVE"]);
  const CAP_FIT = k.derive("CAP_FIT", p.CAP_GIVE + p.PRINT_OVER, "params.scad line 107", ["/CAP_GIVE", "/PRINT_OVER"]);
  const PRINT_GAP = k.derive("PRINT_GAP", p.FIT_SLIDE / 2, "fits.py line 47", ["/FIT_SLIDE"]);
  const PIN_SH_D = k.derive("PIN_SH_D", LINK_BORE - p.FIT_SLIDE, "fits.py line 49", ["/ROD_D", "/FIT_BORE", "/FIT_SLIDE"]);
  const BOSS_D = k.derive("BOSS_D", (T + p.FIT_SLIP) - p.FIT_SLIDE, "fits.py line 50", ["/T", "/FIT_SLIP", "/FIT_SLIDE"]);

  // (what moves in what, hole, shaft, class), fits.py lines 51 to 77 in order.
  const rows: readonly (readonly [string, number, number, string])[] = [
    ["crank shaft in its wall bore", p.SHAFT_D + 2 * PRINT_GAP, p.SHAFT_D, "SLIDE"],
    ["knob on the shaft D", p.SHAFT_D + p.FIT_PRESS, p.SHAFT_D, "PRESS"],
    ["crank drive pin in the yoke slot", T + p.FIT_SLIP, BOSS_D, "SLIDE"],
    ["crank drive pin in the crank bore", CRANK_BORE, CRANK_BORE, "PRESS"],
    ["link turning on its pivot", LINK_BORE, PIN_SH_D, "SLIDE"],
    ["pivot shank in the lug bore", LUG_BORE, PIN_SH_D, "LOCATE"],
    ["pivot barb forced through the lug", LUG_BORE - p.BARB_UNDER, p.BARB_D + p.BARB_OVER, "SNAP"],
    ["printed lug in the cut deck slot", T + FIT_PSLIP, T + p.PRINT_OVER, "PSLIP"],
    ["printed lug, along the deck slot", p.LUG_W + FIT_PSLIP, p.LUG_W + p.PRINT_OVER, "PSLIP"],
    ["printed rod in the cut face slot", SLOT_X, T + p.PRINT_OVER, "PSLIP"],
    ["printed rod in the cut latch slot", SLOT_X, T + p.PRINT_OVER, "PSLIP"],
    ["printed cap in the cut face pocket", p.CAP_D + CAP_FIT + CAM, p.CAP_D + CAM + p.PRINT_OVER, "PSLIP"],
    ["cap pressed on the rod tenon", T + p.FIT_TEN, T, "PRESS"],
    ["latch plate in its rail groove", T + (p.FIT_SLIDE - 4 * SH) + 2 * SH, T - 2 * SH, "SLIDE"],
    ["pull knob on the latch tab", p.LTAB_W + p.FIT_PRESS, p.LTAB_W, "PRESS"],
    ["deck tab in its wall slot", p.TAB_W + p.FIT_LAP + 2 * SH, p.TAB_W - 2 * SH, "LOCATE"],
    ["frame tab in its frame slot", p.TAB_W + p.FIT_LAP + 2 * SH, p.TAB_W - 2 * SH, "LOCATE"],
    ["servo bracket tab in the base", T + p.FIT_LAP + 2 * SH, T - 2 * SH, "LOCATE"],
  ];

  const q = qualify([]);
  const metrics: Metric[] = [
    { id: "fits.model", value: MODEL, ...q, note: "fit model the rows are banded by", gate: "informational", group: "fits" },
  ];
  rows.forEach(([name, hole, shaft, cls], i) => {
    const at = `fits.${String(i + 1).padStart(2, "0")}`;
    metrics.push(
      { id: `${at}.hole`, value: hole, unit: "mm", ...q, note: `${name}: hole`, gate: "informational", group: "fits" },
      { id: `${at}.shaft`, value: shaft, unit: "mm", ...q, note: `${name}: shaft`, gate: "informational", group: "fits" },
      { id: `${at}.drawn`, value: hole - shaft, unit: "mm", ...q, note: name, gate: "CHK-FIT-01", group: "fits" },
      { id: `${at}.class`, value: k.fit(cls), ...q, note: `${name}: fit class`, gate: "informational", group: "fits" },
    );
  });

  const [, bore, shaft] = rows[0]!;
  const ring = k.body("bore", { role: "body", slot: 1, base: { route: "prism", outline: [k.ring.circle(bore / 2 + p.COUPON_WALL), k.ring.circle(bore / 2)], z: [0, T] } });
  const pin = k.body("shaft", { role: "body", slot: 1, base: { route: "prism", outline: [k.ring.circle(shaft / 2)], z: [0, T] } });
  return k.part({
    id: "fits", name: "OGEE R16-P FITS", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: false, carriesOffset: false, pose: "print" },
    bodies: [ring, pin], features: [], metrics, assertions: [],
  });
});
