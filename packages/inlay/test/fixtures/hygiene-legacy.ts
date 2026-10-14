// The legacy hygiene code as shipped, run in node as the oracle for M03-T05.
// Each cut is taken from the original file by line, checked against the
// first and last line it must hold, and run unchanged. The originals are
// hash-checked against lineage.json (the COLLAR copy against
// designs/collar/legacy/sha256.txt through legacyHtml). Also loads the
// browser captures that scripts/hygiene-fixtures.mjs wrote.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { legacyHtml } from "./collar-legacy.js";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const FIX = fileURLToPath(new URL("./", import.meta.url));

interface Row { id: string; source: string; sha256: string }
const rows = JSON.parse(readFileSync(root + "lineage.json", "utf8")) as Row[];

function original(id: string): string[] {
  const row = rows.find((r) => r.id === id);
  if (row === undefined) throw new Error(`lineage.json has no row ${id}`);
  const path = row.source.startsWith("/") ? row.source : root + row.source;
  const bytes = readFileSync(path);
  const got = createHash("sha256").update(bytes).digest("hex");
  if (got !== row.sha256) throw new Error(`${path} sha256 ${got}, lineage ${id} records ${row.sha256}`);
  return bytes.toString("utf8").split("\n");
}

function cut(lines: string[], first: number, last: number, head: string, tail: string): string {
  const a = lines[first - 1]?.trim() ?? "", b = lines[last - 1]?.trim() ?? "";
  if (!a.startsWith(head) || !b.startsWith(tail)) throw new Error(`cut ${first} to ${last} reads "${a}" .. "${b}"`);
  return lines.slice(first - 1, last).join("\n");
}

export interface CollarArt { boost: number; gap: number; minF: number; despeck: boolean }

/**
 * COLLAR buildFace's hygiene and art clip (collar.html:1149 to 1192) with
 * its dilate and despeckle (942 to 985), on a res x res slot grid. The 0.35
 * stays the literal the bench shipped.
 */
export function collarLegacyHygiene(): (out: Uint8Array, res: number, dia: number, art: CollarArt, rArt: number) => Uint8Array {
  const lines = legacyHtml().split("\n");
  const helpers = cut(lines, 942, 985, "function dilate(mask, res, rPx) {", "}");
  const block = cut(lines, 1149, 1192, "/* per slot hygiene", "}");
  const f = new Function("out", "n", "res", "ST", "R_ART", `${helpers}\n${block}\nreturn out;`) as
    (out: Uint8Array, n: number, res: number, ST: unknown, R_ART: () => number) => Uint8Array;
  return (out, res, dia, art, rArt) => f(out.slice(), res * res, res, { dia, art }, () => rArt);
}

/** The legacy despeckle thresholds as written: COLLAR collar.html:1164, INLAY part2.js:209. */
export function legacyDespeckleCells(): { collar: (minF: number, k: number) => number; inlay: (minF: number, res: number) => number } {
  const c = cut(legacyHtml().split("\n"), 1164, 1164, "const minPx = Math.max(1, Math.round(Math.PI * Math.pow(ST.art.minF * k / 2, 2) * 0.35));", "const minPx");
  const p = cut(original("inlay.parts/part2"), 209, 209, "const minCells = Math.round(0.35 * Math.PI * Math.pow(ST.print.minF / 2 * res, 2));", "const minCells");
  const collar = new Function("ST", "k", `${c}\nreturn minPx;`) as (ST: unknown, k: number) => number;
  const inlay = new Function("ST", "res", `${p}\nreturn minCells;`) as (ST: unknown, res: number) => number;
  return { collar: (minF, k) => collar({ art: { minF } }, k), inlay: (minF, res) => inlay({ print: { minF } }, res) };
}

export interface RasterMeshLegacy {
  despeckle(labels: Uint8Array, W: number, H: number, S: number, minCells: number, into: number): number;
  open(labels: Uint8Array, W: number, H: number, S: number, r: number, into: number): void;
  dilate(labels: Uint8Array, W: number, H: number, S: number, r: number, over: number): void;
  gap(labels: Uint8Array, W: number, H: number, S: number, g: number, into: number): void;
}

/** packages/mesh/seed/rastermesh.js (canonical inlay.hygiene-print-forge/mesh-seed), whole file. */
export function rasterMesh(): RasterMeshLegacy {
  const text = original("inlay.hygiene-print-forge/mesh-seed").join("\n");
  const scope: { RasterMesh?: RasterMeshLegacy } = {};
  new Function("globalThis", text)(scope);
  if (scope.RasterMesh === undefined) throw new Error("rastermesh.js set no RasterMesh");
  return scope.RasterMesh;
}

export interface InlayPrint { boost: number; minF: number; gap: number; despeckle: boolean }

