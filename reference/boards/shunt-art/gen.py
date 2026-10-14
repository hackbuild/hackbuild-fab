"""SHUNT R1, the KevinCon counterfeit Jumperless, on the direct-emit library
(M08-T06 step 5). A deliberately non-functional art board whose fab set is
real.

Reads only the committed board.json (lineage shunt.board/r1, sha256
db835634c13a8661fb0ac20132e55e11190e6f3262fa20f07f5a69fe3b08d375), runs the
geometry gates G1 to G6 ported from SHUNT gen_board.py lines 466 to 697
(lineage shunt.generator/r1), and on a pass writes the fab set ported from
gen_fab.py (lineage shunt.fab/r1). G7, the inverted electrical gate, moves
to the chase expect set (M08-T09, D-074).

Conventions gen_fab.py states and check_fab.py verifies: every layer in
board coordinates, back layers not pre-mirrored; back silk glyphs mirrored
in board space so the text reads with the board turned over; gerber X and Y
are board x and y in mm from the bottom-left corner.

Run: uv run --project tools/py reference/boards/shunt-art/gen.py --out <dir> --epoch <s>
"""
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "tools", "py", "board"))

from direct import hbf_version  # noqa: E402
from direct import textpoly  # noqa: E402
from direct.excellon import write_excellon  # noqa: E402
from direct.fab import fab_members, write_zip  # noqa: E402
from direct.gerber import FlashGerber  # noqa: E402
from direct.record import StagedOut, args, provenance, write_json  # noqa: E402

D = json.load(open(os.path.join(HERE, "board.json")))
BD = D["board"]
W, H = BD["w"], BD["h"]
P = D["parts"]
PADS = D["pads"]
CU = D["copper"]
VIAS = D["vias"]
SLOTS = D["slots"]
SILK = D["silk"]
BB = D["breadboard"]
MOUNT = [tuple(m) for m in D["mount"]]
MOUNT_R = D["mount_r"]
MASK_SWELL = 0.05        # gen_fab.py line 32: mask opening larger than the pad, per side
PASTE_SHRINK = 0.05      # gen_fab.py line 33: stencil aperture smaller than the pad, per side
ART = ("%TA.AperFunction,Other,art*%",)   # gen_fab.py line 50, on every layer
BOARD_JSON = "reference/boards/shunt-art/board.json"
SHUNT_DATE = "2026-08-11"   # fab set delivery, files (54).zip (shunt record section 1)

# --------------------------------------------------------------- gates (gen_board.py lines 466 to 697)
FAIL = []
WARN = []
WEIGHTS = {"mono": None, "type": 400, "marker": 400}
SILK_GAP = 0.2      # per side, so 0.4 mm between two strings


def _width(t, fam, size, wt):
    return textpoly.text_width(t, fam, WEIGHTS[fam] or wt, size)


def obb(cx, cy, w, h, rot):
    r = math.radians(rot)
    c, s = math.cos(r), math.sin(r)
    return [(cx + dx * c - dy * s, cy + dx * s + dy * c)
            for dx, dy in [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)]]


def silk_box(s_, grow=0.0):
    """Ink box for a silk string, from the exact font metrics."""
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
    for cx, cy in [(r, r), (BD["w"] - r, r), (r, BD["h"] - r), (BD["w"] - r, BD["h"] - r)]:
        if (x < r and cx == r or x > BD["w"] - r and cx != r) and \
           (y < r and cy == r or y > BD["h"] - r and cy != r):
            if math.hypot(x - cx, y - cy) > r - m:
                return False
    return True


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


def slot_poly(sl, grow=0.0):
    hw = sl["w"] / 2 + grow
    hh = sl["h"] / 2 + grow
    return [(sl["x"] - hw, sl["y"] - hh), (sl["x"] + hw, sl["y"] - hh),
            (sl["x"] + hw, sl["y"] + hh), (sl["x"] - hw, sl["y"] + hh)]


