"""DERRICK assembly: forward kinematics, self collision sweep, static torque budget,
STL export and the viewer payload."""
import base64, json, os
import numpy as np
import trimesh
import pintle_parts as pp
import arm_parts as ap
from pintle_parts import P, D

OUT = '/home/claude/out'
os.makedirs(OUT, exist_ok=True)
RHO = 1.27e-3      # PETG, g per mm3
SERVO_G = 9.0      # SG90 class
H = ap.H

# ------------------------------------------------------------------ frame helpers
def T(t):
    m = np.eye(4); m[:3, 3] = t; return m

def R(cols, t=(0, 0, 0)):
    m = np.eye(4); m[:3, 0], m[:3, 1], m[:3, 2] = cols; m[:3, 3] = t; return m

def Rz(q):
    c, s = np.cos(q), np.sin(q)
    return np.array([[c, -s, 0, 0], [s, c, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]])

# hinge mating: the hinge cheek's outer face lands on the previous output face, so the new
# axis comes out perpendicular to the old one
HINGE_R = [(0, -1, 0), (0, 0, -1), (1, 0, 0)]
def M_hinge():
    r = R(HINGE_R)
    off = r[:3, :3] @ np.array([0.0, ap.IFACE_Y, ap.ZI])
    return R(HINGE_R, np.array([0, 0, H]) - off)

# spar mating: the pad's underside lands on the previous output face, so the new axis is
# parallel to the old one and the beam reaches out in the plane of rotation
SPAR_R = [(1, 0, 0), (0, -1, 0), (0, 0, -1)]
def M_spar(L):
    r = R(SPAR_R)
    off = r[:3, :3] @ np.array([-L, 0.0, ap.PAD_Z])
    return R(SPAR_R, np.array([0, 0, H]) - off)

JOINTS = ['J1 base yaw', 'J2 shoulder pitch', 'J3 elbow pitch', 'J4 wrist pitch', 'J5 wrist roll']
MATES = [M_hinge(), M_spar(ap.L1), M_spar(ap.L2), M_hinge()]
BRACKET = ['gudgeon', 'hinge', 'spar-upper', 'spar-fore', 'hinge']

def frames(q):
    """world frame of each joint, one per module, plus the tool frame"""
    fs, f = [], np.eye(4)
    for i in range(5):
        fs.append(f)
        if i < 4:
            f = f @ Rz(q[i]) @ MATES[i]
    tool = fs[4] @ Rz(q[4]) @ T([0, 0, H])
    return fs, tool

# ------------------------------------------------------------------ part library
print('building parts')
MOD = {k: pp.PARTS[k]() for k in ['stator', 'rotor', 'belly']}
MOD['retainer'] = pp.retainer_locked()
M2L = pp.screw(2.0, 12.0)     # interface lock, through a bracket pad into the rotor face
HSC = pp.screw(2.30, 7.50, 4.60, 1.50)   # stock servo horn screw
M2C = pp.screw(2.0, 8.0)      # cradle slide stop
M3B = pp.screw(3.0, 12.0, 5.50, 2.60)
HW = {'m2x12': M2L, 'm2x8': M2C, 'm3x12': M3B, 'hornscrew': HSC}
FLIP = trimesh.transformations.rotation_matrix(np.pi, [1, 0, 0])


def hardware(i):
    """every fastener the module and its bracket actually need, in the joint frame"""
    out = []
    out.append(('hornscrew', T([0, 0, pp.D['hs_step']])))
    cs = pp.D['cradle_screw']
    out.append(('m2x8', T([cs[0], cs[1], -ap.FT]) @ FLIP))
    return out
SERVO = pp.servo()
HORN = pp.horn()
BRK = {k: ap.PARTS[k]() for k in ap.PARTS}
for k, m in list(MOD.items()) + list(BRK.items()):
    print(f'  {k:11s} wt {m.is_watertight}  bodies {m.body_count}  vol {m.volume / 1000:6.2f} cm3')

