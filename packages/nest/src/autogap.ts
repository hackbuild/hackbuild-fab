// gap "auto", ported from OGEE16 autoGap() (designs/ogee16/legacy/source/plate_template.html
// lines 331 to 339; lineage ogee16.autogap/r16p): try every whole gap from
// 2 to 16 mm in turn and keep the largest one that reaches the smallest
// sheet count. The range is the page's search domain, a packer setting
// rather than a material or machine value, so it stays here (M07-T03
// step 4). One addition: a gap that leaves more copies off as oversize
// never wins, so a wider gap cannot buy a sheet by dropping a part (the
// OGEE16 bills drop none at any gap in the range).

/** First gap tried, mm. */
export const AUTO_GAP_MIN = 2;
/** Last gap tried, mm. */
export const AUTO_GAP_MAX = 16;

export interface AutoGap {
  /** Largest gap reaching the smallest count, mm. */
  readonly gap: number;
  /** Sheets at that gap, count. */
  readonly sheets: number;
}

/** The layout at one gap: sheets and copies left off as oversize. */
export interface GapTrial {
  /** count */
  readonly sheets: number;
  /** count */
  readonly dropped: number;
}

/** `trial(g)` packs at gap g. */
export function autoGap(trial: (gap: number) => GapTrial): AutoGap {
  let best = AUTO_GAP_MIN, bestN = Infinity, bestD = Infinity;
  for (let g = AUTO_GAP_MIN; g <= AUTO_GAP_MAX; g++) {
    const { sheets: n, dropped: d } = trial(g);
    if (d < bestD || (d === bestD && n < bestN)) {
      bestD = d;
      bestN = n;
      best = g;
    } else if (d === bestD && n === bestN) {
      best = g;
    }
  }
  return { gap: best, sheets: bestN };
}
