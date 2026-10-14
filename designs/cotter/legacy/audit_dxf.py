#!/usr/bin/env python3
"""Audit every DXF: loads in ezdxf as AC1024, passes its auditor, millimetres, only closed LWPOLYLINEs on the four known layers,
unique handles under $HANDSEED, and the drawing extents match the SVG twin."""
import sys, glob, os, re, ezdxf
from ezdxf import bbox
bad = 0
for f in sorted(glob.glob(os.path.join(sys.argv[1], '*.dxf'))):
    doc = ezdxf.readfile(f); aud = doc.audit(); msp = doc.modelspace(); ents = list(msp); probs = []
    if doc.dxfversion != 'AC1024': probs.append('version ' + doc.dxfversion)
    if aud.has_errors: probs.append('%d audit errors' % len(aud.errors))
    if aud.has_fixes: probs.append('%d audit fixes' % len(aud.fixes))
    if doc.header.get('$INSUNITS') != 4: probs.append('units')
    kinds = {e.dxftype() for e in ents}; layers = {e.dxf.layer for e in ents}
    if kinds - {'LWPOLYLINE'}: probs.append('entity types %s' % kinds)
    if layers - {'CUT', 'ETCH', 'LIGHT', 'SCORE'}: probs.append('layers %s' % layers)
    if any(not e.closed for e in ents): probs.append('open polyline')
    hs = [int(e.dxf.handle, 16) for e in ents]; seed = int(doc.header['$HANDSEED'], 16)
    if len(set(hs)) != len(hs) or max(hs) >= seed: probs.append('handles')
    ext = bbox.extents(ents); w, h = ext.extmax.x - ext.extmin.x, ext.extmax.y - ext.extmin.y
    twin = f[:-4] + '.svg'; twin = twin if os.path.exists(twin) else os.path.join(os.path.dirname(os.path.dirname(f)), os.path.basename(f)[:-4] + '.svg'); svg = open(twin).read(); m = re.search(r'width="([\d.]+)mm" height="([\d.]+)mm"', svg); sw, sh = float(m.group(1)) - 10, float(m.group(2)) - 10
    if abs(w - sw) > 0.6 or abs(h - sh) > 0.6: probs.append('extents %.1f x %.1f vs svg %.1f x %.1f' % (w, h, sw, sh))
    n = {l: sum(1 for e in ents if e.dxf.layer == l) for l in sorted(layers)}
    print(f'{os.path.basename(f):28s} {doc.dxfversion} {len(ents):4d} polylines {n}  {w:7.1f} x {h:6.1f} mm  ' + ('ok' if not probs else 'PROBLEM: ' + '; '.join(probs))); bad += bool(probs)
print('DXF failures:', bad); sys.exit(1 if bad else 0)