def gates():
    # G1 containment: pads, part bodies, copper, vias, breadboard
    for p in P:
        for q in obb(p["cx"], p["cy"], p["bw0"], p["bh0"], p["rot"]):
            if not inside(*q):
                FAIL.append("G1 %s body corner (%.2f, %.2f) outside outline" % (p["ref"], q[0], q[1]))
        for pd in p["pads"]:
            if not inside(pd["x"], pd["y"], 0.5):
                FAIL.append("G1 %s pad %s at (%.2f, %.2f) outside outline" % (p["ref"], pd["n"], pd["x"], pd["y"]))
    for side in CU:
        for feat in CU[side]:
            for r in feat["rings"]:
                for x, y in r:
                    if not inside(x, y, 0.15):
                        WARN.append("G1 copper '%s' (%s) leaves the outline at (%.2f, %.2f)" % (feat["label"], side, x, y))
    for v in VIAS:
        if not inside(v["x"], v["y"], 0.4):
            FAIL.append("G1 via at (%.2f, %.2f) outside outline" % (v["x"], v["y"]))
    for q in obb(BB["cx"], BB["cy"], BB["w"], BB["h"], BB["rot"]):
        if not inside(*q, m=0.0):
            FAIL.append("G1 breadboard corner (%.2f, %.2f) overhangs the board" % q)

    # G2 mounting hole keepout
    for mx_, my_ in MOUNT:
        for p in P:
            for pd in p["pads"]:
                if math.hypot(pd["x"] - mx_, pd["y"] - my_) < MOUNT_R + 1.2:
                    FAIL.append("G2 %s pad %s inside mounting keepout at (%.1f, %.1f)" % (p["ref"], pd["n"], mx_, my_))
        for p in P:
            if sat_overlap(obb(p["cx"], p["cy"], p["bw0"], p["bh0"], p["rot"]),
                           obb(mx_, my_, 2 * (MOUNT_R + 1.2), 2 * (MOUNT_R + 1.2), 0)):
                FAIL.append("G2 %s body over mounting hole (%.1f, %.1f)" % (p["ref"], mx_, my_))

    # G2b lanyard slot: inside the outline, and clear of pads, bodies, vias and silk
    for sl in SLOTS:
        for q in slot_poly(sl):
            if not inside(*q, m=0.8):
                FAIL.append("G2b lanyard slot corner (%.2f, %.2f) too close to the board edge" % q)
        keep = slot_poly(sl, 1.0)
        for p in P:
            for pd in p["pads"]:
                if sat_overlap(keep, obb(pd["x"], pd["y"], pd["w"], pd["h"], 0)):
                    FAIL.append("G2b %s pad %s inside the lanyard keepout" % (p["ref"], pd["n"]))
            if sat_overlap(keep, obb(p["cx"], p["cy"], p["bw0"], p["bh0"], p["rot"])):
                FAIL.append("G2b %s body over the lanyard slot" % p["ref"])
        for pd in PADS["F"] + PADS["B"]:
            if sat_overlap(keep, obb(pd["x"], pd["y"], pd["w"], pd["h"], 0)):
                FAIL.append("G2b pad %s inside the lanyard keepout" % pd["n"])
        for v in VIAS:
            if sat_overlap(keep, obb(v["x"], v["y"], v["d"], v["d"], 0)):
                FAIL.append("G2b via at (%.2f, %.2f) inside the lanyard keepout" % (v["x"], v["y"]))
        for sd in ("F", "B"):
            for s_ in SILK[sd]:
                if sat_overlap(slot_poly(sl, 0.3), silk_box(s_)):
                    FAIL.append("G2b silk '%s' crosses the lanyard slot (%s)" % (s_["t"][:24], sd))

    # G2c back copper art vs through-hole annular rings: every plated barrel
    # gets a pad on both layers, so back art under a front THT pad merges with it.
    tht = [pd for p in P for pd in p["pads"] if pd.get("drill")]
    for feat in CU["B"]:
        for ring in feat["rings"]:
            xs = [q[0] for q in ring]
            ys = [q[1] for q in ring]
            rb = obb((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, max(xs) - min(xs), max(ys) - min(ys), 0)
            for pd in tht:
                if sat_overlap(rb, obb(pd["x"], pd["y"], pd["w"] + 0.2, pd["w"] + 0.2, 0)):
                    FAIL.append("G2c back copper '%s' overlaps the bottom annular ring of a through-hole pad at (%.2f, %.2f)"
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
                    FAIL.append("G3 %s body overlaps %s (side %s)" % (a["ref"], b["ref"], side))

    # G4 breadboard keepout: it is taped flat to the mask, so nothing lives under it
    bbq = obb(BB["cx"], BB["cy"], BB["w"], BB["h"], BB["rot"])
    for p in P:
        if p["side"] != "T":
            continue
        if sat_overlap(obb(p["cx"], p["cy"], p["bw0"], p["bh0"], p["rot"]), bbq):
            FAIL.append("G4 %s sits under the breadboard (%.1f mm of tape will not clear a %s)" % (p["ref"], BB["tape"], p["kind"]))

    # G5 silk legibility: hidden copy under the breadboard, visible copy not
    for s in SILK["F"]:
        under = sat_overlap(silk_box(s), bbq)
        if s["hidden"] and not under:
            FAIL.append("G5 hidden silk '%s' is not under the breadboard" % s["t"][:28])
        if not s["hidden"] and under:
            WARN.append("G5 visible silk '%s' is partly under the breadboard" % s["t"][:28])

    # G5b silk legibility: silk clear of other silk by 0.4 mm, warn on gold
    for sd in ("F", "B"):
        ss = SILK[sd]
        for i in range(len(ss)):
            for j in range(i + 1, len(ss)):
                if ss[i]["hidden"] != ss[j]["hidden"]:
                    continue
                if sat_overlap(silk_box(ss[i], SILK_GAP), silk_box(ss[j], SILK_GAP)):
                    FAIL.append("G5b silk '%s' is within %.1f mm of silk '%s' (%s)" % (ss[i]["t"][:24], 2 * SILK_GAP, ss[j]["t"][:24], sd))
        for s_ in ss:
            for pd in PADS[sd]:
                if pd["n"] == "GOLD":
                    continue
                if sat_overlap(silk_box(s_), obb(pd["x"], pd["y"], pd["w"], pd["h"], 0)):
                    WARN.append("G5b silk '%s' overlaps pad %s (%s)" % (s_["t"][:24], pd["n"], sd))
                    break

    # G6 layer registration: the committed outline is the one outline function's output
    if D["outline"] != outline_pts(0):
        FAIL.append("G6 board.json outline differs from outline_pts(0)")


# ------------------------------------------------------------------ fab writers (gen_fab.py)
def layer_pads(side):
    """Own side's pads plus every through-hole pad from the other side: a
    plated barrel needs an annular ring on both layers (gen_fab.py 103 to 109)."""
    other = "B" if side == "F" else "F"
    return PADS[side] + [pd for pd in PADS[other] if pd.get("drill")]


def pad_flash(g, pd, swell=0.0):
    """Round pads and every through-hole pad as a circle, SMD pads as rectangles."""
    if pd.get("circle") or pd.get("drill"):
        g.flash(g.aperture("C", pd["w"] + 2 * swell), pd["x"], pd["y"])
    else:
        g.flash(g.aperture("R", pd["w"] + 2 * swell, pd["h"] + 2 * swell), pd["x"], pd["y"])


def smd(pd):
    return not pd.get("drill") and pd["n"] != "GOLD" and not pd["n"].startswith("TP")


def silk_layer(path, side, function, epoch, ver):
    """Silk as filled glyph regions; back glyphs mirrored in board space."""
    g = FlashGerber(path, function, epoch, ver, extra=ART)
    mirror = side == "B"
    counts = [0, 0, 0]
    for s in SILK[side]:
        polys = textpoly.text_polys(s["t"], s["f"], s["wt"], s["s"], s["x"], s["y"], s["a"], s["rot"], mirror=mirror)
        if not polys:
            continue
        counts[0] += 1
        g.polarity(True)
        for pts, hole in polys:
            if not hole:
                g.region(pts)
                counts[1] += 1
        g.polarity(False)
        for pts, hole in polys:
            if hole:
                g.region(pts)
                counts[2] += 1
    g.polarity(True)
    g.close()
    return counts


def slot_contour(sl):
    hw, hh, r = sl["w"] / 2 - sl["r"], sl["h"] / 2 - sl["r"], sl["r"]
    pts = []
    for cx, cy, a0 in ((sl["x"] + hw, sl["y"] - hh, -math.pi / 2), (sl["x"] + hw, sl["y"] + hh, 0),
                       (sl["x"] - hw, sl["y"] + hh, math.pi / 2), (sl["x"] - hw, sl["y"] - hh, math.pi)):
        for i in range(13):
            a = a0 + i / 12 * math.pi / 2
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def pth_holes():
    holes = [(pd["x"], pd["y"], pd["drill"]) for p in P for pd in p["pads"] if pd.get("drill")]
    return holes + [(v["x"], v["y"], v["drill"]) for v in VIAS]


def short_note(note):
    """The first sentence of a note. gen_board.py line 857 split at the first period and cut
    "HC-49U can silkscreened 2.4 GHz" to "... 2" (shunt record failure 17)."""
    return note.split(". ")[0]



README = ("SHUNT R1 fabrication set\n"
          "%.1f x %.1f mm, 2 layer, 1.6 mm, purple mask, white silk, ENIG\n"
          "Lanyard slot %.1f x %.1f mm is in Edge_Cuts as a routed contour.\n"
          "Mounting holes are in shunt-NPTH.drl, non-plated.\n"
          "All layers are in board coordinates; back layers are NOT\n"
          "pre-mirrored. Back silkscreen glyphs ARE mirrored in board\n"
          "space so they read with the board turned over.\n"
          "The graffiti is a separate full-colour print layer\n"
          "(shunt-UV-front.svg), not silkscreen. It can be skipped.\n"
          "This board is a non-functional art board. The netlist is\n"
          "deliberately nonsense and includes intentional shorts.\n")


# ------------------------------------------------------------------------ the record
def pin_order(n):
    return (0, int(n), "") if n.isdigit() else (1, 0, n)


def pin_nets(p):
    """Pad nets from board.json part nets (M08-T12). board.json declares a part's nets as a
    list, never per pad (gen_board.py part(), lines 90 to 113): a list of one net names
    every pin; otherwise the k-th distinct pin in KiCad number order takes the k-th net,
    and a pin past the end of the list is a declared no-connect (net ""). A repeated pad
    number (SW_PUSH_6mm 1, 2, 1, 2) is one pin and keeps its pin's net."""
    pins = sorted({pd["n"] for pd in p["pads"]}, key=pin_order)
    if len(set(p["nets"])) == 1 and len(p["nets"]) == 1:
        return {n: p["nets"][0] for n in pins}
    return {n: (p["nets"][k] if k < len(p["nets"]) else "") for k, n in enumerate(pins)}


# The part that carries each deliberate short of board.json defects (gen_board.py lines 705
# to 709 give the reasons): the gold bar ties the rails, SW2, Q1 and SW1 short a net to itself,
# and the two Nano headers put 30 pins on one net.
BRIDGE_THROUGH = {("P8V", "N8V"): "GOLD", ("BOOT", "BOOT"): "SW2", ("ANALOG", "ANALOG"): "Q1",
                  ("ENC", "ENC"): "SW1", ("NANO", "NANO"): "J3, J4"}
ANCHOR = {"left": "start", "center": "middle", "right": "end"}


def record():
    """SHUNT as a BoardRecord. Pad nets follow pin_nets; every net of board.json `nets`
    is a record net, members or not (a stand-in has no pads); each deliberate short of
    board.json `defects` is a declared bridge with its reason, so the island and short
    check and the expect set in chase.ts agree by construction (M08-T09 step 3)."""
    pads, parts, reads = [], [], []
    for p in P:
        side = "top" if p["side"] == "T" else "bottom"
        nets = pin_nets(p)
        seen = {}
        for pd in p["pads"]:
            # KiCad repeats a pad number for two pads of one pin (SW_PUSH_6mm: 1, 2, 1, 2);
            # the record keys pads by ref.pin, so the k-th repeat is written "<n>/<k>".
            seen[pd["n"]] = seen.get(pd["n"], 0) + 1
            pin = pd["n"] if seen[pd["n"]] == 1 else "%s/%d" % (pd["n"], seen[pd["n"]])
            thru = bool(pd.get("drill"))
            # A through pad is flashed as a circle of its width on both sides (gen_fab.py pad_flash).
            shape = "circle" if (pd.get("circle") or thru) else "rect"
            w, h = (pd["w"], pd["w"]) if shape == "circle" else (pd["w"], pd["h"])
            r = {"ref": p["ref"], "pin": pin, "net": nets[pd["n"]], "side": side, "through": thru, "shape": shape,
                 "x": pd["x"], "y": pd["y"], "w": w, "h": h, "rot": 0}
            if thru:
                r["drill"] = pd["drill"]
            pads.append(r)
        cid = p["fp"] if p["stand_in"] else f"kicad:{p['fp']}"
        tier = "inferred" if p["stand_in"] else "community"
        model = ({"standIn": True, "reason": "parametric stand-in from remembered datasheet dimensions (SHUNT README open list)"}
                 if p["stand_in"] else {"uri": f"kicad3d:{p['model']}.wrl", "standIn": False})
        part = {"ref": p["ref"], "value": p["val"], "catalogId": cid, "tier": "inferred", "side": side,
                "x": p["cx"], "y": p["cy"], "rot": p["rot"], "body": {"w": p["bw0"], "h": p["bh0"], "z": 0},
                "model": model, "note": short_note(p["note"])}
        if p["mpn"]:
            part["mpn"] = p["mpn"]
        parts.append(part)
        if p["pads"]:
            reads.append({"catalogId": cid, "field": f"{p['ref']}.pads", "provenance": provenance(
                tier, "listing" if tier == "community" else "derived", SHUNT_DATE,
                f"{BOARD_JSON} parts {p['ref']}, parsed from the KiCad footprint {p['fp']}.kicad_mod by gen_board.py lines 39 to 58")})
        reads.append({"catalogId": cid, "field": f"{p['ref']}.body", "provenance": provenance(
            "inferred", "derived", SHUNT_DATE, f"{BOARD_JSON} parts {p['ref']} bw0 bh0, from the datasheet outline as typed in gen_board.py; height not declared")})
    for pd in PADS["F"] + PADS["B"]:
        if pd["n"] == "GOLD" or pd["n"].startswith("TP"):
            r = {"ref": pd["n"], "pin": "1", "net": "", "side": "top" if pd["side"] == "T" else "bottom", "through": False,
                 "shape": "circle" if pd.get("circle") else "rect", "x": pd["x"], "y": pd["y"], "w": pd["w"],
                 "h": pd["w"] if pd.get("circle") else pd["h"], "rot": 0}
            pads.append(r)
    members = {}
    for r in pads:
        if r["net"]:
            members.setdefault(r["net"], []).append(f'{r["ref"]}.{r["pin"]}')
    nets = [{"name": n, "members": sorted(members.get(n, []))} for n in sorted(D["nets"])]
    bridges = [{"nets": [a, b], "through": BRIDGE_THROUGH[(a, b)], "reason": why} for a, b, why in D["defects"]["shorts"]]
    from shapely.geometry import Polygon
    from direct.record import outline_ring
    return {"schema": 1, "backend": "direct",
            "board": {"outline": outline_ring(Polygon(D["outline"])), "thickness": BD["thickness"], "copperLayers": BD["layers"],
                      "finish": BD["finish"]},
            "parts": parts, "pads": pads, "nets": nets,
            "vias": [], "holes": [{"x": x, "y": y, "drill": MOUNT_R * 2, "plated": False, "role": "mount"} for x, y in MOUNT],
            "tracks": [], "jumpers": [], "bridges": bridges, "reads": reads,
            "slots": [{"id": "slot.lanyard", "kind": "routed", "x": sl["x"], "y": sl["y"], "w": sl["w"], "h": sl["h"],
                       "r": sl["r"], "rot": 0} for sl in SLOTS],
            "silk": [{"side": "top" if sd == "F" else "bottom", "text": s_["t"], "x": s_["x"], "y": s_["y"], "size": s_["s"],
                      "anchor": ANCHOR[s_["a"]], "rot": s_["rot"], "mirror": sd == "B",
                      "font": textpoly.FILES[(s_["f"], min(textpoly.FILES_W[s_["f"]], key=lambda w: abs(w - s_["wt"])))][:-6]}
                     for sd in ("F", "B") for s_ in SILK[sd]]}


def main():
    a = args("SHUNT R1 direct-emit generator")
    gates()
    print("SHUNT R1 gates")
    for w in WARN:
        print("  WARN " + w)
    if FAIL:
        for f in FAIL:
            print("  FAIL " + f)
        sys.exit("gates failed: %d. Nothing written." % len(FAIL))
    print("  geometry gates: PASS (%d warnings)" % len(WARN))
    ver = hbf_version()
    out = StagedOut(a.out)
    out.open()
    for side, fn, func in (("F", "shunt-F_Cu.gbr", "Copper,L1,Top"), ("B", "shunt-B_Cu.gbr", "Copper,L2,Bot")):
        g = FlashGerber(out.path(fn), func, a.epoch, ver, extra=ART)
        for feat in CU[side]:
            for ring in feat["rings"]:
                g.region(ring)
        for pd in layer_pads(side):
            pad_flash(g, pd)
        for v in VIAS:
            g.flash(g.aperture("C", v["d"]), v["x"], v["y"])
        g.close()
    for side, fn, func in (("F", "shunt-F_Mask.gbr", "Soldermask,Top"), ("B", "shunt-B_Mask.gbr", "Soldermask,Bot")):
        g = FlashGerber(out.path(fn), func, a.epoch, ver, extra=ART)
        for pd in layer_pads(side):
            pad_flash(g, pd, MASK_SWELL)
        for v in VIAS:
            g.flash(g.aperture("C", v["d"] + 2 * MASK_SWELL), v["x"], v["y"])
        g.close()
    for side, fn, func in (("F", "shunt-F_Paste.gbr", "Paste,Top"), ("B", "shunt-B_Paste.gbr", "Paste,Bot")):
        g = FlashGerber(out.path(fn), func, a.epoch, ver, extra=ART)
        for pd in PADS[side]:
            if smd(pd):
                pad_flash(g, pd, -PASTE_SHRINK)
        g.close()
    for side, fn, func in (("F", "shunt-F_Silkscreen.gbr", "Legend,Top"), ("B", "shunt-B_Silkscreen.gbr", "Legend,Bot")):
        silk_layer(out.path(fn), side, func, a.epoch, ver)
    g = FlashGerber(out.path("shunt-Edge_Cuts.gbr"), "Profile,NP", a.epoch, ver, extra=ART)
    g.path([tuple(p) for p in D["outline"]], 0.1, closed=True)
    for sl in SLOTS:
        g.path(slot_contour(sl), 0.1, closed=True)
    g.close()
    write_excellon(out.path("shunt-PTH.drl"), pth_holes(), True, "SHUNT R1")
    write_excellon(out.path("shunt-NPTH.drl"), [(x, y, MOUNT_R * 2) for x, y in MOUNT], False, "SHUNT R1")
    readme = README % (W, H, SLOTS[0]["w"], SLOTS[0]["h"])
    write_zip(out.path("shunt-art-gerbers.zip"), fab_members(out.dir) + [("README.txt", readme.encode())], a.epoch)
    write_json(out.path("record.json"), record())
    write_json(out.path("gates.json"), {"line": "geometry gates: PASS (%d warnings)" % len(WARN), "warnings": WARN,
                                        "parts": len(P), "padsF": len(PADS["F"]), "padsB": len(PADS["B"]),
                                        "holes": len(pth_holes()), "w": W, "h": H,
                                        # vias carry no net, so the record cannot hold them; the reparse reads them here
                                        "netlessVias": [[v["x"], v["y"], v["drill"]] for v in VIAS],
                                        # footprint origins and model names, for the lead landing check (CHK-BRD-19):
                                        # the record holds body centres, the placement transform needs the origin
                                        "placements": {p["ref"]: {"x": p["x"], "y": p["y"], "rot": p["rot"], "model": p["model"]} for p in P}})
    # The silk strings as drawn, so the reparse compares vertex sets with textpoly (check_fab.py section 6).
    os.makedirs(out.path("source"), exist_ok=True)
    write_json(out.path("source", "silk.json"), {side: [dict(s_, mirror=(side == "B")) for s_ in SILK[side]] for side in ("F", "B")})
    out.commit()


if __name__ == "__main__":
    main()
