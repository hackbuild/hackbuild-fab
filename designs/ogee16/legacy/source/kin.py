"""
OGEE R12 kinematics.  ONE source of truth for where every part is.

The viewer implements exactly these formulas in JS and asserts against the
numbers this file produces (see check_viewer.py).  Nothing in the sim is
allowed to place a part by any other route.

State variables
    zR[i]   row bar i rise, 0 .. STROKE
    zC[j]   column bar j rise, 0 .. STROKE
    lp      latch plate slide in +Y, 0 .. LP_SLIDE
    latched[i][j]
Everything else is solved.
"""
import math, re, os

def load_params(path=None):
    path = path or os.path.join(os.path.dirname(__file__), "params.scad")
    src = open(path).read()
    src = re.sub(r"//.*", "", src)
    env = {"sqrt": math.sqrt, "sin": lambda d: math.sin(math.radians(d)),
           "cos": lambda d: math.cos(math.radians(d)),
           "tan": lambda d: math.tan(math.radians(d)),
           "asin": lambda v: math.degrees(math.asin(v))}
    for stmt in src.split(";"):
        stmt = stmt.strip()
        m = re.match(r"^([A-Za-z_]\w*)\s*=\s*(.+)$", stmt, re.S)
        if not m:
            continue
        name, expr = m.group(1), m.group(2).strip()
        if name in ("function", "module") or expr.startswith("["):
            if expr.startswith("["):
                try: env[name] = eval(expr, {"__builtins__": {}}, dict(env))
                except Exception: pass
            continue
        try:
            env[name] = eval(expr, {"__builtins__": {}}, dict(env))
        except Exception:
            pass
    return env

P = load_params()
N       = int(P["N"]);  PITCH = P["PITCH"];  C = P["C"];  T = P["T"]
STROKE  = P["STROKE"];  R_LATCH = P["R_LATCH"];  ROD_Z = P["ROD_Z"]
CROWN_R = P["CROWN_R"]; CROWN_OFF = P["CROWN_OFF"]
CROWN_TOP = P["CROWN_TOP"]
PIN_PLAY = P["PIN_PLAY"]; RAMP_A = P["RAMP_A"]; PIN_W = P["PIN_W"]
LUG_P   = P["LUG_P"];  SLOT_E = P["SLOT_E"]; LP_SLIDE = P["LP_SLIDE"]
YOFF    = P["YOFF"];   LINK_R = P["LINK_R"]; ROW_SLOT_E = P["ROW_SLOT_E"]
CRANK_R = P["CRANK_R"]; CRANK_SW = P["CRANK_SW"]

def px(j): return j * PITCH
def py(i): return i * PITCH

# ---------------------------------------------------------------------------
# rocker.  Both pivots are fixed in X (the bars only translate in Z), so the
# pivot to pivot distance is forced and the row end slot takes up the change.
# The rocker's own half length is C, so its midpoint - and therefore the crown
# arc's centre - sits at colpivot + (C+CROWN_OFF) along the rocker axis.
# ---------------------------------------------------------------------------
def rocker(i, j, zR, zC):
    xa, za = px(j) - C, ROD_Z + zC[j]          # column pivot, located
    xb, zb = px(j) + C, ROD_Z + zR[i]          # row pivot, floating in the slot
    dx, dz = xb - xa, zb - za
    L = math.hypot(dx, dz)
    th = math.atan2(dz, dx)
    cx = xa + (C + CROWN_OFF) * math.cos(th)   # crown arc centre
    cz = za + (C + CROWN_OFF) * math.sin(th)
    return dict(theta=th, L=L, slot_use=L - 2 * C,
                origin=(xa + C * math.cos(th), za + C * math.sin(th)),
                crown=(cx, cz), crown_top=cz + CROWN_R,
                pivot_col=(xa, za), pivot_row=(xb, zb))

# ---------------------------------------------------------------------------
# pin.  Two degrees of freedom, y and z, and both are decided by geometry.
#   e   = crown y  -  pin y      (where the crown sits inside the foot slot)
#   the foot slot ceiling is a ramp, so the pin's height depends on e:
#       z(e) = crown_top - ceil_v(e + T/2)
#   ceil_v decreases with u, so the lowest z is at the most negative e, which
#   is the +Y stop.  That is the whole return spring: gravity down a ramp.
# ---------------------------------------------------------------------------
def ceil_v(u):
    return -(u - (T / 2 - PIN_PLAY)) * math.tan(math.radians(RAMP_A))

E_REST = -PIN_PLAY          # pin hard against its +Y stop
E_MAX  = +PIN_PLAY

# lateral travel the lug needs to slip past the latch plate's engaging edge
CAM = (PIN_W / 2 + LUG_P + PIN_PLAY) - SLOT_E
CAMLIFT = ceil_v(E_REST + T / 2) - ceil_v(E_REST + CAM + T / 2)