/** INLAY composeFace's hygiene loop (part2.js:206 to 217) over the seed RasterMesh, on a W x H label grid. */
export function inlayLegacyHygiene(): (labels: Uint8Array, W: number, H: number, res: number, print: InlayPrint, n: number, bodyS: number) => Uint8Array {
  const loop = cut(original("inlay.parts/part2"), 206, 217, "// hygiene per non body slot", "}");
  const RM = rasterMesh();
  const f = new Function("labels", "W", "H", "res", "ST", "bodyS", "RasterMesh", `${loop}\nreturn labels;`) as
    (labels: Uint8Array, W: number, H: number, res: number, ST: unknown, bodyS: number, RM: RasterMeshLegacy) => Uint8Array;
  return (labels, W, H, res, print, n, bodyS) => f(labels.slice(), W, H, res, { print, colour: { n } }, bodyS, RM);
}

export interface SprueMask { w: number; h: number; d: Uint8Array }
export interface SprueLegacy {
  dilate(m: SprueMask, r: number): SprueMask;
  erode(m: SprueMask, r: number): SprueMask;
  count(m: SprueMask): number;
}

/** The SPRUE engine (sprue.html:279 to 942, "Pure JS, no DOM"), run whole. */
export function sprueEngine(): SprueLegacy {
  const text = cut(original("sprue.bench/sprue-html"), 279, 942, "(function (root) {", "})(typeof globalThis");
  const scope: { SPRUE?: SprueLegacy } = {};
  new Function("globalThis", text)(scope);
  if (scope.SPRUE === undefined) throw new Error("sprue.html engine set no SPRUE");
  return scope.SPRUE;
}

/** SPRUE compose after the zone AND, the cleanup lines as written (sprue.html:1108 to 1110). */
export function sprueLegacyClean(): (m: SprueMask, ST: { minF: number; minGap: number; kind: string; ring: boolean }, g: { ppm: number; ring: SprueMask }, subset: unknown) => SprueMask {
  const S = sprueEngine();
  const body = cut(original("sprue.bench/sprue-html"), 1108, 1110, "m = S.dilate(S.erode(m, ST.minF / 2 * g.ppm), ST.minF / 2 * g.ppm);", "if (ST.kind === 'coin' && ST.ring && !subset) m = S.or(m, g.ring);");
  return new Function("S", "m", "ST", "g", "subset", `${body}\nreturn m;`).bind(null, S) as never;
}

// ---- browser captures (scripts/hygiene-fixtures.mjs)

/** sha256 per fixture file name, from collar-back-512.sha256. */
export function fixtureHashes(): Map<string, string> {
  const m = new Map<string, string>();
  for (const line of readFileSync(FIX + "collar-back-512.sha256", "utf8").split("\n")) {
    const [h, name] = line.trim().split(/\s+/);
    if (h && name) m.set(name, h);
  }
  return m;
}

export const fixtureBytes = (name: string): Buffer => readFileSync(FIX + name);

const unb64 = (s: string): Uint8Array => new Uint8Array(Buffer.from(s, "base64"));

export interface CollarCapture {
  res: number;
  dia: number;
  art: CollarArt & { keep: number };
  rArt: number;
  faces: Record<"front" | "back", { pre: Uint8Array; post: Uint8Array; islandsPre: Record<string, number[]>; islandsPost: Record<string, number[]> }>;
}

export function collarCapture(): CollarCapture {
  const j = JSON.parse(gunzipSync(fixtureBytes("collar-512.legacy.json.gz")).toString("utf8"));
  for (const f of ["front", "back"]) { j.faces[f].pre = unb64(j.faces[f].pre); j.faces[f].post = unb64(j.faces[f].post); }
  return j as CollarCapture;
}

export interface SprueLayerCapture { text: string | null; thin: "gone" | "weak" | null; raw: SprueMask; clean: SprueMask }
export interface SprueCapture {
  st: { kind: string; ring: boolean; minF: number; minGap: number; ppm: number };
  ring: SprueMask;
  zone: SprueMask;
  faces: Record<"front" | "back", { raw: SprueMask; clean: SprueMask; layers: SprueLayerCapture[] }>;
}

export function sprueCapture(): SprueCapture {
  const j = JSON.parse(gunzipSync(fixtureBytes("sprue-phx.legacy.json.gz")).toString("utf8"));
  const m = (x: { w: number; h: number; d: string }): SprueMask => ({ w: x.w, h: x.h, d: unb64(x.d) });
  j.ring = m(j.ring);
  j.zone = m(j.zone);
  for (const f of ["front", "back"]) {
    j.faces[f].raw = m(j.faces[f].raw);
    j.faces[f].clean = m(j.faces[f].clean);
    for (const L of j.faces[f].layers) { L.raw = m(L.raw); L.clean = m(L.clean); }
  }
  return j as SprueCapture;
}
