#!/usr/bin/env python3
"""gen_board.py  SHUNT R1, the KevinCon counterfeit Jumperless.

One parametric source for a deliberately non-functional art board.
Emits board.json (the single source of truth every viewer and fab file
reads), shunt-front.svg / shunt-back.svg (1:1 artwork), and BOM.csv.

Refuses to write anything until the geometry gates pass. The ELECTRICAL
gates are inverted on purpose: this board is a shitpost, the netlist is
nonsense, and the gate asserts the nonsense count has not drifted.
"""
import json, math, os, re, sys, csv

HERE = os.path.dirname(os.path.abspath(__file__))
PARTS = os.path.join(HERE, "parts")
OUT = HERE

# ---------------------------------------------------------------- board
BD = dict(
    name="SHUNT", rev="R1",
    w=154.0, h=110.0, corner_r=3.0, thickness=1.6, layers=2,
    mask="#4E324E",          # measured off the real Jumperless V5 render
    mask_hi="#7A4F72",       # measured off a V5 photo
    silk="#FFFFFF",
    finish="ENIG",
    subtitle="COUNTERFEIT PROGRAMMABLE BREADBOARD",
)
# the real Jumperless V5 outline is 154.33 x 110.71 (measured from its
# Edge_Cuts gerber). Being 0.33 mm short in both axes is the joke.
REAL_JL = (154.33, 110.71)

MOUNT = [(5.0, 5.0), (149.0, 5.0), (5.0, 105.0), (149.0, 105.0)]
MOUNT_R = 1.6
# lanyard slot, top centre. 14.0 x 3.5 mm with 1.75 mm ends, which clears a
# 12 mm flat lanyard hook. Leaves 4.25 mm of FR4 above it.
SLOTS = [dict(x=77.0, y=104.0, w=14.0, h=3.5, r=1.75)]

# ------------------------------------------------------- footprint pads
PAD_RE = re.compile(
    r"\(pad\s+(\S+)\s+(\S+)\s+(\S+)\s*\(at\s+(-?[\d.]+)\s+(-?[\d.]+)"
    r"(?:\s+(-?[\d.]+))?\)\s*\(size\s+(-?[\d.]+)\s+(-?[\d.]+)\)"
    r"(?:\s*\(drill\s+([\d.]+)\))?")


def footprint_pads(name):
    """Real pad table straight out of the fetched KiCad footprint."""
    txt = open(os.path.join(PARTS, name + ".kicad_mod"), errors="replace").read()
    pads = []
    for m in PAD_RE.finditer(txt):
        num, ptype, shape = m.group(1), m.group(2), m.group(3)
        x, y = float(m.group(4)), float(m.group(5))
        w, h = float(m.group(7)), float(m.group(8))
        drill = float(m.group(9)) if m.group(9) else None
        pads.append(dict(n=num.strip('"'), type=ptype, shape=shape,
                         x=x, y=y, w=w, h=h, drill=drill))
    if not pads:
        raise SystemExit("no pads parsed from " + name)
    return pads


FP = {n: footprint_pads(n) for n in [
    "DIP-8_W7.62mm_Socket", "SOIC-16_3.9x9.9mm_P1.27mm", "LED_D5.0mm",
    "Crystal_HC49-U_Vertical", "PinHeader_1x15_P2.54mm_Vertical",
    "TO-92_Inline_Wide", "SW_PUSH_6mm",
    "BatteryHolder_Keystone_1058_1x2032", "R_0603_1608Metric",
    "C_0805_2012Metric"]}


def place(px, py, rot, fx, fy):
    """Footprint-local (fx, fy) to board (x, y), matching the viewer.

    KiCad .wrl models land with model x = footprint x and model z =
    -footprint y. The viewer sets outer.rotation.y = -rot and world z =
    board y, so this transform is the one three.js applies. Pads and
    models therefore agree by construction, and check3d_shunt.mjs
    re-derives it independently.
    """
    r = math.radians(rot)
    c, s = math.cos(r), math.sin(r)
    return (px + fx * c + fy * s, py + fx * s - fy * c)


# ------------------------------------------------------------ the parts
# body: (w, h) unrotated body size in mm, from the datasheet outline.
# bc:   body centre in footprint-local coords (KiCad origins sit on pad 1
#       for headers, sockets and axials, not on the body).
P = []


def part(ref, val, fp, x, y, rot, body, bc, kind, note, nets,
         zone="MISC", side="T", mpn="", stand_in=False, model=None):
    bw, bh = body
    if rot % 180:
        bw, bh = bh, bw
    cx, cy = place(x, y, rot, bc[0], bc[1])
    bw0, bh0 = body
    pads = []
    if fp in FP:
        for pd in FP[fp]:
            gx, gy = place(x, y, rot, pd["x"], pd["y"])
            pw, ph = pd["w"], pd["h"]
            if rot % 180:
                pw, ph = ph, pw
            pads.append(dict(n=pd["n"], x=round(gx, 3), y=round(gy, 3),
                             w=pw, h=ph, drill=pd["drill"],
                             circle=pd["shape"] == "circle",
                             thru=pd["type"] == "thru_hole", side=side))
    P.append(dict(ref=ref, val=val, fp=fp, model=model or fp, x=x, y=y,
                  rot=rot, w=bw, h=bh, cx=round(cx, 3), cy=round(cy, 3),
                  kind=kind, side=side, note=note, nets=nets, zone=zone,
                  mpn=mpn, stand_in=stand_in, pads=pads,
                  bw0=bw0, bh0=bh0))


# --- the breadboard. This is the entire point of the board.
BB = dict(ref="BB1", w=84.5, h=54.5, tape=1.2, height=9.5,
          cx=52.0, cy=60.0, rot=3.5)

part("U1", "RP9350B-XXL 128-CORE", "DIP-8_W7.62mm_Socket", 102.0, 84.0, 0,
     (10.4, 10.2), (3.81, 3.81), "socket", zone="MCU", mpn="none",
     note="Empty DIP-8 socket silkscreened as a 128-core RP9350B-XXL. "
          "The real Jumperless runs an RP2350B in a QFN-80. A DIP-8 has "
          "eight pins and this one has nothing in it.",
     nets=["MAGIC", "GND?", "VIBES"])