def instances(q):
    """(name, mesh, world transform, mass g, is_static_within_joint) for the whole arm"""
    fs, tool = frames(q)
    out = []
    for i, f in enumerate(fs):
        tag = f'J{i + 1}'
        for k in ['stator', 'retainer', 'belly']:
            out.append((f'{tag} {k}', MOD[k], f, MOD[k].volume * RHO))
        out.append((f'{tag} rotor', MOD['rotor'], f @ Rz(q[i]), MOD['rotor'].volume * RHO))
        out.append((f'{tag} servo', SERVO, f, SERVO_G))
        out.append((f'{tag} horn', HORN, f @ Rz(q[i]), 0.60))
        b = BRACKET[i]
        out.append((f'{tag} {b}', BRK[b], f, BRK[b].volume * RHO))
        for hk, hm in hardware(i):
            fr = f @ Rz(q[i]) if hk == 'hornscrew' else f
            out.append((f'{tag} {hk}', HW[hk], fr @ hm,
                        0.35 if hk.startswith('m2') else (0.45 if hk == 'hornscrew' else 1.1)))
        if i > 0:
            out.append((f'J{i} m2x12', HW['m2x12'],
                        fs[i - 1] @ Rz(q[i - 1]) @ T([pp.D['lock_r'] * np.cos(pp.D['lock_a']), pp.D['lock_r'] * np.sin(pp.D['lock_a']), H + ap.PAD_TH]), 0.5))
    out.append(('tool plate', BRK['tool-plate'], tool, BRK['tool-plate'].volume * RHO))
    out.append(('J5 m2x12b', HW['m2x12'], fs[4] @ Rz(q[4]) @ T([pp.D['lock_r'] * np.cos(pp.D['lock_a']), pp.D['lock_r'] * np.sin(pp.D['lock_a']), H + ap.PAD_TH]), 0.5))
    for (fx, fy) in ((ap.BASE_X0 + 7, ap.BASE_Y - 7), (ap.BASE_X0 + 7, -ap.BASE_Y + 7),
                     (ap.BASE_X1 - 7, ap.BASE_Y - 7), (ap.BASE_X1 - 7, -ap.BASE_Y + 7)):
        out.append(('base m3x12', HW['m3x12'], T([fx, fy, -ap.FT]), 1.1))
    return out, fs, tool

# ------------------------------------------------------------------ poses
HOME = np.radians([0, -50, 80, -30, 0])
POSES = {
    'home': HOME,
    'stow': np.radians([0, -88, 88, -88, 0]),
    'reach out': np.radians([0, 0, 0, 0, 0]),
    'reach up': np.radians([0, -88, 0, 0, 0]),
    'reach down': np.radians([0, 45, 45, 45, 0]),
    'twist': np.radians([45, -50, 80, -30, 88]),
    'elbow in': np.radians([0, -20, 88, -60, 45]),
}

print('\n--- reach and tool pose ---')
for name, q in POSES.items():
    _, fs, tool = instances(q)
    p = tool[:3, 3]
    print(f'  {name:11s} tool at x {p[0]:7.1f}  y {p[1]:7.1f}  z {p[2]:7.1f}   '
          f'reach from base axis {np.hypot(p[0], p[1]):6.1f}  height {p[2]:6.1f}')

# ------------------------------------------------------------------ mass and torque
def world_mesh(mesh, M):
    c = mesh.copy(); c.apply_transform(M); return c

print('\n--- mass ---')
inst, _, _ = instances(HOME)
printed = sum(m for n, _, _, m in inst if 'servo' not in n)
servos = sum(m for n, _, _, m in inst if 'servo' in n)
print(f'  printed {printed:6.1f} g in PETG      servos {servos:5.1f} g      '
      f'total {printed + servos:6.1f} g plus screws and inserts')

def torque_table(q):
    """static torque each joint has to hold, in kg cm, from real part centroids"""
    inst, fs, tool = instances(q)
    coms, masses, owner = [], [], []
    for idx, (name, mesh, M, mass) in enumerate(inst):
        c = mesh.center_mass if 'servo' not in name else np.array([5.5, 0.0, 13.0])
        coms.append((M[:3, :3] @ c) + M[:3, 3])
        masses.append(mass)
        owner.append(int(name[1]) if name.startswith('J') else (0 if name.startswith('base') else 6))
    coms, masses, owner = np.array(coms), np.array(masses), np.array(owner)
    rows = []
    for j in range(5):
        axis = fs[j][:3, 2]
        origin = fs[j][:3, 3]
        # everything the joint carries: the rotor of this joint and every part after it
        sel = owner > (j + 1)
        if j < 5:
            sel = sel | ((owner == j + 1) & np.array(['rotor' in n for n, _, _, _ in inst]))
        m_d = masses[sel].sum()
        r = coms[sel] - origin
        Fg = np.array([0.0, 0.0, -9.81e-3]) * masses[sel][:, None] * 1000.0 / 1000.0  # N per g*mm scale
        tau = np.cross(r, np.array([[0.0, 0.0, -1.0]]) * masses[sel][:, None])         # g mm
        tq = float(np.dot(tau.sum(axis=0), axis))                                       # g mm about the axis
        rows.append((JOINTS[j], m_d, abs(tq) / 10000.0, abs(tq)))
    return rows

