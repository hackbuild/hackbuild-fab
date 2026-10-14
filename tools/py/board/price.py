#!/usr/bin/env python3
"""Board cost estimator. Constants are a 2026 snapshot of JLCPCB public
pricing; ALWAYS verify at order time. Usage:

    from price import estimate, Line
    est = estimate(board_w=36, board_h=36, layers=2, qty_pcb=5, qty_asm=5,
        enig=True, two_sided_smd=False,
        lines=[Line("MMBT3904", cls="basic", qty=2, joints=3, unit=0.02), ...])
    print(est["report"])

cls: basic | preferred | extended | tht
joints = solder joints PER PART INSTANCE. unit = USD per part.
CLI: python3 price.py demo
"""
from dataclasses import dataclass
from datetime import date

SNAPSHOT = "2026-08"
C = dict(
    pcb_2l_100 = 4.0,      # 2-layer <=100x100mm, qty 5, typical non-promo
    pcb_4l_50 = 8.0,       # 4-layer <=50x50mm, qty 5
    enig = 18.0,
    econ_setup = 8.0,
    std_setup = 25.0,
    stencil = 1.5,
    ext_loading = 3.0,     # per distinct non-preferred extended part (economic)
    std_loading = 1.5,     # per distinct part, standard assembly
    smt_joint = 0.0017,
    tht_labor = 3.50,
    tht_joint = 0.0173,
    attrition = 0.03,      # smalls scrap allowance on parts cost
)

@dataclass
class Line:
    name: str
    cls: str        # basic | preferred | extended | tht
    qty: int        # per board
    joints: int     # per part instance
    unit: float     # USD each

def estimate(board_w, board_h, layers, qty_pcb, qty_asm, lines,
             enig=False, two_sided_smd=False, has_qfn_bga=False):
    warn = []
    if board_w > 100 or board_h > 100:
        warn.append("board exceeds 100x100mm: 2-layer price break lost, expect a step up")
    if layers <= 2:
        pcb = C["pcb_2l_100"]
    elif board_w <= 50 and board_h <= 50:
        pcb = C["pcb_4l_50"]
    else:
        pcb = C["pcb_4l_50"] * 3
        warn.append("4+ layers over 50x50mm: rough estimate only")
    if enig:
        pcb += C["enig"]

    standard = two_sided_smd
    if standard:
        warn.append("SMD on both sides forces STANDARD assembly (higher setup + loading on every part)")
    if has_qfn_bga:
        warn.append("QFN/BGA present: X-ray inspection fee applies, not modeled")

    smt = [l for l in lines if l.cls != "tht"]
    tht = [l for l in lines if l.cls == "tht"]
    setup = C["std_setup"] if standard else C["econ_setup"]
    if standard:
        loading = C["std_loading"] * len(lines)
    else:
        loading = C["ext_loading"] * len([l for l in smt if l.cls == "extended"])
    smt_joints = sum(l.qty * l.joints for l in smt) * qty_asm
    tht_joints = sum(l.qty * l.joints for l in tht) * qty_asm
    joints_cost = smt_joints * C["smt_joint"] + tht_joints * C["tht_joint"]
    tht_labor = C["tht_labor"] if tht else 0.0
    parts = sum(l.qty * l.unit for l in lines) * qty_asm * (1 + C["attrition"])
    asm = setup + C["stencil"] + loading + joints_cost + tht_labor
    total = pcb + asm + parts

    rep = [f"COST ESTIMATE (constants snapshot {SNAPSHOT}, printed {date.today()}; verify at order)",
           f"  PCB {layers}L {board_w}x{board_h}mm qty {qty_pcb}"
           + (" ENIG" if enig else "") + f": ${pcb:.2f}",
           f"  Assembly ({'standard' if standard else 'economic'}) qty {qty_asm}:"
           f" setup ${setup:.2f} + stencil ${C['stencil']:.2f}"
           f" + loading ${loading:.2f} + joints ${joints_cost:.2f}"
           + (f" + THT labor ${tht_labor:.2f}" if tht_labor else "")
           + f" = ${asm:.2f}",
           f"  Parts (incl {int(C['attrition']*100)}% attrition): ${parts:.2f}",
           f"  TOTAL ${total:.2f}  (${total/max(qty_asm,1):.2f}/assembled board)"]
    for w in warn:
        rep.append(f"  FLAG: {w}")
    return dict(pcb=pcb, asm=asm, parts=parts, total=total,
                per_board=total / max(qty_asm, 1), warnings=warn,
                report="\n".join(rep))

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "demo":
        demo = [
            Line("CR2032 holder 3034", "extended", 1, 3, 0.55),
            Line("JS102011 switch", "extended", 1, 3, 0.12),
            Line("MMBT3904", "basic", 2, 3, 0.01),
            Line("R 0805", "basic", 4, 2, 0.002),
            Line("C 10uF 0805", "basic", 2, 2, 0.01),
            Line("LED 0603 pink", "extended", 4, 2, 0.03),
        ]
        est = estimate(36, 36, 2, 5, 5, demo, enig=True, two_sided_smd=True)
        print(est["report"])