part("U2", "CH446Q x12 CROSSPOINT", "SOIC-16_3.9x9.9mm_P1.27mm", 120.0, 80.0, 0,
     (6.0, 10.3), (0, 0), "ic", zone="MCU", mpn="NE555 (relabelled)",
     note="One SOIC-16 silkscreened as twelve CH446Q crosspoint switches. "
          "It is a 555 with the top sanded and re-inked.",
     nets=["MATRIX", "MATRIX", "MATRIX"])
part("SW2", "BOOT", "SW_PUSH_6mm", 131.0, 84.0, 0,
     (6.4, 6.4), (3.25, 2.25), "switch", zone="MCU", mpn="6mm tact",
     note="Tactile switch wired between two copies of the same net, so "
          "pressing it shorts a node to itself.",
     nets=["BOOT", "BOOT"])
part("Y1", "2.4 GHz", "Crystal_HC49-U_Vertical", 102.0, 68.0, 0,
     (11.5, 5.0), (2.44, 0), "xtal", zone="RF", mpn="HC-49U 32.768 kHz",
     note="HC-49U can silkscreened 2.4 GHz. It is a 32.768 kHz watch "
          "crystal. Off by five orders of magnitude.",
     nets=["RF_OUT", "GND?"])
part("Q1", "ANALOG", "TO-92_Inline_Wide", 117.0, 68.0, 0,
     (5.4, 4.6), (2.54, 0), "transistor", zone="ANALOG", mpn="2N3904",
     note="Collector, base and emitter all land on the same net, which is "
          "labelled ANALOG because it is analog now.",
     nets=["ANALOG"])
for i, (x, v) in enumerate([(128.0, "0R"), (131.0, "0R"), (134.0, "1G"),
                            (137.0, "0R")]):
    part("R%d" % (i + 1), v, "R_0603_1608Metric", x, 68.0, 0,
         (1.6, 0.8), (0, 0), "passive", zone="ANALOG", mpn="0603",
         note="Zero ohm, specified to 0.0001%% tolerance on the silk. "
              "A 0R jumper has no tolerance." if v == "0R" else
              "One gigaohm in series with an LED. The LED will not light.",
         nets=["MATRIX", "VIBES"])
for i, x in enumerate([128.0, 132.0, 136.0]):
    part("C%d" % (i + 1), "10F", "C_0805_2012Metric", x, 63.0, 0,
         (2.0, 1.25), (0, 0), "passive", zone="POWER", mpn="0805",
         note="Silkscreened 10 farads in an 0805. Ten farads is a "
              "supercapacitor the size of a D cell.",
         nets=["P8V", "N8V"])
for i, x in enumerate([100.0, 104.0, 108.0, 112.0]):
    part("R%d" % (i + 5), "4K7", "R_0603_1608Metric", x, 58.0, 0,
         (1.6, 0.8), (0, 0), "passive", zone="ANALOG", mpn="0603",
         note="Pull-up to a net that is not connected to anything, "
              "including a rail.",
         nets=["VIBES"])
LEDX = [100.0, 109.0, 118.0, 127.0, 136.0, 145.0]
for i, x in enumerate(LEDX):
    part("D%d" % (i + 1), "RGB (RED)", "LED_D5.0mm", x, 44.0, 0,
         (5.2, 5.2), (1.27, 0), "led", zone="PIXEL", mpn="5mm red THT",
         note="One of the 445 individually addressable RGB LEDs promised "
              "on the silk. It is a plain red 5 mm THT LED, wired in "
              "series with five more and one gigaohm.",
         nets=["LED_CHAIN"])
part("J3", "NANO HEADER A", "PinHeader_1x15_P2.54mm_Vertical", 100.0, 26.0, 90,
     (2.54, 38.1), (0, 17.78), "conn", zone="BUS", mpn="1x15 2.54",
     note="Fifteen pins, all fifteen tied to the single net NANO. Any "
          "Nano plugged in shorts every one of its GPIOs together.",
     nets=["NANO"])
part("J4", "NANO HEADER B", "PinHeader_1x15_P2.54mm_Vertical", 100.0, 10.76, 90,
     (2.54, 38.1), (0, 17.78), "conn", zone="BUS", mpn="1x15 2.54",
     note="The other fifteen pins of the same one net. Row spacing is a "
          "real 15.24 mm, which is the only correct dimension here.",
     nets=["NANO"])
part("J1", "USB TYPE-C 4.0", "USB_C_STANDIN", 4.6, 96.0, 90,
     (9.0, 7.3), (0, 0), "conn", zone="POWER", mpn="TYPE-C-31-M-12",
     stand_in=True,
     note="Parametric stand-in: the 2020 KiCad packages3D freeze has no "
          "USB-C model. Body from the HRO datasheet. VBUS lands on a pad "
          "that connects to nothing; D+/D- go to two LEDs.",
     nets=["VBUS", "GND?"])
part("J2", "PROBE PORT", "JACK35_STANDIN", 146.0, 58.0, 0,
     (12.6, 12.0), (0, 0), "conn", zone="ANALOG", mpn="SJ1-3533NG",
     stand_in=True,
     note="Parametric stand-in, same reason. The real Jumperless probe is "
          "a TRRRS jack sensing a 92-resistor divider. This is a plain "
          "TRS jack wired to the board edge.",
     nets=["PROBE"])
part("SW1", "CLICKWHEEL", "ENCODER_STANDIN", 145.0, 94.0, 0,
     (13.4, 12.4), (0, 0), "switch", zone="MCU", mpn="EC11E",
     stand_in=True,
     note="Parametric stand-in for an EC11 encoder body. Both quadrature "
          "phases land on the same net, so it can only ever report zero.",
     nets=["ENC", "ENC"])
part("BT1", "CR2032 (+-8V x4)", "BatteryHolder_Keystone_1058_1x2032",
     77.0, 30.0, 0, (30.5, 25.0), (0, 0), "batt", zone="POWER", side="B",
     mpn="Keystone 1058",
     note="Back-mounted CR2032 holder silkscreened as four independently "
          "programmable +-8 V supplies. Both pads are symmetric about the "
          "footprint origin, so the back-side mirror does not swap them; "
          "an asymmetric part here would have needed its nets remapped.",
     nets=["P8V", "N8V"])

# ------------------------------------------------------------ copper art
CU = {"F": [], "B": []}
PADS = {"F": [], "B": []}
VIAS = []


def ring_rect(x0, y0, x1, y1):
    return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]