print('\n--- static torque, worst case is the load a servo must hold, not move ---')
print('  SG90 stall 1.8 kg cm, MG90S stall 2.2 kg cm, useful holding budget is about a third of stall')
for name, q in [('home', HOME), ('reach out', POSES['reach out']), ('reach up', POSES['reach up'])]:
    print(f'  pose {name}')
    for jn, md, kgcm, gmm in torque_table(q):
        bar = 'OVER STALL' if kgcm > 1.8 else ('over budget' if kgcm > 0.6 else 'ok')
        print(f'    {jn:18s} carries {md:6.1f} g   holds {kgcm:5.2f} kg cm   {bar}')

# ------------------------------------------------------------------ self collision
def aabb(mesh, M):
    c = trimesh.bounds.corners(mesh.bounds)
    w = (M[:3, :3] @ c.T).T + M[:3, 3]
    return w.min(axis=0), w.max(axis=0)

def overlap(a, b, pad=0.0):
    return np.all(a[0] - pad <= b[1]) and np.all(b[0] - pad <= a[1])

print('\n--- self collision sweep ---')
bad = 0
for name, q in POSES.items():
    inst, _, _ = instances(q)
    boxes = [aabb(m, M) for _, m, M, _ in inst]
    hits = []
    for i in range(len(inst)):
        for j in range(i + 1, len(inst)):
            ni, nj = inst[i][0], inst[j][0]
            gi, gj = ni.split()[0], nj.split()[0]
            if gi == gj:
                continue                      # same joint, already verified in the module
            if 'm2x' in ni or 'm2x' in nj or 'm3x' in ni or 'm3x' in nj:
                continue    # self tappers are modelled at nominal diameter into an undersized
                            # pilot, so their thread engagement reads as overlap by design
            if abs(int(gi[1]) if gi[0] == 'J' else 6) - (int(gj[1]) if gj[0] == 'J' else 6) == 0:
                continue
            if not overlap(boxes[i], boxes[j], -0.05):
                continue
            a, b = world_mesh(inst[i][1], inst[i][2]), world_mesh(inst[j][1], inst[j][2])
            v = pp.inter(a, b)
            vol = 0.0 if v is None or v.is_empty else float(v.volume)
            if vol > 1.0:
                hits.append((ni, nj, vol))
    if hits:
        bad += len(hits)
        for ni, nj, v in hits:
            print(f'  {name:11s} {ni:18s} into {nj:18s} {v:9.1f} mm3   <-- CLASH')
    else:
        print(f'  {name:11s} clear')

print('\n--- fold sweep, elbow against upper arm and shoulder ---')
sweep_bad = 0
for q3 in np.radians(np.arange(-90, 91, 30)):
    for q4 in np.radians(np.arange(-90, 91, 45)):
        q = np.array([0.0, np.radians(-40), q3, q4, np.radians(60)])
        inst, _, _ = instances(q)
        boxes = [aabb(m, M) for _, m, M, _ in inst]
        worst = 0.0
        for i in range(len(inst)):
            for j in range(i + 1, len(inst)):
                gi, gj = inst[i][0].split()[0], inst[j][0].split()[0]
                if gi == gj or not overlap(boxes[i], boxes[j], -0.05):
                    continue
                if 'm2x' in inst[i][0] or 'm2x' in inst[j][0] or 'm3x' in inst[i][0] or 'm3x' in inst[j][0]:
                    continue
                v = pp.inter(world_mesh(inst[i][1], inst[i][2]), world_mesh(inst[j][1], inst[j][2]))
                vol = 0.0 if v is None or v.is_empty else float(v.volume)
                if vol > worst:
                    worst = vol
                    pair = (inst[i][0], inst[j][0])
        tag = 'clear' if worst <= 1.0 else f'CLASH {worst:8.1f} mm3  {pair[0]} into {pair[1]}'
        if worst > 1.0:
            sweep_bad += 1
        print(f'  q3 {np.degrees(q3):5.0f}  q4 {np.degrees(q4):5.0f}   {tag}')
