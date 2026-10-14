// The D-096 archetype corrections of M06-T07 step 2, one row per row of
// the card's table. A row that corrects a limit names the seed sentence it
// replaces (or none, when the correction adds one); load.test.ts builds
// each def's expected limits from the seed with these applied, and
// corrections.test.ts asserts every row's probe reads the corrected value
// and not the seed value, which it reads from the seed YAML.

export interface LimitEdit {
  /** The seed sentence replaced; absent when the correction adds a sentence. */
  readonly seed?: string;
  readonly corrected: string;
}

export interface Correction {
  readonly entry: string;
  readonly item: string;
  /** The seed value, as the seed states it. */
  readonly seed: string;
  /** The corrected value. */
  readonly corrected: string;
  readonly qualifier: "computed" | "inferred" | "design value" | "vendor" | "community" | "n/a";
  readonly evidence: string;
  readonly decision: string;
  /** A limit sentence this row edits on the entry's def. */
  readonly limit?: LimitEdit;
}

export const CORRECTIONS: readonly Correction[] = [
  {
    entry: "click-spring-key", item: "defaults", seed: "span 22, beam 0.5",
    corrected: "l 24, t 0.55, w 1.6, Q 2, E 1900, sw 3", qualifier: "computed",
    evidence: "originals/pip/files/haft-src/src/layout.js line 36; readouts 2.527 N at 0.629 mm, drop 76.5 percent, cg 1.369 mm, eStop 2.31 percent (pip-buttons.parity)", decision: "D-096",
  },
  {
    entry: "click-spring-key", item: "rise limits", seed: "rise about 2.4 x t makes the spring LATCH; under 2.0 it stops snapping; the bench warns at both",
    corrected: "FE window Q 1.72 to 2.19 at PIP defaults (CHK-KEY-04); snaps from Q 1.2, bistable from Q 2.32 (computed, M01-T07)", qualifier: "computed",
    evidence: "M01-T07; reference/keys/click-spring-window", decision: "D-071, C-04",
    limit: { seed: "rise about 2.4 x t makes the spring LATCH; under 2.0 it stops snapping; the bench warns at both", corrected: "FE window Q 1.72 to 2.19 at PIP defaults (CHK-KEY-04); snaps from Q 1.2, bistable from Q 2.32 (computed, M01-T07)" },
  },
  {
    entry: "click-spring-key", item: "fatigue", seed: "PETG fatigues above about 2.5 percent strain; a 0.6 beam reached 2.7 to 3.3 and failed",
    corrected: "PETG strain limit 2.5 percent for beams bent in the layer plane, 1.5 percent default across layers until a coupon (inferred, from HAFT failures at 2.7 to 3.3)", qualifier: "inferred",
    evidence: "verified-claims C4", decision: "D-073, C-05",
    limit: { seed: "PETG fatigues above about 2.5 percent strain; a 0.6 beam reached 2.7 to 3.3 and failed", corrected: "PETG strain limit 2.5 percent for beams bent in the layer plane, 1.5 percent default across layers until a coupon (inferred, from HAFT failures at 2.7 to 3.3)" },
  },
  {
    entry: "tilt-stick", item: "read and pad", seed: "pullup: 470k; the thumb cap presses on after the bezel",
    corrected: "read charge-release; thumb pad printed in place; 470k only in the TOGGLE preset at Protopasta 30 ohm cm", qualifier: "design value",
    evidence: "originals/pip/files/haft-src/src/layout.js line 38 (top inplace); plan-deltas R47", decision: "D-096",
    limit: { corrected: "read charge-release; thumb pad printed in place; 470k only in the TOGGLE preset at Protopasta 30 ohm cm" },
  },
  {
    entry: "buried-trace-stack", item: "stack", seed: "traces 1.0 x 0.72, insulation 0.48, over L2 0.48, net to net 0.3",
    corrected: "traces 1.4 wide, layer 0.72, iso 0.96, PETG over L2 1.68, net to net floor 0.6", qualifier: "design value",
    evidence: "profile constants stack.traceWidth, stack.trace, stack.iso, stack.overL2, stack.netToNetMin (layout.js lines 27 to 28; verified-claims C1)", decision: "D-085, D-084",
  },
  {
    entry: "rp2040-zero-seat", item: "wire cups", seed: "5.2 mm spacing so a trace fits between two cups",
    corrected: "cup gap 2.0 under a trace lane of 3.0 (computed: pitch 5.2 less od 3.2; w 1.4 plus two 0.8 clearances); traces route around the cup row", qualifier: "computed",
    evidence: "originals/pip/files/haft-src/src/layout.js line 40; model.js cups fit row", decision: "D-096",
    limit: { corrected: "cup gap 2.0 under a trace lane of 3.0 (computed: pitch 5.2 less od 3.2; w 1.4 plus two 0.8 clearances); traces route around the cup row" },
  },
  {
    entry: "rp2040-zero-seat", item: "firmware", seed: "470k pullup per key as the fallback",
    corrected: "read charge-release; keys wait 3500 us in emitted firmware until a coupon calibrates (measured crossings 113 to 2431 us); pip.ino still ships 200 us", qualifier: "design value",
    evidence: "pip-controller README.md lines 155 to 180; pip.ino line 20; pip_stick.ino line 25", decision: "D-079, D-080",
    limit: { corrected: "read charge-release; keys wait 3500 us in emitted firmware until a coupon calibrates (measured crossings 113 to 2431 us); pip.ino still ships 200 us" },
  },
  {
    entry: "hex-key", item: "across flats", seed: "17.3",
    corrected: "18.53", qualifier: "design value",
    evidence: "COFFER geometry, README 18.5; area about 297 mm2 computed", decision: "D-096",
    limit: { corrected: "across flats 18.53 (README 18.5), about 297 mm2 (computed)" },
  },
  {
    entry: "astable-blinky", item: "split", seed: "one entry, TACK and SHIM",
    corrected: "astable-blinky-tack: 100k, 10 uF, about 0.72 Hz; astable-blinky-shim: 33k, 22 uF, about 1 Hz (0.6 to 1.6), one 220R per LED", qualifier: "design value",
    evidence: "plan-deltas R47", decision: "D-096",
  },
  {
    entry: "three-source-power-oring", item: "status", seed: "proven, ARMATURE",
    corrected: "unproven", qualifier: "n/a",
    evidence: "ARMATURE-R1.net: D11 cathode on no net, R13 on VBUS_F only", decision: "D-096",
  },
  {
    entry: "printed-membrane-slider", item: "split", seed: "one entry with TANG R6 numbers",
    corrected: "membrane-slider-thinpot, membrane-slider-gib, membrane-slider-wall", qualifier: "n/a",
    evidence: "plan-deltas R47; benches-conductive-a.md line 620", decision: "D-096",
  },
  {
    entry: "c3-carrier", item: "dual-supply jumper", seed: "jumper default unset; pad map tier verified",
    corrected: "dual-supply jumper default normally open (SPINDLE; TRUNNION normally closed); pad map tier vendor until calipers", qualifier: "vendor",
    evidence: "plan-deltas R47", decision: "D-088 (owner, default normally open), D-096",
    limit: { corrected: "dual-supply jumper default normally open (SPINDLE; TRUNNION normally closed); pad map tier vendor until calipers" },
  },
  {
    entry: "blocks-stud", item: "standard", seed: "a printed button on a 45k pullup lands in the undefined band",
    corrected: "two presets, no default: boss-v1 (sockH 2.4, flangeH 0.72, trace 0.72, gap 0.48, L 0.24) and blocks-html (sockH 2.2, flange 0.6, trace 0.6, gap 0.4, L 0.2); cPLA wires short to medium, BOSS 50 kohm, carbon-filled filament only", qualifier: "design value",
    evidence: "boss.js lines 5 to 24; verified-claims C5", decision: "D-087 (owner, default none until a print), D-077",
    limit: { seed: "pin to stud 5 to 50 kohm; a printed button on a 45k pullup lands in the undefined band", corrected: "pin to stud 5 to 50 kohm; two presets, no default: boss-v1 (sockH 2.4, flangeH 0.72, trace 0.72, gap 0.48, L 0.24) and blocks-html (sockH 2.2, flange 0.6, trace 0.6, gap 0.4, L 0.2); cPLA wires short to medium, BOSS 50 kohm, carbon-filled filament only" },
  },
  {
    entry: "sao-port", item: "entry", seed: "absent",
    corrected: "SAO v1.69bis, 2x3 at 2.54, 3V3, GND, SDA, SCL, GPIO1, GPIO2, about 820 mW", qualifier: "community",
    evidence: "hackaday.com 2019-03-20; verified-claims C9", decision: "D-096",
    limit: { corrected: "SAO v1.69bis, 2x3 at 2.54, 3V3, GND, SDA, SCL, GPIO1, GPIO2, about 820 mW" },
  },
  {
    entry: "pi-hat-carrier", item: "entry", seed: "absent",
    corrected: "EEPROM and back-power diode are required checks; LUG rev A 65 x 56.5, 4 layers, 0 DRC errors lacks both", qualifier: "design value",
    evidence: "plan-deltas R47; round-pi-board/outputs", decision: "D-096",
    limit: { corrected: "EEPROM and back-power diode are required checks; LUG rev A 65 x 56.5, 4 layers, 0 DRC errors lacks both" },
  },
  {
    entry: "printed-rotary-pot", item: "arc resistance", seed: "a cPLA arc (14k) against 40k of printed leads swings 10 percent; cTPU (709k) swings 73; a rigid wiper scratches the track",
    corrected: "at the shipped rows the cTPU arc is 189k on ctpu.pip.bulk 400 ohm cm (computed, row inferred) and a cPLA arc 14k on cpla-protopasta.xy 30 ohm cm (computed, row vendor); the seed's cPLA 14k swinging 10 percent against 40k of printed leads and cTPU 709k swinging 73 were computed at Protopasta 30 and cTPU 1500 ohm cm (TANG 03_design.js line 27); a rigid wiper scratches the track", qualifier: "computed",
    evidence: "potDerive R.arc on the shipped profile rows (corrections.test.ts reads it); TANG 03_design.js line 27 (cplaXY 30, ctpu 1500), where the port returns the seed's 709k", decision: "D-098, D-081, D-007",
    limit: { seed: "a cPLA arc (14k) against 40k of printed leads swings 10 percent; cTPU (709k) swings 73; a rigid wiper scratches the track", corrected: "at the shipped rows the cTPU arc is 189k on ctpu.pip.bulk 400 ohm cm (computed, row inferred) and a cPLA arc 14k on cpla-protopasta.xy 30 ohm cm (computed, row vendor); the seed's cPLA 14k swinging 10 percent against 40k of printed leads and cTPU 709k swinging 73 were computed at Protopasta 30 and cTPU 1500 ohm cm (TANG 03_design.js line 27); a rigid wiper scratches the track" },
  },
  {
    entry: "membrane-slider-wall", item: "track and force", seed: "about 2.2 N to make contact; slide track 358k swings 74 percent",
    corrected: "at the shipped rows contact takes about 0.68 N on tpu95 9.2 MPa (computed, row vendor) and the slide track is 95k on ctpu.pip.bulk 400 ohm cm (computed, row inferred); the seed's 2.2 N and 358k swinging 74 percent were computed at TPU 30 MPa and cTPU 1500 ohm cm (TANG 03_design.js line 27)", qualifier: "computed",
    evidence: "neckDerive R.track and pressForce on the shipped profile rows (corrections.test.ts reads them); TANG 03_design.js line 27 (ctpu 1500, tpuE 30), where the port returns the seed's 358k", decision: "D-098, D-081, D-007",
    limit: { seed: "about 2.2 N to make contact; slide track 358k swings 74 percent", corrected: "at the shipped rows contact takes about 0.68 N on tpu95 9.2 MPa (computed, row vendor) and the slide track is 95k on ctpu.pip.bulk 400 ohm cm (computed, row inferred); the seed's 2.2 N and 358k swinging 74 percent were computed at TPU 30 MPa and cTPU 1500 ohm cm (TANG 03_design.js line 27)" },
  },
];

/** The seed limits of an entry with every correction for it applied, in order. */
export function correctedLimits(entry: string, seedLimits: readonly string[]): string[] {
  let out = [...seedLimits];
  for (const c of CORRECTIONS) {
    if (c.entry !== entry || c.limit === undefined) continue;
    const { seed, corrected } = c.limit;
    out = seed === undefined ? [...out, corrected] : out.map((l) => (l === seed ? corrected : l));
  }
  return out;
}
