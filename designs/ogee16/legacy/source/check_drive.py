"""Does the crank actually drive the bar?

This is the one interaction the interference audit CANNOT check, because a pin
riding in a slot is supposed to touch, so the pair is whitelisted, and a pin that
never engages at all looks exactly like a pin that engages perfectly.

So check it directly. The chain is:

    knob or servo horn
      -> crank, a plate rotating about the shaft axis
         -> drive pin, a boss at CRANK_R from that axis
            -> yoke, a horizontal slot in the bar's drive lug
               -> the bar, which can only move in Z

The yoke slot is horizontal, so it constrains the pin ONLY in Z and lets it slide
freely along the bar. That is the whole trick: the pin's Z is the bar's Z, and
the pin's sideways sweep is absorbed by the slot's length. Which gives two things
to prove, at every point in the stroke:

  1. the pin's Z equals the yoke centre's Z exactly, so the bar follows the crank
  2. the pin stays inside the slot's ends, so it never runs out of yoke

CRANK_SW is chosen so 2*R*sin(SW) = STROKE, which is what makes (1) exact rather
than approximate.
"""
import math, sys
import kin
from kin import P

def run(label, shaft_z, yoke_c, bar_ref, yoke0, yoke1, steps=41):
    R, S = P["CRANK_R"], P["STROKE"]
    half = (P["T"] + P["FIT_SLIP"]) / 2
    boss = (P["T"] + P["FIT_SLIP"]) - 0.75          # the printed pin
    bad, worst_dz, worst_end = [], 0.0, 9e9
    for k in range(steps):
        rise = S * k / (steps - 1)
        phi = math.radians(kin.crank_phi(rise))
        pin_u = bar_ref + R * math.cos(phi)         # along the bar
        pin_z = shaft_z + R * math.sin(phi)         # across it
        yoke_z = yoke_c + rise                      # the slot rides with the bar
        dz = pin_z - yoke_z
        end = min(pin_u - boss / 2 - yoke0, yoke1 - (pin_u + boss / 2))
        worst_dz = max(worst_dz, abs(dz))
        worst_end = min(worst_end, end)
        if abs(dz) > 1e-9 or end < 0.2:
            bad.append((rise, pin_u, dz, end))
    print(f"{label}")
    print(f"   yoke slot {yoke1-yoke0:.1f} long, {2*half:.2f} tall; pin {boss:.2f} across")
    print(f"   pin sweeps {bar_ref + R*math.cos(math.radians(kin.crank_phi(0))):+.2f} "
          f"to {bar_ref + R*math.cos(math.radians(kin.crank_phi(S/2))):+.2f} "
          f"along a slot running {yoke0:+.2f} to {yoke1:+.2f}")
    print(f"   worst |pin z - yoke z| over the stroke: {worst_dz:.2e} mm")
    print(f"   least clearance to a slot end:          {worst_end:.2f} mm")
    for rise, u, dz, end in bad[:6]:
        print(f"   !! rise {rise:5.2f}: pin at {u:+.2f}, dz {dz:+.4f}, end clearance {end:+.2f}")
    return bad

def latch(steps=21):
    """The latch crank turns about Z and pushes the plate in Y. Same idea rotated:
    the plate's drive slot is long across the push and tight along it."""
    R, SW, T = P["LCRANK_R"], P["LCRANK_SW"], P["T"]
    half, boss = (T + P["FIT_SLIP"]) / 2, (T + P["FIT_SLIP"]) - 0.75
    u0 = R*math.cos(math.radians(SW)) - 6
    u1 = R*math.cos(math.radians(SW)) + 6
    bad, worst_dy, worst_end = [], 0.0, 9e9
    for k in range(steps):
        lp = P["LP_SLIDE"] * k / (steps - 1)
        phi = math.asin(math.sin(math.radians(-SW)) + lp / R)
        pin_u, pin_v = R*math.cos(phi), R*math.sin(phi)
        slot_v = -R*math.sin(math.radians(SW)) + lp
        dy = pin_v - slot_v
        end = min(pin_u - boss/2 - u0, u1 - (pin_u + boss/2))
        worst_dy = max(worst_dy, abs(dy)); worst_end = min(worst_end, end)
        if abs(dy) > 1e-9 or end < 0.2: bad.append((lp, dy, end))
    print("LATCH drive: crank turns about Z, pin pushes the plate's drive slot")
    print(f"   crank z {P['LSV_SHAFT_Z']:.1f}..{P['LSV_SHAFT_Z']+T:.1f}, "
          f"plate z {P['LP_Z']:.1f}..{P['LP_Z']+T:.1f}, {P['LP_Z']-P['LSV_SHAFT_Z']-T:.1f} of air between")
    print(f"   throw {2*R*math.sin(math.radians(SW)):.3f} vs LP_SLIDE {P['LP_SLIDE']:.1f}")
    print(f"   worst |pin y - slot y|: {worst_dy:.2e} mm")
    print(f"   least clearance to a slot end: {worst_end:.2f} mm")
    return bad

if __name__ == "__main__":
    bad = []
    bad += run("ROW drive: crank turns about X, pin rides a slot in the row drive lug",
               P["RSV_Z"], P["RSV_Z"] - P["CRANK_R"] * math.sin(math.radians(P["CRANK_SW"])),
               P["ROW_BAR_Y"], P["ROW_BAR_Y"] - 8.3, P["ROW_BAR_Y"] - 1.7)
    print()
    bad += run("COLUMN drive: crank turns about Y, same slot in the column drive lug",
               P["CSV_Z"], P["CSV_Z"] - P["CRANK_R"] * math.sin(math.radians(P["CRANK_SW"])),
               P["COL_BAR_X"], P["COL_BAR_X"] - 8.3, P["COL_BAR_X"] - 1.7)
    print()
    bad += latch()
    print()
    print("DRIVE CHAIN OK" if not bad else f"{len(bad)} FAILURES")
    sys.exit(1 if bad else 0)
