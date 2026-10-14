// The legacy side of the SPRUE parity (M03-T10 step 3), shared by both
// harness forms (tools/py/harness/sprue_parity.py and
// tools/legacy/sprue-parity.mjs). The file is one function expression the
// harness evaluates in designs/sprue/legacy/sprue.html; it only calls what
// the page exposes (SPRUE_APP, SPRUE) and SPRUE's own checkThin, whose
// source (sprue.html lines 1114 to 1125) the harness cuts from the pinned
// file and passes in, since the page keeps checkThin private and runs it
// only from commit (line 1221), which boot never calls.
//
// Scenarios: "phx" is the card's preset (PRESETS.phx, line 980). "phx-small"
// adds layers under the min feature so the thin flags are not all null, and
// a turned and offset layer. "coinyear" is the year coin preset (line 986):
// arc text and the border ring. New layers carry textLayer's defaults
// (line 975) with ids from 9001.
async ({ scenario, thinSrc }) => {
  const A = globalThis.SPRUE_APP, S = globalThis.SPRUE;
  const text = (id, o) => Object.assign({ id, type: 'text', text: 'TEXT', font: 'Anton', weight: '400', size: 5, tracking: 0, x: 0, y: 0, rot: 0, arc: 0, arcTop: true, mute: false }, o);
  const SCENARIOS = {
    phx: () => A.PRESETS.phx(),
    'phx-small': () => {
      A.PRESETS.phx();
      A.ST.faces.front.push(text(9001, { text: 'PHX', size: 6, x: 1.2, y: -2.5, rot: 17, tracking: 0.1 }));
      A.ST.faces.front.push(text(9002, { text: 'fine print', size: 1.5, y: 4.5 }));
      A.ST.faces.back.push(text(9003, { text: 'ok', size: 0.9, y: -8.4 }));
    },
    coinyear: () => A.PRESETS.coinyear(),
  };
  if (!(scenario in SCENARIOS)) return { error: `no scenario ${scenario}` };
  SCENARIOS[scenario]();
  const fonts = new Set();
  for (const side of ['front', 'back']) for (const L of A.ST.faces[side]) if (L.type === 'text') fonts.add(`${L.weight} 16px "${L.font}"`);
  for (const f of fonts) {
    const faces = await document.fonts.load(f);
    if (faces.length === 0) return { error: `the page has no face for ${f}` };
  }
  const checkThin = new Function('S', 'compose', 'ST', `${thinSrc}\nreturn checkThin;`)(S, A.compose, A.ST);
  const b64 = (a) => { let s = ''; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode(...a.subarray(i, i + 0x8000)); return btoa(s); };
  const out = { st: {}, faces: {}, masks: {}, thin: {} };
  for (const k of ['kind', 'pickScale', 'pickHole', 'holeD', 'coinD', 'ring', 'ringW', 'ringIn', 'margin', 'ppm', 'minF', 'minGap']) out.st[k] = A.ST[k];
  for (const side of ['front', 'back']) {
    checkThin(side);
    const layers = A.ST.faces[side];
    out.faces[side] = layers.map((L) => ({ type: L.type, text: L.text, font: L.font, weight: L.weight, size: L.size, tracking: L.tracking, x: L.x, y: L.y, rot: L.rot, arc: L.arc, arcTop: L.arcTop, mute: L.mute }));
    out.thin[side] = layers.filter((L) => !L.mute).map((L) => L.thin ?? null);
    const raw = A.compose(side, null, true), clean = A.compose(side);
    out.masks[side] = { w: raw.w, h: raw.h, raw: b64(raw.d), clean: b64(clean.d) };
  }
  // build() reads faceMask, which renderFaces refreshes; it swaps A.mesh when done (sprue.html:1224 to 1245).
  const before = A.mesh;
  A.renderFaces();
  A.build();
  const t0 = Date.now();
  while (A.mesh === before) {
    if (Date.now() - t0 > 30000) return { error: 'the legacy build did not finish within 30 s' };
    await new Promise((r) => setTimeout(r, 25));
  }
  const st = A.mesh.stats;
  out.mesh = { kind: A.mesh.kind, whiteVol: st.whiteVol, blackVol: st.blackVol, blankVol: st.blankVol, layers: st.layers, inlay: st.inlay, issues: st.issues.length };
  return out;
}
