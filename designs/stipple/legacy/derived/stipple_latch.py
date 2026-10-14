"""Recompute STIPPLE R17 and R17b latch numbers from the DATA.P block each page ships.
Port of rodState() in the page. Run: python3 stipple_latch.py"""
import json, math, os
HERE = os.path.dirname(os.path.abspath(__file__))
def load(p):
    s = open(p).read(); i = s.index('const DATA=') + len('const DATA=')
    return json.JSONDecoder().raw_decode(s[i:])[0]
out = {}
for name in ['stipple.html', 'stipple (1).html']:
    d = load(os.path.join(HERE, '..', 'stipple', name)); P = d['P']; g = P.__getitem__
    T = g('T'); D2R = math.pi / 180
    ceil_v = lambda u: -(u - (T/2 - g('PIN_PLAY'))) * math.tan(g('RAMP_A') * D2R)
    CAM = (g('PIN_W')/2 + g('LUG_P') + g('PIN_PLAY')) - g('SLOT_E')
    CAMLIFT = CAM * math.tan(g('RAMP_A') * D2R)
    def rod(zr, zc):
        zb = g('RT_FLOOR') + zr + g('BOSS_R'); za = g('CT_FLOOR') + zc + g('NOSE_R')
        dz = zb - za; span = math.sqrt(max(g('LINK_L')**2 - dz*dz, 0))
        free = (za + zb)/2 + g('CROWN_R'); lugBot = g('Z_LUG0') + free - g('CROWN_TOP')
        cammed = (lugBot + g('LUG_TOT') > g('LP_Z')) and (lugBot < g('LP_Z') + g('LP_T'))
        e = -g('PIN_PLAY') + (CAM if cammed else 0)
        z = free - ceil_v(e + T/2)
        return dict(rise=free - g('CROWN_TOP'), lugBot=g('Z_LUG0') + z - g('CROWN_TOP'),
                    tilt=math.degrees(math.atan2(dz, span)))
    S = g('STROKE'); top = g('LP_Z') + g('LP_T')
    half, full = rod(S, 0), rod(S, S)
    margin = top - (half['lugBot'] + g('LUG_TOT')); overshoot = full['lugBot'] - top
    out[name] = dict(STROKE=S, R_LATCH=g('R_LATCH'), LUG_TOT=g('LUG_TOT'), CAM=round(CAM, 4),
        camlift=round(CAMLIFT, 4), half_rise=round(half['rise'], 4), full_rise=round(full['rise'], 4),
        margin=round(margin, 4), overshoot=round(overshoot, 4), tilt_max=round(half['tilt'], 3),
        identity_lhs=round(margin + overshoot, 4),
        identity_rhs_stroke_half=round(S/2 - CAMLIFT - g('LUG_TOT'), 4),
        identity_rhs_general=round(full['rise'] - half['rise'] - CAMLIFT - g('LUG_TOT'), 4),
        XDRIFT=g('XDRIFT'), box=[g('BX1') - g('BX0'), g('BY1') - g('BY0'), g('WALL_TOP')])
print(json.dumps(out, indent=1))
