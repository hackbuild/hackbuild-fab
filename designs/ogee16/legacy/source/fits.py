"""Every mating fit in the printed build, checked against what a 0.4mm nozzle
actually produces rather than against what was drawn.

A 0.4 nozzle does not print the number you typed. Holes and slots come out
UNDERSIZE by roughly 0.15 because inside corners get overfilled, and outside
features come out OVERSIZE by roughly 0.10. So about 0.25 of any drawn clearance
is gone before the parts ever meet, and a "0.2mm clearance" hole is an
interference fit.

Three classes, and every fit in the machine is one of them:

  SLIDE   moves against its mate every actuation. Wants 0.25-0.40 left after
          the loss, so 0.50-0.65 drawn.
  LOCATE  goes together by hand and stays put. Wants 0.00-0.15 left, so
          0.25-0.40 drawn.
  PRESS   must not come apart. Wants a small interference, so 0.05-0.15 drawn:
          the hole shrinking is what does the gripping.

Run this after touching any clearance.
"""
import math, os, sys
import kin
from kin import P

LOSS = 0.25
# a laser slot taking a printed part loses the printed part's oversize instead of
# the slot's underside, so it gets its own band
# PSLIDE numbers are ALREADY the real clearance, because the printed part's
# oversize is put into its own dimension rather than taken off the slot, so the
# band is on the real gap and the loss column does not apply
# a BARB is not a press. It is deliberately forced through a hole it does not fit,
# swaging the bore on the way, and the ledge left behind is the whole point.
# The band is wide because what makes a big interference workable is the LEAD-IN,
# not the interference itself: a long shallow cone wedges its way in where a short
# steep one just stops. This one opens from 1.6 to 3.8 over 3.0mm.
# bands moved up 0.20 after [stated] "they still feel tight". In band on paper is
# not the same as loose enough in the hand, and the hand wins.
BAND = {"SLIDE":  (0.70, 0.90), "PSLIDE": (0.45, 0.70), "SNAP": (-1.30, -0.15),
        "LOCATE": (0.25, 0.40),
        "PRESS":  (0.00, 0.16)}

# printed.scad's own constants, which are not in params.scad
# these mirror printed.scad. HARDCODING THEM MEANT THE TABLE REPORTED 0.55 AFTER
# I had already raised FIT_SLIDE to 0.75: an audit that keeps its own copy of the
# numbers it is auditing is not an audit. Derived where possible.
FIT_SLIDE_ = 0.75
PR = dict(PRINT_GAP=FIT_SLIDE_/2, PRINT_SHRINK=0.05, FIT_SLIDE=FIT_SLIDE_, FIT_LOCATE=0.30,
          FIT_PRESS=0.10, SHAFT_D=8.0, SHAFT_FLAT=6.4, LTAB_W=8.0,
          PIN_SH_D=P["LINK_BORE"]-FIT_SLIDE_, PIN_BARB_D=P["LUG_BORE"],
          BOSS_D=(P["T"]+P["FIT_SLIP"])-FIT_SLIDE_)
T=P["T"]; SH=PR["PRINT_SHRINK"]

FITS = [
 # (what moves in what, hole, shaft, class)
 ("crank shaft in its wall bore",        PR["SHAFT_D"]+2*PR["PRINT_GAP"], PR["SHAFT_D"], "SLIDE"),
 ("knob on the shaft D",                 PR["SHAFT_D"]+PR["FIT_PRESS"],   PR["SHAFT_D"], "PRESS"),
 ("crank drive pin in the yoke slot",    T+P["FIT_SLIP"],                 PR["BOSS_D"],  "SLIDE"),
 ("crank drive pin in the crank bore",   P["CRANK_BORE"],                 P["CRANK_BORE"],"PRESS"),
 ("link turning on its pivot",           P["LINK_BORE"],                  PR["PIN_SH_D"],"SLIDE"),
 ("pivot shank in the lug bore",         P["LUG_BORE"],                   PR["PIN_SH_D"],"LOCATE"),
 # the barb is drawn the same as the hole; the printer's bias makes the fit
 ("pivot barb forced through the lug",   P["LUG_BORE"]-0.15,              3.8+0.10,      "SNAP"),
 # these four are LASER slots taking PRINTED parts. The slot lands on its drawn
 # size after kerf compensation; the printed part comes out PRINT_OVER big.
 ("printed lug in the cut deck slot",    T+P["FIT_PSLIP"],                T+P["PRINT_OVER"], "PSLIDE"),
 ("printed lug, along the deck slot",    P["LUG_W"]+P["FIT_PSLIP"],       P["LUG_W"]+P["PRINT_OVER"], "PSLIDE"),
 ("printed rod in the cut face slot",    P["SLOT_X"],                     T+P["PRINT_OVER"], "PSLIDE"),
 ("printed rod in the cut latch slot",   P["SLOT_X"],                     T+P["PRINT_OVER"], "PSLIDE"),
 ("printed cap in the cut face pocket",  P["CAP_D"]+P["CAP_FIT"]+P["CAM"],
                                         P["CAP_D"]+P["CAM"]+P["PRINT_OVER"], "PSLIDE"),
 ("cap pressed on the rod tenon",        T+P["FIT_TEN"],                  T,             "PRESS"),
 ("latch plate in its rail groove",      T+(PR["FIT_SLIDE"]-4*SH)+2*SH,   T-2*SH,        "SLIDE"),
 ("pull knob on the latch tab",          PR["LTAB_W"]+PR["FIT_PRESS"],    PR["LTAB_W"],  "PRESS"),
 ("deck tab in its wall slot",           P["TAB_W"]+P["FIT_LAP"]+2*SH,    P["TAB_W"]-2*SH,"LOCATE"),
 ("frame tab in its frame slot",         P["TAB_W"]+P["FIT_LAP"]+2*SH,    P["TAB_W"]-2*SH,"LOCATE"),
 ("servo bracket tab in the base",       T+P["FIT_LAP"]+2*SH,             T-2*SH,        "LOCATE"),
]

def main():
    print(f"{'fit':38s} {'drawn':>7s} {'after 0.25 loss':>16s}  class   verdict")
    bad = []
    for name, hole, shaft, cls in FITS:
        drawn = hole - shaft
        lo, hi = BAND[cls]
        ok = lo - 1e-9 <= drawn <= hi + 1e-9
        if not ok: bad.append((name, drawn, cls, lo, hi))
        after = drawn if cls in ("PSLIDE", "SNAP") else drawn - LOSS
        print(f"{name:38s} {drawn:7.2f} {after:16.2f}  {cls:6s}  "
              f"{'ok' if ok else 'OUT OF BAND ' + f'({lo:.2f}-{hi:.2f})'}")
    # the snap pin's closure check is gone with the snap pin: a solid pressed pin
    # has no legs to flex, which is exactly why it replaced the split one
    print("\n" + ("ALL FITS IN BAND" if not bad else f"{len(bad)} OUT OF BAND"))
    for b in bad: print("   !", b[0], f"{b[1]:.2f} wants {b[3]:.2f}-{b[4]:.2f}")
    return 1 if bad else 0

if __name__ == "__main__":
    sys.exit(main())