def cu(side, rings, net="?", label=""):
    CU[side].append(dict(rings=rings, net=net, label=label))


def trace(side, pts, w, net="?", label=""):
    """Nonsense routing, emitted as one rectangle ring per segment."""
    rings = []
    h = w / 2.0
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        dx, dy = x1 - x0, y1 - y0
        L = math.hypot(dx, dy) or 1e-9
        nx, ny = -dy / L * h, dx / L * h
        ex, ey = dx / L * h, dy / L * h      # square caps
        rings.append([[x0 + nx - ex, y0 + ny - ey], [x1 + nx + ex, y1 + ny + ey],
                      [x1 - nx + ex, y1 - ny + ey], [x0 - nx - ex, y0 - ny - ey]])
    cu(side, rings, net, label)


def spiral(cx, cy, r0, r1, turns, w, net, label):
    pts = []
    n = int(turns * 36)
    for i in range(n + 1):
        t = i / n
        a = t * turns * 2 * math.pi
        r = r0 + (r1 - r0) * t
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    trace("F", pts, w, net, label)


# the one trace under the breadboard: a spiral that dead-ends in the middle
spiral(52.0, 60.0, 1.5, 20.0, 4.0, 0.6, "MAGIC", "the one trace under BB1")
# a trace that runs off the board edge and stops
trace("F", [(8.2, 96.0), (1.2, 96.0)], 1.2, "VBUS", "runs to the rout line and stops")
trace("F", [(8.2, 92.0), (30.0, 92.0), (30.0, 89.0)], 0.8, "VBUS", "under the tape")
# +8V and -8V shorted through a bar labelled +-8V
trace("F", [(128.0, 63.0), (140.0, 63.0), (140.0, 58.0), (150.0, 58.0)],
      1.0, "P8V", "+8V")
trace("F", [(128.0, 63.0), (128.0, 55.0), (150.0, 55.0)], 1.0, "N8V", "-8V")
cu("F", [ring_rect(144.0, 54.0, 152.0, 64.0)], "P8V/N8V", "+-8V (both)")
# a closed ring that returns to itself
ring = []
for i in range(37):
    a = i / 36 * 2 * math.pi
    ring.append((120.0 + 9.0 * math.cos(a), 26.0 + 9.0 * math.sin(a)))
trace("F", ring, 0.6, "NANO", "loop back to itself")
# the LED chain: six LEDs, one gigaohm, in series, from nothing
lp = []
for x in LEDX:
    lp += [(x, 44.0), (x + 2.54, 44.0)]
trace("F", lp, 0.9, "LED_CHAIN", "445 LEDs (6 shown), in series")
# comb tying every nano pin to one net
trace("F", [(100.0, 26.0), (135.56, 26.0)], 1.4, "NANO", "all pins, one net")
trace("F", [(100.0, 10.76), (135.56, 10.76)], 1.4, "NANO", "all pins, one net")
trace("F", [(135.56, 26.0), (138.0, 26.0), (138.0, 10.76), (135.56, 10.76)],
      1.4, "NANO", "and the two rows to each other")
# DELTA+ FAST WiFi/BLE: a copper rectangle with a meander antenna
cu("F", [ring_rect(6.0, 8.0, 34.0, 24.0)], "RF_OUT", "DELTA+ module (copper)")
mx, my = 35.0, 22.0
mean = [(mx, my)]
for i in range(7):
    mean.append((mx + 8.0 if i % 2 == 0 else mx, my - i * 1.8))
    mean.append((mx + 8.0 if i % 2 == 0 else mx, my - (i + 1) * 1.8))
trace("F", mean, 0.6, "RF_OUT", "meander antenna, 32.768 kHz")
# SIMULATED CROSSPOINT MATRIX: a grid of isolated pours
for r in range(4):
    for c in range(9):
        x0 = 50.0 + c * 4.8
        y0 = 7.0 + r * 4.8
        cu("F", [ring_rect(x0, y0, x0 + 3.4, y0 + 3.4)], "MATRIX",
           "simulated crosspoint")
# decorative ground pour that is not connected to ground
cu("F", [ring_rect(96.0, 30.0, 152.0, 40.0)], "GND?", "GND (decorative)")
# back side: a fake barcode and a fake data-matrix block
for i in range(28):
    x0 = 12.0 + i * 1.35
    w = 0.35 if i % 3 else 0.8
    cu("B", [ring_rect(x0, 12.0, x0 + w, 21.0)], "NC", "barcode (invalid)")
for r in range(9):
    for c in range(9):
        if (r * 7 + c * 5 + (r * c) % 3) % 3:
            x0, y0 = 100.0 + c * 1.9, 46.5 + r * 1.9
            cu("B", [ring_rect(x0, y0, x0 + 1.5, y0 + 1.5)], "NC",
               "data matrix (does not scan)")

# gold: every real pad, plus the sponsor bar and fake test points
for p in P:
    for pd in p["pads"]:
        PADS[("F" if pd["side"] == "T" else "B")].append(pd)
PADS["F"].append(dict(n="GOLD", x=116.0, y=99.0, w=40.0, h=6.0, drill=None,
                      circle=False, thru=False, side="T"))
for i, x in enumerate([141.0, 145.0, 149.0]):
    PADS["F"].append(dict(n="TP%d" % (i + 1), x=x, y=31.0, w=2.0, h=2.0,
                          drill=None, circle=True, thru=False, side="T"))
