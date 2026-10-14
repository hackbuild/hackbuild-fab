/* kit.js: turning built modules into files. print pose, STL, laser SVG, paper inserts, names.
 * No kernel calls in here, so all of it is synchronous and cheap. */
(function (root) {
  'use strict';
  const KIT = {};
  const ROT = { faceDown: p => [p[0], -p[1], -p[2]], upright: p => [p[0], -p[2], p[1]], upsideDown: p => [p[0], p[2], -p[1]], back: p => [p[0], p[1], p[2]], side: p => [-p[2], p[1], p[0]], end: p => [-p[2], p[1], p[0]] };
  KIT.ORIENT_NOTE = { faceDown: 'face down on the bed, the art is the first layer', upright: 'upright as it hangs, no supports', upsideDown: 'upside down, channel opening up, no supports', back: 'on its back, no supports', side: 'on its side, pegs flat on the bed, no supports', end: 'standing on its end, the same profile all the way up, no supports' };
  KIT.ORIENT_SHORT = { faceDown: 'face down', upright: 'upright', upsideDown: 'inverted', back: 'on its back', side: 'on its side', end: 'on its end' };
  /* rotate a print's parts into the pose they print in, bed at z = 0, centred in XY. all parts share one transform */
  KIT.orient = function (parts, orient) { const f = ROT[orient] || ROT.back; let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; const out = parts.map(pt => { const a = pt.mesh.positions, b = new Float32Array(a.length);
      for (let i = 0; i < a.length; i += 3) { const q = f([a[i], a[i + 1], a[i + 2]]); b[i] = q[0]; b[i + 1] = q[1]; b[i + 2] = q[2]; for (let k = 0; k < 3; k++) { if (q[k] < mn[k]) mn[k] = q[k]; if (q[k] > mx[k]) mx[k] = q[k]; } } return { name: pt.name, slot: pt.slot, positions: b, indices: pt.mesh.indices, volume: pt.mesh.volume, area: pt.mesh.area }; });
    const cx = (mn[0] + mx[0]) / 2, cy = (mn[1] + mx[1]) / 2; for (const o of out) { const b = o.positions; for (let i = 0; i < b.length; i += 3) { b[i] -= cx; b[i + 1] -= cy; b[i + 2] -= mn[2]; } }
    return { parts: out, size: [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]] }; };
  KIT.slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  KIT.qty = n => 'x' + String(n).padStart(2, '0');

  // ---------- laser SVG. red hairline = cut, black fill = etch, blue fill = optional light etch, green hairline = score. mm, 1:1
  const pathOf = (rings, H, ox, oy) => rings.map(r => 'M' + r.map(p => (ox + p[0]).toFixed(3) + ' ' + (oy + H - p[1]).toFixed(3)).join('L') + 'Z').join('');
  KIT.laserSVG = function (parts, title) { let x = 5, H = 0; const gap = 6, place = []; for (const p of parts) for (let q = 0; q < (p.qty || 1); q++) { place.push([p, x]); x += p.w + gap; H = Math.max(H, p.h); }
    const W = x - gap + 5; H += 10; let s = '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="' + W.toFixed(2) + 'mm" height="' + H.toFixed(2) + 'mm" viewBox="0 0 ' + W.toFixed(2) + ' ' + H.toFixed(2) + '">\n<title>' + title + '</title>\n';
    for (const [p, px] of place) { const oy = H - 5 - p.h; s += '<g id="' + KIT.slug(p.name) + '">\n';
      if (p.light && p.light.length) s += '<path d="' + pathOf(p.light, p.h, px, oy) + '" fill="#0000ff" fill-rule="evenodd" stroke="none"/>\n';
      if (p.engrave && p.engrave.length) s += '<path d="' + pathOf(p.engrave, p.h, px, oy) + '" fill="#000000" fill-rule="evenodd" stroke="none"/>\n';
      if (p.score && p.score.length) s += '<path d="' + pathOf(p.score, p.h, px, oy) + '" fill="none" stroke="#00aa00" stroke-width="0.1"/>\n';
      const inner = [], outer = []; for (const r of p.cut) { let a = 0; for (let i = 0; i < r.length; i++) { const u = r[i], v = r[(i + 1) % r.length]; a += u[0] * v[1] - v[0] * u[1]; } (a < 0 ? inner : outer).push(r); }
      for (const grp of [inner, outer]) if (grp.length) s += '<path d="' + pathOf(grp, p.h, px, oy) + '" fill="none" stroke="#ff0000" stroke-width="0.1"/>\n'; s += '</g>\n'; }
    return s + '</svg>\n'; };

  // ---------- laser DXF. AutoCAD 2010 / 2011 / 2012 format (AC1024), ASCII, millimetres. the skeleton (header, tables, blocks, objects) was
  // written by ezdxf so AutoCAD accepts it; this only pours closed LWPOLYLINEs into ENTITIES. layers: CUT red, ETCH white, LIGHT blue, SCORE green.
  // inner cuts come before outer cuts, and etch regions are closed outlines for the laser software to fill.
  KIT.laserDXF = function (parts, title) { const D = root.DXF_TEMPLATE; let x = 5, handle = D.first; const gap = 6, ent = [], num = v => (Math.round(v * 10000) / 10000).toString();
    const pl = (ring, layer, ox, oy) => { if (ring.length < 3) return; const h = (handle++).toString(16).toUpperCase(); let e = '  0\nLWPOLYLINE\n  5\n' + h + '\n330\n' + D.owner + '\n100\nAcDbEntity\n  8\n' + layer + '\n100\nAcDbPolyline\n 90\n' + ring.length + '\n 70\n1\n 43\n0\n'; for (const q of ring) e += ' 10\n' + num(ox + q[0]) + '\n 20\n' + num(oy + q[1]) + '\n'; ent.push(e); };
    for (const p of parts) for (let c = 0; c < (p.qty || 1); c++) { const ox = x, oy = 5; for (const r of (p.light || [])) pl(r, 'LIGHT', ox, oy); for (const r of (p.engrave || [])) pl(r, 'ETCH', ox, oy); for (const r of (p.score || [])) pl(r, 'SCORE', ox, oy);
      const inner = [], outer = []; for (const r of p.cut) { let a = 0; for (let i = 0; i < r.length; i++) { const u = r[i], v = r[(i + 1) % r.length]; a += u[0] * v[1] - v[0] * u[1]; } (a < 0 ? inner : outer).push(r); } for (const r of inner.concat(outer)) pl(r, 'CUT', ox, oy); x += p.w + gap; }
    return D.tpl.replace('{{ENTITIES}}', ent.join('')).replace('{{SEED}}', (handle + 16).toString(16).toUpperCase()); };

  // ---------- paper inserts, drawn in the GANTRY light theme with outlined type and the real mark
  const C = { paper: '#f4efe3', ink: '#15120f', ash: '#4a4236', smoke: '#6f6555', hazard: '#f2ab1e', accent: '#97600c', sun: '#F99A1C', rule: '#1c1812' };
  function textPath(str, o) { const F = root.GEO.fonts()[o.font || 'archivo'], tr = (o.track || 0) * F.upm; let s = o.cap / F.cap, wu = 0; for (const ch of str) wu += (F.g[ch] || F.g['?']).a + tr; wu -= tr; if (o.maxW && wu * s > o.maxW) s = o.maxW / wu;
    const w = wu * s; let pen = o.align === 'center' ? o.x - w / 2 : o.align === 'right' ? o.x - w : o.x, d = ''; for (const ch of str) { const g = F.g[ch] || F.g['?']; for (const r of g.r) d += 'M' + r.map(p => (pen + p[0] * s).toFixed(2) + ' ' + (o.y - p[1] * s).toFixed(2)).join('L') + 'Z'; pen += (g.a + tr) * s; } return { d, w, cap: F.cap * s }; }
  function wrap(str, o) { const F = root.GEO.fonts()[o.font], s = o.cap / F.cap, tr = (o.track || 0) * F.upm, wid = t => { let w = 0; for (const ch of t) w += (F.g[ch] || F.g['?']).a + tr; return w * s; }; const lines = []; let cur = ''; for (const wd of str.split(/\s+/)) { const t = cur ? cur + ' ' + wd : wd; if (cur && wid(t) > o.maxW) { lines.push(cur); cur = wd; } else cur = t; } if (cur) lines.push(cur); return lines; }
  function ringsPath(rings, s, tx, ty, H) { return rings.map(r => 'M' + r.map(p => (tx + p[0] * s).toFixed(2) + ' ' + (H - (ty + p[1] * s)).toFixed(2)).join('L') + 'Z').join(''); }
  function lockupSVG(x, yTop, w, H) { const Mk = root.GEO.marks(), L = Mk.lockupH, s = w / L.w, h = L.h * s, ty = H - yTop - h, ms = L.markS * s, mx = x + L.markX * s, my = ty + L.markY * s;
    return { h, svg: '<path fill="' + C.sun + '" d="' + ringsPath(Mk.mark.disc, ms, mx, my, H) + '"/><path fill="' + C.ink + '" d="' + ringsPath(Mk.mark.flame, ms, mx, my, H) + '"/><path fill="' + C.ink + '" d="' + ringsPath(L.type, s, x, ty, H) + '"/>' }; }
  function tape(x, y, w, h) { let s = '<clipPath id="tp"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"/></clipPath><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + C.hazard + '"/><g clip-path="url(#tp)" fill="' + C.ink + '">'; for (let u = x - h; u < x + w + h; u += h * 2) s += '<path d="M' + u + ' ' + (y + h) + 'L' + (u + h) + ' ' + y + 'L' + (u + h * 2) + ' ' + y + 'L' + (u + h) + ' ' + (y + h) + 'Z"/>'; return s + '</g>'; }
  function qrSVG(text, x, y, size) { const m = root.GEO.qrMatrix(text || 'https://heatsynclabs.org'), n = m.length, u = size / n; let d = ''; for (let r = 0; r < n; r++) { let c = 0; while (c < n) { if (!m[r][c]) { c++; continue; } let e = c; while (e + 1 < n && m[r][e + 1]) e++; d += 'M' + (x + c * u).toFixed(3) + ' ' + (y + r * u).toFixed(3) + 'h' + ((e + 1 - c) * u).toFixed(3) + 'v' + u.toFixed(3) + 'h-' + ((e + 1 - c) * u).toFixed(3) + 'Z'; c = e + 1; } } return '<path fill="' + C.ink + '" d="' + d + '"/>'; }
  /* where each stock card points. the waiver is the lab's Google Form */
  KIT.URLS = { website: 'https://heatsynclabs.org', waiver: 'https://docs.google.com/forms/d/e/1FAIpQLSdg59iLo5rDZL7f3GvHIVXVu_32vqjwYCCfuRvyMTK1P5RGhg/viewform', classes: 'https://heatsynclabs.org', donate: 'https://heatsynclabs.org', about: 'https://heatsynclabs.org', blank: 'https://heatsynclabs.org' };
  KIT.COPY = {
    website: { eyebrow: 'NEW HERE. START HERE', head: 'HEATSYNCLABS.ORG', note: 'Open hours, classes and how to join. You do not need to be a member to visit.' },
    waiver: { eyebrow: 'BEFORE YOU USE A TOOL', head: 'SIGN THE WAIVER', note: 'A liability waiver is required for guests and members. Scan, sign, then go make something.' },
    classes: { eyebrow: 'ON THE CALENDAR', head: 'CLASSES AND EVENTS', note: 'Hack Your Hackerspace, certification classes and open hours are all on the calendar.' },
    donate: { eyebrow: '501(c)(3) NONPROFIT', head: 'KEEP THE DOORS OPEN', note: 'Membership is a donation to a community, not a subscription to a service. Donations may be tax deductible.' },
    about: { eyebrow: 'HACKING THE PLANET SINCE 2009', head: 'THIS IS A HACKERSPACE', body: ['HeatSync Labs is a workshop in downtown Mesa, run by its members. 3,200 square feet of tools, benches and half finished projects.', 'You do not need to be a member to visit. You do not need experience. Come in during open hours, ask what people are working on, and someone will show you around.', 'Some tools require certification before you use them. Ask first.', 'Membership is a donation to a community, not a subscription to a service. Members keep the lights on and the tools running.', 'Be excellent to each other.'] },
    blank: { eyebrow: '', head: '', note: '' } };
  /* one insert, W x H mm. o: {kind, url, head, note} */
  KIT.insertSVG = function (W, H, o) { const k = KIT.COPY[o.kind] || KIT.COPY.blank, m = Math.max(7, W * 0.075), head = (o.head || k.head || '').toUpperCase(), note = o.note || k.note || '', big = W > 130; let y = m;
    let s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + 'mm" height="' + H + 'mm" viewBox="0 0 ' + W + ' ' + H + '"><rect width="' + W + '" height="' + H + '" fill="' + C.paper + '"/>';
    const lk = lockupSVG(m, y, Math.min(W - 2 * m, big ? 92 : 62), H); s += lk.svg; y += lk.h + m * 0.55; s += tape(m, y, W - 2 * m, big ? 4 : 3); y += (big ? 4 : 3) + m * 0.8;
    if (k.eyebrow) { const e = textPath(k.eyebrow, { font: 'plex', cap: big ? 3.2 : 2.5, track: 0.22, x: m, y: y + (big ? 3.2 : 2.5), maxW: W - 2 * m }); s += '<path fill="' + C.accent + '" d="' + e.d + '"/>'; y += e.cap + m * 0.55; }
    if (head) { const cap = big ? 12 : 8.2, lines = wrap(head, { font: 'archivo', cap, track: 0.01, maxW: W - 2 * m }); for (const ln of lines) { const t = textPath(ln, { font: 'archivo', cap, track: 0.01, x: m, y: y + cap, maxW: W - 2 * m }); s += '<path fill="' + C.ink + '" d="' + t.d + '"/>'; y += cap * 1.32; } y += m * 0.25; }
    const foot = big ? 16 : 11, para = (txt, cap, col, gapAfter) => { for (const ln of wrap(txt, { font: 'sans', cap, track: 0, maxW: W - 2 * m })) { s += '<path fill="' + col + '" d="' + textPath(ln, { font: 'sans', cap, x: m, y: y + cap }).d + '"/>'; y += cap * 1.75; } y += gapAfter; };
    if (k.body) { for (const b of k.body) para(b, big ? 3.9 : 2.6, C.ash, big ? 4.2 : 2.4); const q = Math.min(big ? 46 : 30, H - foot - y - 4); if (q > 18) { s += qrSVG(o.url, m, H - foot - q - 2, q); const t = textPath('HEATSYNCLABS.ORG', { font: 'plex', cap: big ? 3 : 2.2, track: 0.16, x: m + q + 5, y: H - foot - 4 }); s += '<path fill="' + C.ink + '" d="' + t.d + '"/>'; const t2 = textPath('OPEN HOURS, CLASSES, HOW TO JOIN', { font: 'plex', cap: big ? 2.4 : 1.8, track: 0.14, x: m + q + 5, y: H - foot - 4 - (big ? 6 : 4.5), maxW: W - 2 * m - q - 5 }); s += '<path fill="' + C.smoke + '" d="' + t2.d + '"/>'; } }
    else if (o.kind !== 'blank') { const noteCap = big ? 3.4 : 2.45, nl = note ? wrap(note, { font: 'sans', cap: noteCap, track: 0, maxW: W - 2 * m }).length : 0, noteH = nl * noteCap * 1.75 + 3, q = Math.min(W - 2 * m, H - foot - y - noteH - 3);
      s += qrSVG(o.url, (W - q) / 2, y, q); y += q + 4; if (note) para(note, noteCap, C.ash, 0); }
    else { if (note) para(note, big ? 3.6 : 2.5, C.ash, 3); for (let ly = y + 8; ly < H - foot - 3; ly += big ? 10 : 8.5) s += '<rect x="' + m + '" y="' + ly.toFixed(2) + '" width="' + (W - 2 * m) + '" height="0.25" fill="' + C.smoke + '"/>'; }
    s += '<rect x="' + m + '" y="' + (H - foot + 1) + '" width="' + (W - 2 * m) + '" height="0.5" fill="' + C.rule + '"/>';
    const fc = big ? 2.5 : 1.9, fa = textPath('108 W MAIN ST, MESA, AZ 85201', { font: 'plex', cap: fc, track: 0.16, x: m, y: H - foot + (big ? 8 : 5.2) }), fwid = textPath('EVERYONE IS WELCOME', { font: 'plex', cap: fc, track: 0.16, x: 0, y: 0 }).w, two = fa.w + fwid + 6 > W - 2 * m;
    s += '<path fill="' + C.smoke + '" d="' + fa.d + '"/>';
    s += '<path fill="' + C.ink + '" d="' + textPath('EVERYONE IS WELCOME', { font: 'plex', cap: fc, track: 0.16, x: two ? m : W - m, y: H - foot + (big ? 8 : 5.2) + (two ? fc * 2.1 : 0), align: two ? 'left' : 'right' }).d + '"/>';
    return s + '</svg>'; };
  /* a letter page of card strips for the week boards: cut on the grey lines. the last `tab` mm of each strip is the pull tab */
  KIT.stripsSVG = function (labels, w, h, tab) { const PW = 215.9, PH = 279.4, g = 4, nx = Math.max(1, Math.floor((PW - 10) / (w + g))), ny = Math.max(1, Math.floor((PH - 10) / (h + g))), cap = Math.min(5.5, h * 0.42), list = labels.slice(0, nx * ny); while (list.length < nx * ny) list.push('');
    let s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + PW + 'mm" height="' + PH + 'mm" viewBox="0 0 ' + PW + ' ' + PH + '"><rect width="' + PW + '" height="' + PH + '" fill="#ffffff"/>'; const ox = (PW - nx * (w + g) + g) / 2, oy = (PH - ny * (h + g) + g) / 2;
    list.forEach((t, i) => { const x = ox + (i % nx) * (w + g), y = oy + Math.floor(i / nx) * (h + g); s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + C.paper + '" stroke="#9a9a9a" stroke-width="0.2"/>';
      if (tab) s += '<rect x="' + (x + w - tab) + '" y="' + y + '" width="' + tab + '" height="' + h + '" fill="' + C.hazard + '"/><line x1="' + (x + w - tab) + '" y1="' + y + '" x2="' + (x + w - tab) + '" y2="' + (y + h) + '" stroke="' + C.ink + '" stroke-width="0.2" stroke-dasharray="1 1"/>';
      if (t) s += '<path fill="' + C.ink + '" d="' + textPath(String(t).toUpperCase(), { font: 'archivo', cap, track: 0.05, x: x + 3, y: y + h / 2 + cap / 2, maxW: w - tab - 6 }).d + '"/>'; });
    s += '<path fill="' + C.smoke + '" d="' + textPath('WEEK BOARD STRIPS, ' + w + ' X ' + h + ' MM. PRINT AT 100 PERCENT ON CARD, CUT ON THE GREY LINES.', { font: 'plex', cap: 2.2, track: 0.14, x: ox, y: oy - 3 }).d + '"/>'; return s + '</svg>'; };
  /* a letter page with one wrap strip per drum: N panels in a row with dashed fold lines, glued flat by flat */
  KIT.drumStripSVG = function (labels, w, h, copies) { const PW = 215.9, PH = 279.4, N = labels.length, L = N * w, rows = Math.max(1, copies || 1), cap = Math.min(5.5, h * 0.4);
    let s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + PW + 'mm" height="' + PH + 'mm" viewBox="0 0 ' + PW + ' ' + PH + '"><rect width="' + PW + '" height="' + PH + '" fill="#ffffff"/>'; const nx = Math.max(1, Math.floor((PW - 10) / (L + 6)));
    for (let r = 0; r < rows; r++) { const x = 8 + (r % nx) * (L + 6), y = 12 + Math.floor(r / nx) * (h + 8); if (y + h > PH - 8) break; s += '<rect x="' + x + '" y="' + y + '" width="' + L + '" height="' + h + '" fill="' + C.paper + '" stroke="#9a9a9a" stroke-width="0.2"/>';
      labels.forEach((t, i) => { const px = x + i * w; if (i) s += '<line x1="' + px + '" y1="' + y + '" x2="' + px + '" y2="' + (y + h) + '" stroke="' + C.ink + '" stroke-width="0.15" stroke-dasharray="1 1"/>';
        if (String(t).trim()) s += '<path fill="' + C.ink + '" d="' + textPath(String(t).toUpperCase(), { font: 'archivo', cap, track: 0.05, x: px + w / 2, y: y + h / 2 + cap / 2, maxW: w - 3 }).d + '"/>'; }); }
    s += '<path fill="' + C.smoke + '" d="' + textPath('DRUM WRAP STRIPS, ' + N + ' PANELS OF ' + w.toFixed(1) + ' X ' + h.toFixed(1) + ' MM. PRINT AT 100 PERCENT, CUT THE OUTLINE, FOLD ON THE DASHES, GLUE ONE FLAT AT A TIME.', { font: 'plex', cap: 2.2, track: 0.14, x: 8, y: 9 }).d + '"/>'; return s + '</svg>'; };
  /* tile card sized inserts onto letter pages with crop ticks */
  KIT.sheetSVG = function (cards, cw, ch) { const PW = 215.9, PH = 279.4, nx = Math.max(1, Math.floor(PW / cw)), ny = Math.max(1, Math.floor(PH / ch)), per = nx * ny, pages = [], ox = (PW - nx * cw) / 2, oy = (PH - ny * ch) / 2;
    for (let i = 0; i < cards.length; i += per) { let s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + PW + 'mm" height="' + PH + 'mm" viewBox="0 0 ' + PW + ' ' + PH + '"><rect width="' + PW + '" height="' + PH + '" fill="#ffffff"/>';
      cards.slice(i, i + per).forEach((c, j) => { const x = ox + (j % nx) * cw, y = oy + Math.floor(j / nx) * ch; s += '<svg x="' + x + '" y="' + y + '" width="' + cw + '" height="' + ch + '" viewBox="0 0 ' + cw + ' ' + ch + '">' + c.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replace(/id="tp"/g, 'id="tp' + (i + j) + '"').replace(/url\(#tp\)/g, 'url(#tp' + (i + j) + ')') + '</svg>'; });
      pages.push(s + '</svg>'); } return pages; };
  root.KIT = KIT;
})(typeof globalThis !== 'undefined' ? globalThis : this);
