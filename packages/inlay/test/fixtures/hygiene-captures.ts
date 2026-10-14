// The browser captures that scripts/hygiene-fixtures.mjs wrote, read from
// this folder. Kept apart from hygiene-legacy.ts, which reads the originals
// of record, so a test that needs only a capture runs on a hosted runner.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const FIX = fileURLToPath(new URL("./", import.meta.url));

export interface CollarArt { boost: number; gap: number; minF: number; despeck: boolean }

export interface SprueMask { w: number; h: number; d: Uint8Array }

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