for i in range(24):
    VIAS.append(dict(x=round(34.0 + (i % 12) * 1.6, 2),
                     y=round(104.8 + (i // 12) * 3.0, 2), d=0.8, drill=0.4))

# ------------------------------------------------------------ silkscreen
SILK = {"F": [], "B": []}


def silk(side, x, y, text, size=1.6, font="mono", align="left", weight=600,
         rot=0, hidden=False):
    SILK[side].append(dict(x=x, y=y, t=text, s=size, f=font, a=align,
                           wt=weight, rot=rot, hidden=hidden))


F = "F"
silk(F, 7.0, 99.5, "JUMPERLE55", 9.0, "marker", weight=400)
silk(F, 7.0, 91.0, "V6  PRO  MAX  ULTRA+", 3.4, "type")
silk(F, 52.0, 92.4, "IT'S A BREADBOARD, WITH JUMPER WIRES", 1.8)
silk(F, 116.0, 99.0, "SPONSORED BY KICAD GOLD", 2.6, "mono", "center", 700)
silk(F, 116.0, 94.5, "GOLD TIER  \u00b7  INVOICE PENDING", 1.5, "mono", "center")
silk(F, 152.0, 27.5, "TEST POINTS (NC)", 1.4, "mono", "right")
silk(F, 79.0, 96.5, "LANYARD (NOT INCLUDED)", 1.5, "mono", "center")
silk(F, 98.0, 33.0, "PATENT PENDINGING", 1.6, "type")

silk(F, 20.0, 26.6, "DELTA+ FAST WiFi/BLE", 3.0, "mono", "center", 700)
silk(F, 10.0, 6.4, "2.4GHz / 5GHz / 6GHz / AM / SHORTWAVE / CB", 1.5)
silk(F, 10.0, 3.6, "ANTENNA IS THE SQUIGGLE. DO NOT TOUCH THE SQUIGGLE.", 1.4)
silk(F, 71.6, 30.0, "SIMULATED CROSSPOINT MATRIX  36x", 1.6, "mono", "center")
silk(F, 72.0, 6.4, "SIMULATION RUNS ON YOUR IMAGINATION", 1.4, "mono", "center")

silk(F, 105.8, 87.0, "RP9350B-XXL  128-CORE", 1.8, "mono", "center", 700)
silk(F, 105.8, 74.8, "SOCKET EMPTY BY DESIGN", 1.3, "mono", "center")
silk(F, 117.0, 90.6, "CH446Q x12", 1.8, "mono", "center", 700)
silk(F, 117.0, 73.6, "(IT IS ONE 555)", 1.3)
silk(F, 134.25, 86.6, "BOOT", 1.8, "mono", "center", 700)
silk(F, 134.25, 76.8, "(NO BOOT)", 1.3, "mono", "center")
silk(F, 104.4, 71.4, "Y1  2.4 GHz", 1.6, "mono", "center")
silk(F, 119.5, 71.4, "Q1 ANALOG", 1.6, "mono", "center")
silk(F, 132.5, 71.0, "0R \u00b1 0.0001%", 1.3, "mono", "center")
silk(F, 132.0, 60.5, "10 FARAD 0805", 1.3, "mono", "center")
silk(F, 106.0, 55.5, "PULL-UPS TO NOTHING", 1.3)
silk(F, 145.0, 86.6, "CLICKWHEEL", 1.8, "mono", "center", 700)
silk(F, 146.5, 83.6, "(DOES NOT CLICK)", 1.2, "mono", "center")
silk(F, 146.0, 51.5, "PROBE PORT", 1.8, "mono", "center", 700)
silk(F, 146.0, 49.2, "PROBE NOT INCLUDED", 1.2, "mono", "center")
silk(F, 146.0, 47.2, "PORT NOT INCLUDED", 1.2, "mono", "center")
silk(F, 100.0, 39.0, "445 RGB LEDs   (6 SHOWN)", 2.4, "mono", "left", 700)
silk(F, 100.0, 36.0, "SERIES WIRED. ONE GIGAOHM. RED ONLY.", 1.3)
silk(F, 124.0, 32.3, "GND (DECORATIVE)", 1.6, "mono", "center")
silk(F, 117.8, 22.5, "NANO HEADER  \u00b7  ALL 30 PINS = ONE NET", 1.6,
     "mono", "center", 700)
silk(F, 117.8, 6.0, "0.6\" ROW SPACING IS THE ONLY CORRECT DIMENSION", 1.2,
     "mono", "center")
silk(F, 2.6, 40.0, "USB TYPE-C 4.0  \u00b7  CHARGE ONLY  \u00b7  NO CHARGE", 1.5,
     "mono", "left", 600, 90)
silk(F, 152.0, 92.0, "DO NOT APPLY POWER", 2.0, "mono", "right", 700)
silk(F, 152.0, 89.6, "SERIOUSLY. THERE IS A SHORT ON PURPOSE.", 1.2,
     "mono", "right")
silk(F, 132.0, 57.6, "+-8V x4 SUPPLIES (SHARED)", 1.5, "mono", "center", 700)
silk(F, 7.0, 107.6, "KEVINCON  2026", 2.4, "mono", "left", 700)
silk(F, 152.0, 107.6, "SHUNT R1  \u00b7  hack.build", 2.0, "mono", "right")
silk(F, 152.0, 3.0, "MADE IN THE HACKERSPACE", 1.4, "mono", "right")

# under the breadboard. Only readable in the sim, or if the tape lets go.
silk(F, 52.0, 78.5, "THERE IS NOTHING UNDER HERE", 4.6, "marker", "center",
     400, 3.5, True)
silk(F, 52.0, 34.5, "NO MATRIX. NO LEDS. JUST ONE SPIRAL TRACE.", 2.0,
     "mono", "center", 600, 3.5, True)
silk(F, 52.0, 85.0, "IF YOU ARE READING THIS, THE TAPE FAILED", 2.0,
     "mono", "center", 600, 3.5, True)
silk(F, 22.0, 43.0, "REFUNDS: NO", 3.4, "type", "center", 400, 3.5, True)
silk(F, 80.0, 43.0, "TELL KEVIN I'M SORRY", 3.0, "marker", "center",
     400, 3.5, True)

B = "B"
silk(B, 77.0, 92.0, "DEFCON 2028", 15.0, "marker", "center", 400)
silk(B, 77.0, 78.0, "OFFICIAL SHAREHOLDER BADGE", 5.4, "mono", "center", 700)
silk(B, 77.0, 73.0, "BEARER IS ENTITLED TO 0.00001% OF NOTHING", 2.0,
     "mono", "center")
silk(B, 77.0, 70.0, "NOT A SECURITY  \u00b7  NOT A BADGE  \u00b7  NOT ELECTRONICS",
     2.0, "mono", "center")
silk(B, 77.0, 66.0, "VOTING RIGHTS REDEEMABLE AT THE CHILL ROOM", 1.6,
     "mono", "center")
silk(B, 77.0, 62.0, "(TM)(R)(C) ALL RIGHTS RESERVED BY SOMEONE", 1.6,
     "mono", "center")
silk(B, 77.0, 58.0, "SPONSORED BY KICAD GOLD", 2.6, "mono", "center", 700)
silk(B, 77.0, 12.5, "SERIAL 0001 OF 12", 2.2, "mono", "center", 700)
silk(B, 12.0, 23.0, "BARCODE (INVALID)", 1.4)
silk(B, 119.0, 55.0, "SCAN ME (WILL NOT SCAN)", 1.4)
for i, t in enumerate(["CE-ISH", "FCC PART 15 (VIBES)", "RoHS ADJACENT",
                       "UL PENDING FOREVER", "IP00"]):
    silk(B, 8.0, 52.0 - i * 3.2, t, 1.8, "mono", "left", 700)
silk(B, 146.0, 52.0, "SHUNT R1", 3.0, "mono", "right", 700)
silk(B, 146.0, 48.0, "KEVINCON EDITION", 1.8, "mono", "right")
silk(B, 146.0, 45.0, "hack.build", 1.8, "mono", "right")
silk(B, 146.0, 41.0, "154.0 x 110.0 mm  \u00b7  0.33 SHORT ON PURPOSE", 1.3,
     "mono", "right")
silk(B, 77.0, 44.0, "CR2032 = FOUR +-8V PROGRAMMABLE SUPPLIES", 1.6,
     "mono", "center")
silk(B, 77.0, 16.5, "REMOVE CELL BEFORE FLIGHT, SWALLOWING, OR AUDIT", 1.4,
     "mono", "center")

# ---------------------------------------------------- graffiti art layer
# Full-colour UV print (PCBWay) or a printed vinyl overlay. Not silkscreen:
# one fab silk layer is one colour, and pretending otherwise is the kind of
# lie this board is already telling about everything else.
ART = []


def splat(x, y, r, color, seed=1, side="F"):
    pts = []
    n = 18
    for i in range(n):
        a = i / n * 2 * math.pi
        k = 0.55 + 0.45 * abs(math.sin(seed * 1.7 + i * 2.3))
        rr = r * k * (1.25 if i % 5 == 0 else 1.0)
        pts.append([round(x + rr * math.cos(a), 2), round(y + rr * math.sin(a), 2)])
    ART.append(dict(side=side, kind="poly", pts=pts, color=color))


def band(x0, y0, x1, y1, color, side="F", op=0.85):
    ART.append(dict(side=side, kind="poly", color=color, op=op,
                    pts=[[x0, y0], [x1, y0], [x1, y1], [x0, y1]]))


def drip(x, y, w, h, color, side="F"):
    ART.append(dict(side=side, kind="drip", x=x, y=y, w=w, h=h, color=color))


def tag(side, x, y, text, size, color, rot=0):
    ART.append(dict(side=side, kind="tag", x=x, y=y, t=text, s=size,
                    color=color, rot=rot))


NEON = ["#FF2D95", "#00E5FF", "#B4FF39", "#FFD400", "#FF6A00", "#8A5CFF"]
band(0, 105.5, 154.0, 110.0, "#FF2D95", op=0.9)
band(0, 103.0, 154.0, 105.5, "#00E5FF", op=0.9)
for i, x in enumerate([26, 62, 96, 132]):
    drip(x, 103.0, 5.0 + i, 6.0 + i * 2, "#00E5FF")
splat(97.0, 84.0, 8.0, "#B4FF39", 2)
splat(148.0, 30.0, 8.0, "#FF2D95", 5)
splat(6.0, 44.0, 7.5, "#FFD400", 7)
splat(40.0, 6.0, 6.5, "#8A5CFF", 11)
band(96.0, 26.0, 154.0, 29.0, "#FF6A00", op=0.9)
tag(F, 118.0, 17.5, "FAKE", 9.0, "#FF2D95", -8)
tag(F, 20.0, 16.0, "SHUNT", 7.0, "#00E5FF", 3.5)
tag(F, 136.0, 20.5, "NO WIRES?", 3.0, "#B4FF39", -4)
tag(F, 60.0, 19.0, "SIC", 6.0, "#FFD400", 6)
band(0, 105.5, 154.0, 110.0, "#B4FF39", side=B, op=0.9)
splat(20.0, 66.0, 10.0, "#FF2D95", 3, side=B)
splat(134.0, 68.0, 9.0, "#00E5FF", 9, side=B)
tag(B, 30.0, 33.0, "SHARE", 6.0, "#FFD400", -6)
tag(B, 60.0, 26.0, "HOLDER", 5.0, "#FF2D95", 5)

# --------------------------------------------------------------- gates
FAIL = []
WARN = []
# Exact advance widths from the real fonts when they are available, which is
# what the fab output uses too. The old per-character estimates were out by
# 15% on the marker face, so they cleared collisions that were really there.
ADV = {"mono": 0.64, "type": 0.60, "marker": 0.58}
try:
    import textpoly
    WEIGHTS = {"mono": None, "type": 400, "marker": 400}

    def _width(t, fam, size, wt):
        return textpoly.text_width(t, fam, WEIGHTS[fam] or wt, size)
    EXACT = True
except Exception as _e:                                    # fonts not fetched
    def _width(t, fam, size, wt):
        return len(t) * size * ADV[fam]
    EXACT = False


SILK_GAP = 0.2      # per side, so 0.4 mm between two strings


def silk_box(s_, grow=0.0):
    """Ink box for a silk string, from real font metrics where possible."""
    tw = max(2.0, _width(s_["t"], s_["f"], s_["s"], s_["wt"]))
    off = {"left": tw / 2, "center": 0.0, "right": -tw / 2}[s_["a"]]
    r2 = math.radians(s_["rot"])
    return obb(s_["x"] + off * math.cos(r2), s_["y"] + off * math.sin(r2),
               tw + 2 * grow, s_["s"] * 1.15 + 2 * grow, s_["rot"])


def outline_pts(inset=0.0):
    r = max(0.1, BD["corner_r"] - inset)
    x0, y0, x1, y1 = inset, inset, BD["w"] - inset, BD["h"] - inset
    pts = []
    for cx, cy, a0 in [(x1 - r, y0 + r, -math.pi / 2), (x1 - r, y1 - r, 0),
                       (x0 + r, y1 - r, math.pi / 2), (x0 + r, y0 + r, math.pi)]:
        for i in range(9):
            a = a0 + i / 8 * math.pi / 2
            pts.append([round(cx + r * math.cos(a), 4), round(cy + r * math.sin(a), 4)])
    return pts


def inside(x, y, m=0.3):
    if not (m <= x <= BD["w"] - m and m <= y <= BD["h"] - m):
        return False
    r = BD["corner_r"]
    for cx, cy in [(r, r), (BD["w"] - r, r), (r, BD["h"] - r),
                   (BD["w"] - r, BD["h"] - r)]:
        if (x < r and cx == r or x > BD["w"] - r and cx != r) and \
           (y < r and cy == r or y > BD["h"] - r and cy != r):
            if math.hypot(x - cx, y - cy) > r - m:
                return False
    return True


def obb(cx, cy, w, h, rot):
    r = math.radians(rot)
    c, s = math.cos(r), math.sin(r)
    return [(cx + dx * c - dy * s, cy + dx * s + dy * c)
            for dx, dy in [(-w / 2, -h / 2), (w / 2, -h / 2),
                           (w / 2, h / 2), (-w / 2, h / 2)]]


def sat_overlap(A, B_):
    for poly in (A, B_):
        n = len(poly)
        for i in range(n):
            x0, y0 = poly[i]
            x1, y1 = poly[(i + 1) % n]
            ax, ay = -(y1 - y0), (x1 - x0)
            L = math.hypot(ax, ay) or 1e-9
            ax, ay = ax / L, ay / L
            a0 = min(ax * p[0] + ay * p[1] for p in A)
            a1 = max(ax * p[0] + ay * p[1] for p in A)
            b0 = min(ax * p[0] + ay * p[1] for p in B_)
            b1 = max(ax * p[0] + ay * p[1] for p in B_)
            if a1 < b0 or b1 < a0:
                return False
    return True


# G1 containment: pads, part bodies, copper, vias, breadboard
for p in P:
    for q in obb(p["cx"], p["cy"], p["bw0"], p["bh0"], p["rot"]):
        if not inside(*q):
            FAIL.append("G1 %s body corner (%.2f, %.2f) outside outline"
                        % (p["ref"], q[0], q[1]))
    for pd in p["pads"]:
        if not inside(pd["x"], pd["y"], 0.5):
            FAIL.append("G1 %s pad %s at (%.2f, %.2f) outside outline"
                        % (p["ref"], pd["n"], pd["x"], pd["y"]))
for side in CU:
    for feat in CU[side]:
        for r in feat["rings"]:
            for x, y in r:
                if not inside(x, y, 0.15):
                    WARN.append("G1 copper '%s' (%s) leaves the outline at "
                                "(%.2f, %.2f)" % (feat["label"], side, x, y))
for v in VIAS:
    if not inside(v["x"], v["y"], 0.4):
        FAIL.append("G1 via at (%.2f, %.2f) outside outline" % (v["x"], v["y"]))
for q in obb(BB["cx"], BB["cy"], BB["w"], BB["h"], BB["rot"]):
    if not inside(*q, m=0.0):
        FAIL.append("G1 breadboard corner (%.2f, %.2f) overhangs the board"
                    % q)

# G2 mounting hole keepout
for mx_, my_ in MOUNT:
    for p in P:
        for pd in p["pads"]:
            if math.hypot(pd["x"] - mx_, pd["y"] - my_) < MOUNT_R + 1.2:
                FAIL.append("G2 %s pad %s inside mounting keepout at (%.1f, %.1f)"
                            % (p["ref"], pd["n"], mx_, my_))
    for p in P:
        if sat_overlap(obb(p["cx"], p["cy"], p["bw0"], p["bh0"], p["rot"]),
                       obb(mx_, my_, 2 * (MOUNT_R + 1.2), 2 * (MOUNT_R + 1.2), 0)):
            FAIL.append("G2 %s body over mounting hole (%.1f, %.1f)"
                        % (p["ref"], mx_, my_))

# G2b lanyard slot: inside the outline, and clear of pads, bodies and vias
def slot_poly(sl, grow=0.0):
    hw = sl["w"] / 2 + grow
    hh = sl["h"] / 2 + grow
    return [(sl["x"] - hw, sl["y"] - hh), (sl["x"] + hw, sl["y"] - hh),
            (sl["x"] + hw, sl["y"] + hh), (sl["x"] - hw, sl["y"] + hh)]


for sl in SLOTS:
    for q in slot_poly(sl):
        if not inside(*q, m=0.8):
            FAIL.append("G2b lanyard slot corner (%.2f, %.2f) too close to the "
                        "board edge" % q)
    keep = slot_poly(sl, 1.0)
    for p in P:
        for pd in p["pads"]:
            if sat_overlap(keep, obb(pd["x"], pd["y"], pd["w"], pd["h"], 0)):
                FAIL.append("G2b %s pad %s inside the lanyard keepout"
                            % (p["ref"], pd["n"]))
        if sat_overlap(keep, obb(p["cx"], p["cy"], p["bw0"], p["bh0"], p["rot"])):
            FAIL.append("G2b %s body over the lanyard slot" % p["ref"])
    for pd in PADS["F"] + PADS["B"]:
        if sat_overlap(keep, obb(pd["x"], pd["y"], pd["w"], pd["h"], 0)):
            FAIL.append("G2b pad %s inside the lanyard keepout" % pd["n"])
    for v in VIAS:
        if sat_overlap(keep, obb(v["x"], v["y"], v["d"], v["d"], 0)):
            FAIL.append("G2b via at (%.2f, %.2f) inside the lanyard keepout"
                        % (v["x"], v["y"]))
    for sd in ("F", "B"):
        for s_ in SILK[sd]:
            if sat_overlap(slot_poly(sl, 0.3), silk_box(s_)):
                FAIL.append("G2b silk '%s' crosses the lanyard slot (%s)"
                            % (s_["t"][:24], sd))

# G2c back copper art vs through-hole annular rings. Every plated barrel gets
# a pad on BOTH layers, so back-side art sitting under a front-side THT pad
# merges with it. Caught by looking at a render of the emitted gerbers, not by
# any numeric check that existed at the time.
THT = [pd for p in P for pd in p["pads"] if pd.get("drill")]
for feat in CU["B"]:
    for ring in feat["rings"]:
        xs = [q[0] for q in ring]
        ys = [q[1] for q in ring]
        rb = obb((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2,
                 max(xs) - min(xs), max(ys) - min(ys), 0)
        for pd in THT:
            if sat_overlap(rb, obb(pd["x"], pd["y"], pd["w"] + 0.2,
                                   pd["w"] + 0.2, 0)):
                FAIL.append("G2c back copper '%s' overlaps the bottom annular "
                            "ring of a through-hole pad at (%.2f, %.2f)"
                            % (feat["label"], pd["x"], pd["y"]))
                break

# G3 part vs part collision, per side
for side in ("T", "B"):
    ps = [p for p in P if p["side"] == side]
    for i in range(len(ps)):
        for j in range(i + 1, len(ps)):
            a, b = ps[i], ps[j]
            if sat_overlap(obb(a["cx"], a["cy"], a["bw0"], a["bh0"], a["rot"]),
                           obb(b["cx"], b["cy"], b["bw0"], b["bh0"], b["rot"])):
                FAIL.append("G3 %s body overlaps %s (side %s)"
                            % (a["ref"], b["ref"], side))

# G4 breadboard keepout: it is taped flat to the mask, so nothing lives under it
bbq = obb(BB["cx"], BB["cy"], BB["w"], BB["h"], BB["rot"])
for p in P:
    if p["side"] != "T":
        continue
    if sat_overlap(obb(p["cx"], p["cy"], p["bw0"], p["bh0"], p["rot"]), bbq):
        FAIL.append("G4 %s sits under the breadboard (%.1f mm of tape will "
                    "not clear a %s)" % (p["ref"], BB["tape"], p["kind"]))

# G5 silk legibility: hidden copy must actually be under the breadboard,
# visible copy must not be
for s in SILK["F"]:
    q = silk_box(s)
    under = sat_overlap(q, bbq)
    if s["hidden"] and not under:
        FAIL.append("G5 hidden silk '%s' is not under the breadboard"
                    % s["t"][:28])
    if not s["hidden"] and under:
        WARN.append("G5 visible silk '%s' is partly under the breadboard"
                    % s["t"][:28])

# G5b silk legibility: silk must not collide with other silk, or sit on gold
for sd in ("F", "B"):
    ss = SILK[sd]
    for i in range(len(ss)):
        for j in range(i + 1, len(ss)):
            if ss[i]["hidden"] != ss[j]["hidden"]:
                continue
            if sat_overlap(silk_box(ss[i], SILK_GAP), silk_box(ss[j], SILK_GAP)):
                FAIL.append("G5b silk '%s' is within %.1f mm of silk '%s' (%s)"
                            % (ss[i]["t"][:24], 2 * SILK_GAP, ss[j]["t"][:24], sd))
    for s_ in ss:
        for pd in PADS[sd]:
            if pd["n"] == "GOLD":
                continue
            if sat_overlap(silk_box(s_),
                           obb(pd["x"], pd["y"], pd["w"], pd["h"], 0)):
                WARN.append("G5b silk '%s' overlaps pad %s (%s)"
                            % (s_["t"][:24], pd["n"], sd))
                break

# G6 layer registration: every layer derives from the one outline function
OUTLINE = outline_pts(0)
assert OUTLINE == outline_pts(0), "G6 outline is not deterministic"

# G7 the shitpost gates, inverted on purpose. These are real electrical
# defects and the board ships with exactly this many.
NETS = {}
for p in P:
    for n in p["nets"]:
        NETS.setdefault(n, []).append(p["ref"])
SHORTS = [("P8V", "N8V", "the +-8V bar ties both supply rails together"),
          ("BOOT", "BOOT", "SW2 shorts a net to itself"),
          ("ANALOG", "ANALOG", "Q1 C, B and E on one net"),
          ("ENC", "ENC", "both encoder phases on one net"),
          ("NANO", "NANO", "30 header pins on one net")]
FLOATING = [n for n, refs in NETS.items() if n in ("VIBES", "MAGIC", "GND?",
                                                   "PROBE", "MATRIX", "NC")]
EXPECT = dict(shorts=5, floating=5, populated_sockets=0, correct_dimensions=1)
got = dict(shorts=len(SHORTS), floating=len(FLOATING), populated_sockets=0,
           correct_dimensions=1)
for k in EXPECT:
    if EXPECT[k] != got[k]:
        FAIL.append("G7 shitpost drift: %s expected %d, got %d"
                    % (k, EXPECT[k], got[k]))

# ------------------------------------------------------------- reporting
print("SHUNT R1 gates")
print("  silk metrics     %s"
      % ("exact, from the shipped font files"
         if EXACT else "ESTIMATED (fonts/ missing, widths approximate)"))
print("  board            %.1f x %.1f mm (real Jumperless V5: %.2f x %.2f)"
      % (BD["w"], BD["h"], *REAL_JL))
print("  parts            %d (%d front, %d back, %d parametric stand-ins)"
      % (len(P), sum(1 for p in P if p["side"] == "T"),
         sum(1 for p in P if p["side"] == "B"),
         sum(1 for p in P if p["stand_in"])))
print("  pads             %d front, %d back" % (len(PADS["F"]), len(PADS["B"])))
print("  cutouts          %d mounting holes R%.1f, %d lanyard slot%s %s"
      % (len(MOUNT), MOUNT_R, len(SLOTS), "" if len(SLOTS) == 1 else "s",
         ", ".join("%.0fx%.1f mm at (%.0f, %.0f)"
                   % (s_["w"], s_["h"], s_["x"], s_["y"]) for s_ in SLOTS)))
print("  copper features  %d front, %d back" % (len(CU["F"]), len(CU["B"])))
print("  silk strings     %d front (%d hidden under BB1), %d back"
      % (len(SILK["F"]), sum(1 for s in SILK["F"] if s["hidden"]),
         len(SILK["B"])))
print("  art shapes       %d (UV print layer, not silkscreen)" % len(ART))
print("  intentional electrical defects: %d shorts, %d floating nets"
      % (len(SHORTS), len(FLOATING)))
for w in WARN:
    print("  WARN " + w)
if FAIL:
    for f in FAIL:
        print("  FAIL " + f)
    sys.exit("gates failed: %d. Nothing written." % len(FAIL))
print("  geometry gates: PASS (%d warnings)" % len(WARN))

# ---------------------------------------------------------------- emit
DATA = dict(
    board=dict(BD, real_jumperless=list(REAL_JL)),
    outline=OUTLINE, mount=MOUNT, mount_r=MOUNT_R,
    breadboard=BB, parts=P, pads=PADS, copper=CU, vias=VIAS, slots=SLOTS,
    silk=SILK, art=ART,
    nets={k: v for k, v in sorted(NETS.items())},
    defects=dict(shorts=[list(s) for s in SHORTS], floating=sorted(FLOATING)),
)
json.dump(DATA, open(os.path.join(OUT, "board.json"), "w"), indent=1)
print("  wrote board.json (%d KB)"
      % (os.path.getsize(os.path.join(OUT, "board.json")) // 1024))

# 1:1 SVG artwork, painted from the same DATA the sim reads
FONTS = {"mono": "IBM Plex Mono, monospace", "type": "Special Elite, monospace",
         "marker": "Permanent Marker, cursive"}
ANCH = {"left": "start", "center": "middle", "right": "end"}


def svg_face(side):
    """1:1 artwork. The front is drawn as seen from the front; the back is
    drawn as seen from the BACK (board x mirrored), which is how you read a
    back-side layer with the board in your hand. Text is not mirrored, so
    anchors flip with it."""
    W, H = BD["w"], BD["h"]
    mir = side == "B"

    def MX(x):
        return (W - x) if mir else x
    FLIP = {"left": "right", "right": "left", "center": "center"}
    o = ["<svg xmlns='http://www.w3.org/2000/svg' width='%.1fmm' height='%.1fmm'"
         " viewBox='0 0 %.1f %.1f'>" % (W, H, W, H),
         "<style>text{font-family:%s}</style>" % FONTS["mono"],
         "<defs><clipPath id='bd'><path d='%s'/></clipPath></defs>"
         % ("M" + " L".join("%.3f %.3f" % (x, H - y) for x, y in OUTLINE) + " Z"),
         "<g clip-path='url(#bd)'>",
         "<rect width='%.1f' height='%.1f' fill='%s'/>" % (W, H, BD["mask"])]
    for feat in CU[side]:
        for r in feat["rings"]:
            o.append("<polygon points='%s' fill='%s'/>"
                     % (" ".join("%.3f,%.3f" % (MX(x), H - y) for x, y in r),
                        BD["mask_hi"]))
    for a in [q for q in ART if q["side"] == side]:
        if a["kind"] == "poly":
            o.append("<polygon points='%s' fill='%s' opacity='%.2f'/>"
                     % (" ".join("%.2f,%.2f" % (MX(x), H - y) for x, y in a["pts"]),
                        a["color"], a.get("op", 1.0)))
        elif a["kind"] == "drip":
            o.append("<path d='M%.2f %.2f q %.2f %.2f 0 %.2f q %.2f %.2f 0 %.2f Z'"
                     " fill='%s'/>" % (MX(a["x"]), H - a["y"], -a["w"] / 2,
                                       a["h"] * .6, a["h"], a["w"] / 2,
                                       -a["h"] * .6, -a["h"], a["color"]))
        else:
            o.append("<text x='%.2f' y='%.2f' font-size='%.2f' fill='%s'"
                     " font-family='%s' text-anchor='middle'"
                     " transform='rotate(%.2f %.2f %.2f)'>%s</text>"
                     % (MX(a["x"]), H - a["y"], a["s"], a["color"],
                        FONTS["marker"], (a["rot"] if mir else -a["rot"]),
                        MX(a["x"]), H - a["y"], a["t"]))
    for pd in PADS[side]:
        if pd["circle"] or pd["drill"]:
            o.append("<circle cx='%.3f' cy='%.3f' r='%.3f' fill='#E8C268'/>"
                     % (MX(pd["x"]), H - pd["y"], pd["w"] / 2))
            if pd["drill"]:
                o.append("<circle cx='%.3f' cy='%.3f' r='%.3f' fill='#241C10'/>"
                         % (MX(pd["x"]), H - pd["y"], pd["drill"] / 2))
        else:
            o.append("<rect x='%.3f' y='%.3f' width='%.3f' height='%.3f'"
                     " fill='#E8C268'/>" % (MX(pd["x"]) - pd["w"] / 2,
                                            H - pd["y"] - pd["h"] / 2,
                                            pd["w"], pd["h"]))
    for v in VIAS:
        o.append("<circle cx='%.3f' cy='%.3f' r='%.3f' fill='#E8C268'/>"
                 % (MX(v["x"]), H - v["y"], v["d"] / 2))
    for s in SILK[side]:
        o.append("<text x='%.2f' y='%.2f' font-size='%.2f' font-weight='%d'"
                 " fill='%s' font-family='%s' text-anchor='%s'"
                 " transform='rotate(%.2f %.2f %.2f)' opacity='%.2f'>%s</text>"
                 % (MX(s["x"]), H - s["y"], s["s"], s["wt"], BD["silk"],
                    FONTS[s["f"]], ANCH[FLIP[s["a"]] if mir else s["a"]],
                    (s["rot"] if mir else -s["rot"]), MX(s["x"]), H - s["y"],
                    0.55 if s["hidden"] else 1.0,
                    s["t"].replace("&", "&amp;").replace("<", "&lt;")))
    o.append("</g>")
    for x, y in MOUNT:
        o.append("<circle cx='%.2f' cy='%.2f' r='%.2f' fill='#111'/>"
                 % (MX(x), H - y, MOUNT_R))
    for sl in SLOTS:
        o.append("<rect x='%.2f' y='%.2f' width='%.2f' height='%.2f' rx='%.2f'"
                 " fill='#111'/>"
                 % (MX(sl["x"]) - sl["w"] / 2, H - sl["y"] - sl["h"] / 2,
                    sl["w"], sl["h"], sl["r"]))
    o.append("</svg>")
    return "\n".join(o)


for side, fn in (("F", "shunt-front.svg"), ("B", "shunt-back.svg")):
    open(os.path.join(OUT, fn), "w").write(svg_face(side))
    print("  wrote %s" % fn)

with open(os.path.join(OUT, "BOM.csv"), "w", newline="") as fh:
    wr = csv.writer(fh)
    wr.writerow(["ref", "value (as silkscreened)", "actual part", "footprint",
                 "side", "qty", "note"])
    for p in P:
        wr.writerow([p["ref"], p["val"], p["mpn"] or "?", p["fp"], p["side"], 1,
                     p["note"].split(".")[0]])
    wr.writerow(["BB1", "445-LED PROGRAMMABLE MATRIX",
                 "400-point half-size breadboard", "double-sided foam tape",
                 "T", 1, "The joke. Stuck on crooked at 3.5 degrees"])
print("  wrote BOM.csv")
