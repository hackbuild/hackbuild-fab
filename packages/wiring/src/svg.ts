// The wiring drawing (M08-T13 step 2), ported from PIP's wiringSvg
// (pip-controller bench/part2.js lines 352 to 405, sha256 e1cf608f...):
// board top view at 9 px per mm, USB up, used pads pink with their
// function, unused pads gold, wire ends where they sit with a line from
// their pad coloured by net (GND ink, 3V3 red, signals pink). Colours are
// named tokens so M09 maps them to the design system; the defaults are
// PIP's values.

import type { WiringInput } from "./input.js";
import { noCentre, pinOfEnd, wiringReport } from "./report.js";

/** PIP's colours; the wire colours (ink GND, rail3v3 red for 3V3, used pink for a signal) are part2.js line 383. */
export const WIRING_TOKENS = {
  paper: "#fffdf7", ink: "#1a1a1a", board: "#1b1b1b", usb: "#b9b9b9", usbEdge: "#555", usbText: "#555",
  used: "#FE0386", unused: "#d4a94a", labelUnused: "#6b6459", labelTail: "#9a9184", rail3v3: "#c3251f", cup: "#6e6e6e",
} as const;
export type WiringTokens = { readonly [K in keyof typeof WIRING_TOKENS]: string };

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n = (v: number): string => String(Math.round(v * 1000) / 1000);

/** End and cup sizes PIP draws, mm (part2.js defaults cups od 3.2, bore 1.0). */
const CUP_OD = 3.2, CUP_BORE = 1.0;

export function wiringSvg(input: WiringInput, tokens: WiringTokens = WIRING_TOKENS): string {
  const report = wiringReport(input);
  // Every pad is drawn, used or not, so every pin needs its centre; the
  // report checked only the used ones.
  for (const p of input.pins) if (p.at === undefined) throw noCentre(input.board.id, p.name, undefined);
  const B = input.board;
  const k = input.scale ?? 9, W = 560, bx = 150, by = 44;
  const X = (x: number) => bx + (x + B.w / 2) * k, Y = (y: number) => by + (B.l / 2 - y) * k;
  const endY = input.ends.length > 0 ? Math.max(...input.ends.map((e) => Y(e.y))) : Y(-B.l / 2);
  const Hh = Math.ceil(endY + (input.ends.length > 0 ? 40 : 30) + 60);
  const xs = input.pins.map((p) => p.at![0]);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const edge = (x: number): "L" | "R" | "T" => (Math.abs(x - xMin) < 1e-6 ? "L" : Math.abs(x - xMax) < 1e-6 ? "R" : "T");
  const fnOf = new Map(input.used.map((u) => [u.pin, u.function]));
  const s: string[] = [];
  s.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${Hh}" font-family="IBM Plex Mono, monospace">`);
  s.push(`<rect width="${W}" height="${Hh}" fill="${tokens.paper}"/>`);
  s.push(`<text x="14" y="22" font-size="15" fill="${tokens.ink}">${esc(B.name)}, top view, USB up, pads ${B.tier}</text>`);
  s.push(`<rect x="${n(X(-B.w / 2))}" y="${n(Y(B.l / 2))}" width="${n(B.w * k)}" height="${n(B.l * k)}" fill="${tokens.board}" stroke="${tokens.ink}" stroke-width="2"/>`);
  s.push(`<rect x="${n(X(-4.5))}" y="${n(Y(B.l / 2) - 8)}" width="${n(9 * k)}" height="${n(7.5 * k)}" fill="${tokens.usb}" stroke="${tokens.usbEdge}"/>`);
  s.push(`<text x="${n(X(0))}" y="${n(Y(B.l / 2) + 26)}" font-size="11" fill="${tokens.usbText}" text-anchor="middle">USB</text>`);
  // A module can name two pins alike (Teensy 4.0 has two GND), so pads are
  // placed by index; an end lands on the first pin of its name, as the
  // report resolves it.
  const padAt: (readonly [number, number])[] = [];
  const padXY = new Map<string, readonly [number, number]>();
  for (const p of input.pins) {
    const u = fnOf.has(p.name);
    const cx = X(p.at![0]), cy = Y(p.at![1]);
    padAt.push([cx, cy]);
    if (!padXY.has(p.name)) padXY.set(p.name, [cx, cy]);
    const fn = fnOf.get(p.name) ?? "";
    const label = esc(p.name + (fn !== "" && fn !== p.name ? ` ${fn}` : ""));
    const e = edge(p.at![0]);
    if (e === "T") s.push(`<text x="${n(cx + 4)}" y="${n(cy - 11)}" font-size="10" transform="rotate(-90 ${n(cx + 4)} ${n(cy - 11)})" fill="${u ? tokens.used : tokens.labelTail}">${label}</text>`);
    else s.push(`<text x="${n(e === "L" ? cx - 14 : cx + 14)}" y="${n(cy + 4)}" font-size="11" text-anchor="${e === "L" ? "end" : "start"}" fill="${u ? tokens.used : tokens.labelUnused}">${label}</text>`);
  }
  for (const end of input.ends) {
    const pin = pinOfEnd(input, end.net);
    const pp = pin === undefined ? undefined : padXY.get(pin);
    const col = end.net === "GND" ? tokens.ink : end.net === "3V3" ? tokens.rail3v3 : tokens.used;
    if (pp !== undefined) s.push(`<line x1="${n(pp[0])}" y1="${n(pp[1])}" x2="${n(X(end.x))}" y2="${n(Y(end.y))}" stroke="${col}" stroke-width="2.2" stroke-linecap="round" opacity="0.75"/>`);
  }
  for (const end of input.ends) {
    const cx = X(end.x), cy = Y(end.y);
    s.push(`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n((CUP_OD / 2) * k)}" fill="${tokens.cup}" stroke="${tokens.ink}" stroke-width="2"/><circle cx="${n(cx)}" cy="${n(cy)}" r="${n((CUP_BORE / 2) * k)}" fill="${tokens.paper}"/>`);
    s.push(`<text x="${n(cx)}" y="${n(cy + 4)}" font-size="10" text-anchor="end" fill="${tokens.labelUnused}" dx="${n((-CUP_OD / 2) * k - 3)}">${esc(end.label)}</text>`);
    s.push(`<text x="${n(cx)}" y="${n(cy + (CUP_OD / 2) * k + 12)}" font-size="10" text-anchor="middle" fill="${tokens.ink}">${esc(end.net)}</text>`);
  }
  for (const [i, p] of input.pins.entries()) {
    const [cx, cy] = padAt[i]!;
    const u = fnOf.has(p.name);
    s.push(`<circle cx="${n(cx)}" cy="${n(cy)}" r="7" fill="${u ? tokens.used : tokens.unused}" stroke="${tokens.ink}" stroke-width="1.5" data-pin="${esc(p.name)}"/><circle cx="${n(cx)}" cy="${n(cy)}" r="3" fill="${tokens.ink}"/>`);
  }
  const note = report.unmatched.length > 0
    ? [`${report.unmatched.length} wire end(s) name no used function: ${report.unmatched.map((u) => `${u.id} ${u.net}`).join(", ")}`.slice(0, 90)]
    : [`${report.used.length} used pads in pink with their function, ${report.unused.length} unused in gold.`];
  note.forEach((t, i) => s.push(`<text x="14" y="${Hh - 30 + i * 16}" font-size="12" fill="${tokens.labelUnused}">${esc(t)}</text>`));
  s.push("</svg>");
  return s.join("\n");
}