Z_LUG0 = P["Z_LUG0"]; LP_Z = P["LP_Z"]; LUG_TOT = P["LUG_TOT"]

def pin_state(i, j, zR, zC, lp, latched):
    """Returns (y, z_origin, e, cammed). z_origin is the pin's local v=0."""
    rk = rocker(i, j, zR, zC)
    free_top = rk["crown_top"]
    # rest height if the pin simply sits on the crown at its +Y stop
    z_on_crown = free_top - ceil_v(E_REST + T / 2)
    rise_free = z_on_crown - P["CROWN_TOP"]
    if latched:
        rise = max(rise_free, R_LATCH)
    else:
        rise = rise_free
    lug_bot = Z_LUG0 + rise
    lug_top = lug_bot + LUG_TOT
    plate_bot, plate_top = LP_Z + lp * 0, LP_Z + T
    # the lug is cammed aside for exactly as long as any part of it is inside
    # the plate's thickness AND the plate has not been pulled clear
    released = lp >= CAM + 0.05
    cammed = (not released) and (lug_top > plate_bot) and (lug_bot < plate_top)
    if latched and rise >= R_LATCH - 1e-9:
        cammed = False
    e = (E_REST + CAM) if cammed else E_REST
    z = free_top - ceil_v(e + T / 2) if not latched else max(
        free_top - ceil_v(e + T / 2), P["CROWN_TOP"] + R_LATCH)
    return dict(y=-e, z=z, e=e, cammed=cammed, rise=z - P["CROWN_TOP"],
                lug_bot=Z_LUG0 + (z - P["CROWN_TOP"]),
                on_crown=abs(z - (free_top - ceil_v(e + T / 2))) < 1e-9)

def can_latch(i, j, zR, zC):
    """Geometric latch test: the lug's flat face has to get above the plate."""
    st = pin_state(i, j, zR, zC, 0.0, False)
    return st["lug_bot"] >= LP_Z + T

# ---------------------------------------------------------------------------
# servo cranks.  Simple yoke: the crank pin rides a slot that is long along the
# bar and tight across it, so bar rise = CRANK_R * (sin phi - sin phi_rest).
# ---------------------------------------------------------------------------
PHI_REST = 180 + CRANK_SW
PHI_FULL = 180 - CRANK_SW
def crank_phi(rise):
    s = math.sin(math.radians(PHI_REST)) + rise / CRANK_R
    s = max(-1.0, min(1.0, s))
    return 180 - math.degrees(math.asin(s)) if s <= 0 else 180 - math.degrees(math.asin(s))

def crank_pin_row(i, rise):
    phi = math.radians(crank_phi(rise))
    return (P["RSV_CRK"], py(i) + YOFF + CRANK_R*math.cos(phi),
            P["RSV_Z"] + CRANK_R*math.sin(phi))

def crank_pin_col(j, rise):
    phi = math.radians(crank_phi(rise))
    return (px(j) - C + CRANK_R*math.cos(phi), P["CSV_CRK"],
            P["CSV_Z"] + CRANK_R*math.sin(phi))

if __name__ == "__main__":
    z0 = [0.0] * N
    print(f"CAM needed          {CAM:.3f} mm  (available {2*PIN_PLAY:.3f})")
    print(f"cam lift            {CAMLIFT:.3f} mm")
    full = [STROKE] * N
    r = rocker(0, 0, full, full)
    print(f"full select rise    {r['crown_top']-P['CROWN_TOP']:.3f} (target {STROKE})")
    r = rocker(0, 0, full, z0)
    print(f"half select rise    {r['crown_top']-P['CROWN_TOP']:.3f}  slot use {r['slot_use']:.3f}"
          f"  crown x {r['crown'][0]-px(0):+.3f}")
    st = pin_state(0, 0, full, z0, 0, False)
    print(f"half select lug top {st['lug_bot']+LUG_TOT:.3f}  plate top {LP_Z+T:.3f}"
          f"  margin {LP_Z+T-(st['lug_bot']+LUG_TOT):.3f}")
    st = pin_state(0, 0, full, full, 0, False)
    print(f"full select lug bot {st['lug_bot']:.3f}  plate top {LP_Z+T:.3f}"
          f"  overshoot {st['lug_bot']-(LP_Z+T):.3f}")
    print(f"rest lug top        {Z_LUG0+LUG_TOT:.3f}  plate bottom {LP_Z:.3f}")
    print("latch matrix (row0/col0 driven):",
          [[1 if can_latch(i,j,[STROKE,0,0,0],[STROKE,0,0,0]) else 0
            for j in range(N)] for i in range(N)])
