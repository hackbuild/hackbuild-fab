"""SPINDLE R2, SPINDLE R1 with its 5V to GND short removed (D-249), on the
direct-emit library. A copy of reference/boards/spindle-r1/gen.py, the port
of SPINDLE R1 pcb.py (lineage spindle.pcb/r1, sha256
650351218717462917332d02c7cfb70883ad3a66ffad24b0e2756b90ce8a3176), in
which the four GND vias on the 5V bottom trace are gone and the silk
revision, the drill headers and the zip name read R2. Every other number is the declared value of the pcb.py line named beside it. Same
circuit as the vinyl-cut SPINDLE v5: 1.6 mm FR4, 2 layer, 1 oz, the bottom a
solid GND pour. No R2 board has been fabricated.

Pin map, the DETENT firmware map (pcb.py lines 7 to 10): motor X GPIO 0, 1,
3, 4; motor Y GPIO 5, 6, 7, 10; laser GPIO 20 (GPIO 21 is U0TXD and strobes
the ROM boot log at every reset); spare GPIO 2 and GPIO 21. GPIO 8 and 9
carry no connection on this board.

Run: uv run --project tools/py reference/boards/spindle-r2/gen.py --out <dir> --epoch <s>
Nothing is written unless the DRC passes.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "tools", "py", "board"))

from shapely.geometry import LineString, Polygon, box  # noqa: E402
from shapely.ops import unary_union  # noqa: E402

from direct import hbf_version  # noqa: E402
from direct.drc import drc, report_failure, tightest  # noqa: E402
from direct.excellon import write_excellon  # noqa: E402
from direct.fab import fab_members, write_zip  # noqa: E402
from direct.gerber import write_regions, write_stroke  # noqa: E402
from direct.pad import Board, pad_poly, ring  # noqa: E402
from direct.pour import bottom_pour, net_top, outline_poly  # noqa: E402
from direct.record import StagedOut, args, nets_of, outline_ring, provenance, ring_coords, write_json, write_sources  # noqa: E402
from direct.textpoly import text_geometry  # noqa: E402

PCB = "fab-work-directory:benches/spindle/outputs/spindle/pcb.py"
PCB_DATE = "2026-08-01"  # files (38).zip, the final R1 (spindle record section 1)

# ------------------------------------------------------------------ rules (pcb.py lines 23 to 32)
W, H = 46.0, 46.0
CORNER = 2.0
TRACE = 0.35          # signal
TRACE_PWR = 0.80      # +5V and GND runs
CLR = 0.25            # copper to copper, fab class 2
EDGE_CLR = 0.40
POUR_CLR = 0.35
ANNULAR = 0.30        # ring beyond drill radius
MASK_EXP = 0.05
VIA_D, VIA_PAD = 0.4, 0.8
HOLE_GAP = 0.30       # pcb.py line 274
DRILL_MARGIN = 0.15   # pcb.py line 267
MOUNT_KEEP = 0.5      # pcb.py line 276
THICKNESS = 1.6       # pcb.py line 5

B = Board()
pad, trace, btrace = B.pad, B.trace, B.btrace


def via(n, x, y):
    return B.via(n, x, y, VIA_D, VIA_PAD)


# ------------------------------------------------------- module footprint (pcb.py lines 56 to 89)
ROW_DX, PITCH = 7.62, 2.54
MOD_W, MOD_L = 18.0, 22.52
MCX = 23.0
MCY = H - MOD_L / 2                      # flush with the top edge, USB overhangs
COL_R = ["5V", "GND", "3V3", "GPIO4", "GPIO3", "GPIO2", "GPIO1", "GPIO0"]   # top to bottom
COL_L = ["GPIO5", "GPIO6", "GPIO7", "GPIO8", "GPIO9", "GPIO10", "GPIO20", "GPIO21"]
TOPY = MCY + 3.5 * PITCH


def ypin(i):
    return TOPY - i * PITCH


PY = {}
for i, s in enumerate(COL_R):
    PY[s] = ypin(i)
for i, s in enumerate(COL_L):
    PY[s] = ypin(i)

# Castellated and through-hole hybrid: a pad spanning the castellation at the
# board edge and the 0.6 in hole row inboard of it, drilled on the row.
MP_IN, MP_OUT = 6.30, 11.20            # pad reach either side of centre
MOD_DRILL, MOD_PAD_H = 1.05, 1.60
for s in COL_R + COL_L:
    side = 1 if s in COL_R else -1
    cx = MCX + side * (MP_IN + MP_OUT) / 2
    net = {"5V": "5V_MOD", "GND": "GND"}.get(s, s)
    pad(net, cx, PY[s], MP_OUT - MP_IN, MOD_PAD_H, drill=MOD_DRILL, shape="rect",
        ref="U1", pin=s, hole_dx=side * ROW_DX - (cx - MCX))


def mouter(s):
    side = 1 if s in COL_R else -1
    return (MCX + side * MP_OUT, PY[s])


def minner(s):
    side = 1 if s in COL_R else -1
    return (MCX + side * MP_IN, PY[s])


# ------------------------------------------------------- driver headers (pcb.py lines 91 to 106)
# Header pin order follows the module column order, so every motor phase is a
# short monotonic hop instead of a long diagonal across its neighbours.
XJ1, XJ2 = 40.6, 5.4
J1ORD = ["VCC", "GND", "IN4", "IN3", "IN2", "IN1"]
J2ORD = ["IN1", "IN2", "IN3", "IN4", "GND", "VCC"]
J1Y = [PY["3V3"] - k * PITCH for k in range(6)]
J2Y = [PY["GPIO6"] - k * PITCH for k in range(6)]


def hdr(ref, x, order, ys, netmap, pw=1.70):
    return {nm: pad(netmap[nm], x, ys[k], pw, pw, drill=1.00,
                    shape="rect" if k == 0 else "circle", ref=ref, pin=str(k + 1))
            for k, nm in enumerate(order)}


J1 = hdr("J1", XJ1, J1ORD, J1Y, {"IN1": "GPIO0", "IN2": "GPIO1", "IN3": "GPIO3",
                                 "IN4": "GPIO4", "GND": "GND", "VCC": "5V"})
J2 = hdr("J2", XJ2, J2ORD, J2Y, {"IN1": "GPIO5", "IN2": "GPIO6", "IN3": "GPIO7",
                                 "IN4": "GPIO10", "GND": "GND", "VCC": "5V"})

# ------------------------------------------------------------- channel lanes (pcb.py lines 108 to 115)
# Within a column a lower pin takes the nearer lane, otherwise its horizontal
# escape would cut through a higher pin's vertical.
CH = {"GPIO21": 17.30, "GPIO20": 18.57, "3V3": 24.92, "GPIO2": 27.46}
CH_OUT = MCY - MOD_L / 2 - 1.10
LANE_W = 0.30

# ------------------------------------------------------- expansion header J6 (pcb.py lines 117 to 127)
HY = 8.00
J6ORD = ["IO21", "G1", "G2", "3V3", "IO2", "G3"]
J6NET = {"IO21": "GPIO21", "G1": "GND", "G2": "GND", "3V3": "3V3", "IO2": "GPIO2", "G3": "GND"}
J6 = {nm: pad(J6NET[nm], CH["GPIO21"] + k * PITCH, HY, 1.60, 1.60, drill=1.00,
              shape="rect" if k == 0 else "circle", ref="J6", pin=str(k + 1))
      for k, nm in enumerate(J6ORD)}
# 10k keeps GPIO2 high at reset; GPIO2 is a strapping pin.
R4 = [pad("3V3", 25.10, 17.00, 1.00, 1.40, smd=True, ref="R4", pin="1"),
      pad("GPIO2", 27.00, 17.00, 1.00, 1.40, smd=True, ref="R4", pin="2")]

# ---------------------------------------------------------------- power in (pcb.py lines 129 to 137)
J3 = [pad("5V", 5.00, 13.00, 3.00, 3.00, drill=1.30, shape="rect", ref="J3", pin="1"),
      pad("GND", 10.08, 13.00, 3.00, 3.00, drill=1.30, shape="circle", ref="J3", pin="2")]
J4 = [pad("5V", 5.00, 9.00, 1.70, 1.70, drill=1.00, shape="rect", ref="J4", pin="1"),
      pad("GND", 7.54, 9.00, 1.70, 1.70, drill=1.00, shape="circle", ref="J4", pin="2")]
C2 = [pad("5V", 7.20, 6.80, 1.00, 1.40, smd=True, ref="C2", pin="1"),
      pad("GND", 9.10, 6.80, 1.00, 1.40, smd=True, ref="C2", pin="2")]
C1 = [pad("5V", 5.00, 4.60, 1.70, 1.70, drill=0.90, shape="rect", ref="C1", pin="1"),
      pad("GND", 10.08, 4.60, 1.70, 1.70, drill=0.90, shape="circle", ref="C1", pin="2")]

# ------------------------------------------------------------ laser switch (pcb.py lines 139 to 150)
R2 = [pad("GPIO20", 29.50, 2.50, 1.00, 1.40, smd=True, ref="R2", pin="1"),
      pad("LGATE", 31.40, 2.50, 1.00, 1.40, smd=True, ref="R2", pin="2")]
Q1 = {"G": pad("LGATE", 33.55, 2.90, 1.00, 1.20, smd=True, ref="Q1", pin="1"),
      "S": pad("GND", 35.45, 2.90, 1.00, 1.20, smd=True, ref="Q1", pin="2"),
      "D": pad("LSW", 34.50, 5.10, 1.00, 1.20, smd=True, ref="Q1", pin="3")}
R3 = [pad("LGATE", 32.00, 8.60, 1.00, 1.40, smd=True, ref="R3", pin="1"),
      pad("GND", 32.00, 10.50, 1.00, 1.40, smd=True, ref="R3", pin="2")]
J5 = [pad("5V", 35.10, 12.60, 3.00, 3.00, drill=1.30, shape="rect", ref="J5", pin="1"),
      pad("LSW", 40.18, 12.60, 3.00, 3.00, drill=1.30, shape="circle", ref="J5", pin="2")]
JP1 = [pad("5V_MOD", 36.20, PY["5V"], 1.20, 1.80, smd=True, ref="JP1", pin="1"),
       pad("5V", 37.80, PY["5V"], 1.20, 1.80, smd=True, ref="JP1", pin="2")]

MOUNTS = [(2.60, 2.60), (W - 2.60, 2.60), (2.60, H - 2.60), (W - 2.60, H - 2.60)]
MOUNT_D = 2.70

# ================================================================ routing (pcb.py lines 155 to 209)
for gp, nm in [("GPIO4", "IN4"), ("GPIO3", "IN3"), ("GPIO1", "IN2"), ("GPIO0", "IN1")]:
    trace(gp, [mouter(gp), J1[nm]], TRACE)
for gp, nm in [("GPIO5", "IN1"), ("GPIO6", "IN2"), ("GPIO7", "IN3"), ("GPIO10", "IN4")]:
    trace(gp, [mouter(gp), J2[nm]], TRACE)

for s_, lane in CH.items():
    trace(s_, [minner(s_), (lane, PY[s_]), (lane, CH_OUT)], LANE_W)
for s_, nm in [("GPIO21", "IO21"), ("3V3", "3V3"), ("GPIO2", "IO2")]:
    trace(s_, [(CH[s_], CH_OUT), J6[nm]], LANE_W)
trace("3V3", [(CH["3V3"], 17.00), R4[0]], LANE_W)
trace("GPIO2", [(CH["GPIO2"], 17.00), R4[1]], LANE_W)

# laser gate: GPIO20 slips between J6 pins 1 and 2 and runs along the bottom
trace("GPIO20", [(CH["GPIO20"], CH_OUT), (CH["GPIO20"], 2.50), R2[0]], LANE_W)
trace("LGATE", [R2[1], Q1["G"]], TRACE)
trace("LGATE", [R2[1], (R2[1][0], R3[0][1]), R3[0]], TRACE)
trace("LSW", [Q1["D"], (Q1["D"][0], 9.00), (J5[1][0], 9.00), J5[1]], TRACE_PWR)

# +5V: left cluster on top, one wide hop across on layer 2, right cluster on top
trace("5V", [J3[0], C1[0]], TRACE_PWR)
trace("5V", [(J3[0][0], 6.80), C2[0]], TRACE_PWR)
trace("5V", [J3[0], (2.40, J3[0][1]), (2.40, J2["VCC"][1]), J2["VCC"]], TRACE_PWR)
v5L = via("5V", 2.40, 20.00)
v5R = via("5V", 43.60, 20.00)
btrace("5V", [v5L, v5R], TRACE_PWR)
trace("5V", [v5R, (43.60, J1["VCC"][1]), J1["VCC"]], TRACE_PWR)
trace("5V", [(43.60, 16.20), (J5[0][0], 16.20), J5[0]], TRACE_PWR)
trace("5V", [v5R, (43.60, 16.20)], TRACE_PWR)
trace("5V", [J1["VCC"], (40.60, 41.00), (JP1[1][0], 41.00), JP1[1]], TRACE_PWR)
trace("5V_MOD", [mouter("5V"), JP1[0]], TRACE_PWR)

# GND: short stubs into vias, the bottom pour carries it
trace("GND", [mouter("GND"), J1["GND"]], TRACE_PWR)
trace("GND", [J3[1], C1[1]], TRACE_PWR)
trace("GND", [(J3[1][0], 6.80), C2[1]], TRACE_PWR)
trace("GND", [J4[1], (J3[1][0], J4[1][1])], TRACE_PWR)
# R2 drops the four GND vias at (36.20, 20.00), (9.80, 20.00), (16.00, 20.00)
# and (30.60, 20.00) of pcb.py lines 197 to 199. They sit on the 5V bottom
# trace at y 20.00 and short it to GND (D-249); no GND stub ends at any of
# them, so the other nine, each the end of a stub, carry every GND joint the
# pour makes. Nothing else moves.
gv = [(2.40, 32.00), (42.20, 34.00), (12.80, 13.00), (12.80, 4.60), (19.84, 4.60),
      (22.38, 4.60), (30.00, 4.60), (35.45, 0.90), (32.00, 12.00)]
for x, y in gv:
    via("GND", x, y)
trace("GND", [J2["GND"], (2.40, J2["GND"][1]), (2.40, 32.00)], TRACE_PWR)
trace("GND", [J1["GND"], (42.20, J1["GND"][1]), (42.20, 34.00)], TRACE_PWR)
trace("GND", [J3[1], (12.80, 13.00)], TRACE_PWR)
trace("GND", [C1[1], (12.80, 4.60)], TRACE_PWR)
trace("GND", [J6["G1"], (19.84, 4.60)], LANE_W)
trace("GND", [J6["G2"], (22.38, 4.60)], LANE_W)
trace("GND", [J6["G3"], (30.00, 4.60)], LANE_W)
trace("GND", [Q1["S"], (35.45, 0.90)], TRACE)
trace("GND", [R3[1], (32.00, 12.00)], TRACE)

# ============================================================== geometry (pcb.py lines 211 to 244)
OUTLINE = outline_poly(W, H, CORNER)
TOPG = {n: net_top(B, n) for n in B.nets}
POUR = outline_poly(W, H, CORNER, EDGE_CLR)
# Keep the pour out from under the ceramic antenna only, not the whole module.
ANT_KEEP = box(MCX - 4.6, MCY - MOD_L / 2 - 0.4, MCX + 4.6, MCY - MOD_L / 2 + 5.6)
BOT = bottom_pour(B, POUR, "GND", POUR_CLR, ANNULAR, ANT_KEEP)

# ================================================================== DRC (pcb.py lines 246 to 288)
RULES = dict(clr=CLR, edge_clr=EDGE_CLR, hole_gap=HOLE_GAP, drill_margin=DRILL_MARGIN, mount_keep=MOUNT_KEEP)
fail = drc(B, TOPG, OUTLINE, POUR, "GND", MOUNTS, MOUNT_D, ANNULAR, RULES)
if fail:
    print(report_failure(fail))
    sys.exit(1)
WORST = tightest(TOPG)
DRILLS = B.drills()
DRC_LINE = (f"DRC OK  {len(B.nets)} nets | {len(B.pads)} pads | {len(DRILLS)} holes | "
            f"tightest {WORST:.2f}mm (rule {CLR}) | {W:.0f}x{H:.0f}mm")

# ---- silkscreen, text outlined so no font is needed downstream (pcb.py lines 347 to 432)
FONT = ("mono", 700)   # IBM Plex Mono Bold, pcb.py line 348
ANCHOR = {"start": "left", "middle": "center", "end": "right"}
silk = []
SILK_TEXT, SILK_LINES = [], []      # kept as real objects for the KiCad export


def sl(txt, x, y, size=1.0, anchor="start"):
    SILK_TEXT.append((txt, x, y, size, anchor))
    g = text_geometry(txt, FONT[0], FONT[1], size, x, y, ANCHOR[anchor], valign="baseline")
    if g is not None:
        silk.append(g)


def sline(pts, w=0.15):
    SILK_LINES.append(([tuple(p) for p in pts], w))
    silk.append(LineString(pts).buffer(w / 2, cap_style=2))


def sbox(x0, y0, x1, y1, w=0.15):
    sline([(x0, y0), (x1, y0), (x1, y1), (x0, y1), (x0, y0)], w)


sbox(MCX - MOD_W / 2, MCY - MOD_L / 2, MCX + MOD_W / 2, H - 0.2)
sl("USB", MCX, H - 2.4, 1.2, "middle")
sl("SPINDLE", 2.6, 21.6, 2.0)
sl("R2  hack.build", 2.6, 19.2, 1.1)   # pcb.py line 410 reads R1
for s_ in COL_R:
    sl(s_, MCX + MP_OUT + 0.6, PY[s_] - 0.45, 0.95)
for s_ in COL_L:
    sl(s_, MCX - MP_OUT - 0.6, PY[s_] - 0.45, 0.95, "end")
for k, nm in enumerate(J1ORD):
    sl(nm, XJ1 + 1.5, J1Y[k] - 0.45, 0.95)
for k, nm in enumerate(J2ORD):
    sl(nm, XJ2 - 1.5, J2Y[k] - 0.45, 0.95, "end")
sl("J1 MOTOR X", XJ1 + 1.5, J1Y[0] + 1.7, 1.05)
sl("J2 MOTOR Y", XJ2 - 1.5, J2Y[0] + 1.7, 1.05, "end")
sl("J3 +5V IN", 2.6, 15.6, 1.05)
sl("+", J3[0][0] - 0.4, 15.6, 1.0)
sl("-", J3[1][0] - 0.3, 15.6, 1.0)
sl("J4", J4[0][0] - 1.9, J4[0][1] - 0.45, 0.95)
sl("C1", 6.4, 2.6, 0.95)
sl("C2", 7.2, 8.3, 0.85)
sl("J5 LASER", 34.0, 15.6, 1.05)
sl("+5V", J5[0][0] - 1.6, 10.2, 0.85)
sl("SW", J5[1][0] - 1.0, 10.2, 0.85)
sl("Q1", 36.8, 4.4, 0.85)
sl("R2", 29.4, 4.2, 0.85)
sl("R3", 33.2, 9.2, 0.85)
sl("R4", 25.4, 18.6, 0.85)
for k, nm in enumerate(J6ORD):
    lbl = {"G1": "G", "G2": "G", "G3": "G", "IO21": "21", "IO2": "2"}.get(nm, nm)
    sl(lbl, CH["GPIO21"] + k * PITCH, 9.9, 0.9, "middle")
sl("J6 EXPANSION", CH["GPIO21"] - 0.8, 12.0, 1.05)
sl("JP1", JP1[0][0] - 0.6, PY["5V"] - 2.4, 0.85)

TOP = unary_union(list(TOPG.values()))
SMDS = [p for p in B.pads if p["smd"]]
MASK_T = unary_union([pad_poly(p, MASK_EXP) for p in B.pads if not p["net"].startswith("__")])
MASK_B = unary_union([ring(p, ANNULAR).buffer(MASK_EXP) for p in B.pads if p["drill"]])
PASTE = unary_union([pad_poly(p) for p in SMDS]) if SMDS else Polygon()
SILK = unary_union([g for g in silk if g is not None and not g.is_empty]).difference(MASK_T)

# ---- BOM rows (pcb.py lines 453 to 485): designator, value, purpose, qty, MPN. The record
# carries value, purpose (note) and MPN; packages/board writes the BOM, CPL and netlist from it
# (M08-T12), the one implementation of each.
BOM = [
    ("U1", "ESP32-C3 SuperMini", "hybrid pad: castellated edge OR 0.6in through-hole", "1", ""),
    ("J1", "1x06 2.54 mm header", "motor X to its ULN2003 board", "1", ""),
    ("J2", "1x06 2.54 mm header", "motor Y to its ULN2003 board", "1", ""),
    ("J3", "2 pos 5.08 mm screw terminal", "+5V in", "1", ""),
    ("J4", "1x02 2.54 mm header", "+5V in, parallel with J3", "1", ""),
    ("J5", "2 pos 5.08 mm screw terminal", "laser out: +5V and switched low side", "1", ""),
    ("J6", "1x06 2.54 mm header", "expansion: 21 G G 3V3 2 G", "1", ""),
    ("Q1", "AO3400A", "SOT-23 logic level N-ch MOSFET, laser low side", "1", "AO3400A"),
    ("R2", "100R 0805", "gate series resistor", "1", ""),
    ("R3", "100k 0805", "gate pulldown, holds the laser off through reset", "1", ""),
    ("R4", "10k 0805", "holds GPIO2 high at reset; GPIO2 is a strapping pin", "1", ""),
    ("C1", "220uF 10V electrolytic", "5.08 mm pitch, motor bulk", "1", ""),
    ("C2", "100nF 0805", "rail decoupling", "1", ""),
    ("JP1", "solder jumper", "open: module on USB. bridged: module on J3", "1", ""),
]
# KiCad footprint names of kicad_out.py lines 83 to 98: the catalog ids the record names.
FOOTPRINT = {
    "U1": "MODULE_SuperMini", "J1": "PinHeader_1x06_P2.54mm_Vertical", "J2": "PinHeader_1x06_P2.54mm_Vertical",
    "J3": "TerminalBlock_P5.08mm_2pol", "J4": "PinHeader_1x02_P2.54mm_Vertical", "J5": "TerminalBlock_P5.08mm_2pol",
    "J6": "PinHeader_1x06_P2.54mm_Vertical", "Q1": "SOT-23", "R2": "R_0805_2012Metric", "R3": "R_0805_2012Metric",
    "R4": "R_0805_2012Metric", "C1": "CP_Radial_D6.3mm_P5.08mm", "C2": "C_0805_2012Metric", "JP1": "SolderJumper_2_Open",
}
# pcb.py lines where each part's pads are typed by hand.
PAD_LINES = {
    "U1": "56 to 89", "J1": "94 to 106", "J2": "94 to 106", "J6": "117 to 123", "R4": "126 to 127",
    "J3": "130 to 131", "J4": "132 to 133", "C2": "134 to 135", "C1": "136 to 137", "R2": "140 to 141",
    "Q1": "142 to 144", "R3": "145 to 146", "J5": "147 to 148", "JP1": "149 to 150",
}

byref = {}
for p in B.pads:
    if p["ref"]:
        byref.setdefault(p["ref"], []).append(p)


# ---- the record (spec/board-features.ts BoardRecord)
def pad_bbox(ps):
    xs0 = [q["x"] - q["w"] / 2 for q in ps]
    xs1 = [q["x"] + q["w"] / 2 for q in ps]
    ys0 = [q["y"] - q["h"] / 2 for q in ps]
    ys1 = [q["y"] + q["h"] / 2 for q in ps]
    return min(xs0), min(ys0), max(xs1), max(ys1)


def record():
    pads = []
    for p in B.pads:
        if p["is_via"]:
            continue
        r = {"ref": p["ref"], "pin": p["pin"], "net": p["net"], "side": "top", "through": bool(p["drill"]),
             "shape": p["shape"], "x": p["x"], "y": p["y"], "w": p["w"], "h": p["h"], "rot": 0}
        if p["drill"]:
            r["drill"] = p["drill"]
            if abs(p["hole_dx"]) > 1e-9:
                r["holeDx"] = p["hole_dx"]
        pads.append(r)
    parts, reads = [], []
    src = lambda lines: f"{PCB} lines {lines}"  # noqa: E731
    for ref, ps in byref.items():
        cid = f"kicad:{FOOTPRINT[ref]}" if ref != "U1" else "esp32c3-supermini"
        if ref == "U1":
            # The module body: 18 x 22.52 mm at (MCX, MCY), pcb.py lines 58 to 60. Height is not declared.
            x, y, bw, bh = MCX, MCY, MOD_W, MOD_L
            body_src = src("58 to 60")
        else:
            # pcb.py declares no body for this part: the envelope is the pad bounding box.
            x0, y0, x1, y1 = pad_bbox(ps)
            x, y, bw, bh = (x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0
            body_src = src(PAD_LINES[ref]) + ", pad bounding box, no body declared"
        row = next(r for r in BOM if r[0] == ref)
        part = {"ref": ref, "value": row[1], "catalogId": cid, "tier": "inferred", "side": "top",
                "x": x, "y": y, "rot": 0, "body": {"w": bw, "h": bh, "z": 0}, "note": row[2]}
        if row[4]:
            part["mpn"] = row[4]
        parts.append(part)
        reads.append({"catalogId": cid, "field": f"{ref}.pads", "provenance": provenance("inferred", "derived", PCB_DATE, src(PAD_LINES[ref]))})
        reads.append({"catalogId": cid, "field": f"{ref}.body", "provenance": provenance("inferred", "derived", PCB_DATE, body_src + "; height not declared")})
    vias = [{"net": p["net"], "x": p["x"], "y": p["y"], "drill": p["drill"], "pad": p["w"], "layers": ["F.Cu", "B.Cu"]}
            for p in B.pads if p["is_via"]]
    tracks = [{"net": n, "layer": "F.Cu", "width": w, "pts": [list(q) for q in pts]}
              for n in B.nets for pts, w in B.nets[n]["traces"]]
    tracks += [{"net": n, "layer": "B.Cu", "width": w, "pts": [list(q) for q in pts]} for n, pts, w in B.bot_traces]
    holes = [{"x": x, "y": y, "drill": MOUNT_D, "plated": False, "role": "mount"} for x, y in MOUNTS]
    # JP1 open: module on USB, bridged: module on J3 (pcb.py line 468; D-088 default normally open).
    jumpers = [{"ref": "JP1", "pads": ["JP1.1", "JP1.2"], "default": "open", "joins": ["5V", "5V_MOD"]}]
    nets = nets_of(pads)
    names = {n["name"] for n in nets}
    missing = sorted(set(B.nets) - names)
    if missing:
        raise SystemExit(f"nets with no component pad: {missing}")
    return {"schema": 1, "backend": "direct",
            "board": {"outline": outline_ring(OUTLINE), "thickness": THICKNESS, "copperLayers": 2},
            "parts": parts, "pads": pads, "nets": nets, "vias": vias, "holes": holes, "tracks": tracks,
            "jumpers": jumpers, "bridges": [], "reads": reads,
            # The GND pour on B.Cu before clearance and the antenna keepout (pcb.py lines 225 to 228), for the island check.
            "zones": [{"net": "GND", "layer": "B.Cu", "clearance": POUR_CLR, "outline": ring_coords(POUR)}],
            "keepouts": [{"id": "antenna.u1", "kind": "antenna", "layers": ["B.Cu"], "outline": ring_coords(ANT_KEEP),
                          "forbids": ["pour"], "module": "esp32c3-supermini"}],
            "silk": [{"side": "top", "text": t, "x": x, "y": y, "size": sz, "anchor": an, "rot": 0, "mirror": False,
                      "font": "ibm-plex-mono-latin-700-normal"} for t, x, y, sz, an in SILK_TEXT]}


def main():
    a = args("SPINDLE R2 direct-emit generator")
    ver = hbf_version()
    out = StagedOut(a.out)
    out.open()
    write_regions(out.path("spindle-F_Cu.gbr"), TOP, "Copper,L1,Top", a.epoch, ver)
    write_regions(out.path("spindle-B_Cu.gbr"), BOT, "Copper,L2,Bot", a.epoch, ver)
    write_regions(out.path("spindle-F_Mask.gbr"), MASK_T, "Soldermask,Top", a.epoch, ver)
    write_regions(out.path("spindle-B_Mask.gbr"), MASK_B, "Soldermask,Bot", a.epoch, ver)
    write_regions(out.path("spindle-F_Paste.gbr"), PASTE, "Paste,Top", a.epoch, ver)
    write_regions(out.path("spindle-F_Silkscreen.gbr"), SILK, "Legend,Top", a.epoch, ver)
    write_stroke(out.path("spindle-Edge_Cuts.gbr"), OUTLINE.exterior, "Profile,NP", a.epoch, ver)
    write_excellon(out.path("spindle-PTH.drl"), DRILLS, True, "SPINDLE R2")
    write_excellon(out.path("spindle-NPTH.drl"), [(x, y, MOUNT_D) for x, y in MOUNTS], False, "SPINDLE R2")
    write_zip(out.path("spindle-r2-gerbers.zip"), fab_members(out.dir), a.epoch)
    # The geometry each region layer was written from, for the reparse's vector and raster compare (M08-T07).
    write_sources(out.path("source"), {"F_Cu": TOP, "B_Cu": BOT, "F_Mask": MASK_T, "B_Mask": MASK_B,
                                       "F_Paste": PASTE, "F_Silkscreen": SILK})
    write_json(out.path("record.json"), record())
    write_json(out.path("gates.json"), {
        "line": DRC_LINE, "nets": len(B.nets), "pads": len(B.pads), "holes": len(DRILLS),
        "tightest": round(WORST, 6), "rule": CLR, "w": W, "h": H,
        "silkLines": [{"pts": [list(q) for q in pts], "w": w} for pts, w in SILK_LINES],
        "corner": CORNER,
        "maskExpansion": MASK_EXP,
        "mounts": [[x, y, MOUNT_D] for x, y in MOUNTS],
    })
    out.commit()
    print(DRC_LINE)


if __name__ == "__main__":
    main()