print('  fold sweep clashes:', sweep_bad)

# ------------------------------------------------------------------ exports
print('\n--- exports ---')
for k, m in BRK.items():
    e = m.copy()
    if k.startswith('spar'):
        e.apply_transform(trimesh.transformations.rotation_matrix(np.pi, [1, 0, 0]))
    elif k == 'hinge':
        e.apply_transform(trimesh.transformations.rotation_matrix(-np.pi / 2, [1, 0, 0]))
    e.apply_translation([0, 0, -e.bounds[0][2]])
    p = f'{OUT}/derrick-{k}.stl'
    e.export(p)
    print(f'  {p}  {os.path.getsize(p) / 1024:.0f} KB  bbox {np.round(e.extents, 1)}')

# ------------------------------------------------------------------ viewer payload
def q16(m):
    v = np.asarray(m.vertices, float); f = np.asarray(m.faces, np.int64)
    lo, hi = v.min(axis=0), v.max(axis=0)
    qv = np.round((v - lo) / np.maximum(hi - lo, 1e-6) * 32767).astype('<i2')
    assert v.shape[0] < 65536
    return dict(nv=int(v.shape[0]), nf=int(f.shape[0]),
                lo=[round(x, 4) for x in lo], hi=[round(x, 4) for x in hi],
                v=base64.b64encode(qv.tobytes()).decode(),
                f=base64.b64encode(f.astype('<u2').tobytes()).decode(),
                vol=round(float(m.volume) / 1000, 3),
                com=[round(x, 3) for x in m.center_mass])

lib = {}
for k, m in MOD.items():
    lib[k] = q16(m)
lib['servo'] = q16(SERVO)
for k, m in BRK.items():
    lib[k] = q16(m)
for k, m in HW.items():
    lib[k] = q16(m)
lib['horn'] = q16(HORN)

chain = []
for i in range(5):
    chain.append(dict(name=JOINTS[i], mate=(MATES[i - 1].tolist() if i else np.eye(4).tolist()),
                      bracket=BRACKET[i]))
payload = dict(
    lib=lib,
    joints=[dict(name=JOINTS[i], bracket=BRACKET[i],
                 mate=(MATES[i - 1].flatten().round(5).tolist() if i > 0 else np.eye(4).flatten().tolist()))
            for i in range(5)],
    tool=dict(mate=T([0, 0, H]).flatten().tolist(), part='tool-plate'),
    hardware=dict(
        m2x8=list(pp.D['cradle_screw']) + [-ap.FT],
        m2x12=[float(pp.D['lock_r'] * np.cos(pp.D['lock_a'])),
               float(pp.D['lock_r'] * np.sin(pp.D['lock_a'])), H + ap.PAD_TH],
        hornscrew=[0.0, 0.0, pp.D['hs_step']],
        pad_th=ap.PAD_TH,
        base=[[ap.BASE_X0 + 7, ap.BASE_Y - 7], [ap.BASE_X0 + 7, -ap.BASE_Y + 7],
              [ap.BASE_X1 - 7, ap.BASE_Y - 7], [ap.BASE_X1 - 7, -ap.BASE_Y + 7]],
        base_z=-ap.FT),
    horn_z=[pp.D['boss_top'], pp.D['horn_arm_z1']],
    home=[round(float(x), 4) for x in HOME],
    rho=RHO, servo_g=SERVO_G, H=H,
    hw_mass=dict(m2x8=0.35, m2x12=0.5, m3x12=1.1, horn=0.60, hornscrew=0.45),
    poses={k: [round(float(x), 4) for x in v] for k, v in POSES.items()},
)
ref = {}
for name, q in POSES.items():
    _, fs, tool = instances(q)
    ref[name] = dict(q=[round(float(x), 6) for x in q],
                     tool=[round(float(x), 3) for x in tool[:3, 3]],
                     torque=[round(float(r[2]), 4) for r in torque_table(q)])
json.dump(ref, open(f'{OUT}/arm_ref.json', 'w'), indent=1)
blob = json.dumps(payload, separators=(',', ':'))
open(f'{OUT}/arm_data.json', 'w').write(blob)
print(f'\npayload {len(blob) / 1024:.0f} KB   clashes {bad}')
