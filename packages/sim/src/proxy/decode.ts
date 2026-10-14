// Decode the DAVIT runtime blob. sim_r4.html line 151 holds the R4 blob
// (canonical lineage row davit.collide/r4-page) and the R3 page davit.html
// line 148 `const DATA = {...}` (copy row davit.collide/r3-page), which the
// std hybrid fixture reads. Proxy points are u16 triples quantized against
// lo and hi; coarse groups are [cx, cy, cz, r, start, end] over contiguous
// ranges of the point array.

export interface ProxyRecord { readonly p: string; readonly n: number; readonly lo: readonly number[]; readonly hi: readonly number[]; readonly g: readonly (readonly number[])[] }
export interface MeshRecord { readonly v: string; readonly f: string; readonly nv: number; readonly nf: number; readonly ft: string; readonly lo: readonly number[]; readonly hi: readonly number[] }
export interface PairRecord { readonly a: string; readonly b: string; readonly skipA: readonly number[]; readonly skipB: readonly number[] }

/** The pieces of DATA this port reads. */
export interface DavitData {
  readonly parts: Readonly<Record<string, MeshRecord>>;
  readonly hw: Readonly<Record<string, MeshRecord>>;
  readonly prox: Readonly<Record<string, ProxyRecord>>;
  readonly pairs: readonly PairRecord[];
  readonly pairsMini: readonly PairRecord[];
  readonly hubPairs: Readonly<Record<string, readonly PairRecord[]>>;
  readonly hubPairsMini: Readonly<Record<string, readonly PairRecord[]>>;
  readonly const: unknown;
  readonly constm: unknown;
}

/** One decoded proxy: points (float32 as the legacy runtime holds them) and coarse groups. */
export interface Proxy {
  readonly n: number;
  readonly pts: Float32Array;
  /** Six numbers per group: cx, cy, cz, r, start, end. */
  readonly groups: Float64Array;
}

/** Parse the `const DATA = {...};` line out of a legacy page. */
export function extractData(html: string): DavitData {
  const at = html.indexOf("const DATA = ");
  if (at < 0) throw new Error("davit page holds no const DATA line");
  const start = html.indexOf("{", at);
  const end = html.indexOf("\n", start);
  const line = html.slice(start, end).trimEnd();
  return JSON.parse(line.endsWith(";") ? line.slice(0, -1) : line) as DavitData;
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const B64_INDEX = new Map([...B64].map((c, i) => [c, i]));

function bytes(b64: string): Uint8Array {
  const clean = b64.replace(/=+$/, "");
  const out = new Uint8Array(Math.floor((clean.length * 6) / 8));
  let acc = 0, bits = 0, at = 0;
  for (const ch of clean) {
    acc = (acc << 6) | B64_INDEX.get(ch)!;
    bits += 6;
    if (bits >= 8) { bits -= 8; out[at++] = (acc >> bits) & 255; acc &= (1 << bits) - 1; }
  }
  return out;
}

function u16(b64: string): Uint16Array {
  const u = bytes(b64);
  return new Uint16Array(u.buffer, u.byteOffset, u.byteLength / 2);
}

export function decodeProxy(rec: ProxyRecord): Proxy {
  const q = u16(rec.p);
  const pts = new Float32Array(rec.n * 3);
  for (let i = 0; i < rec.n; i += 1) {
    for (let a = 0; a < 3; a += 1) pts[i * 3 + a] = rec.lo[a]! + (q[i * 3 + a]! / 65535) * (rec.hi[a]! - rec.lo[a]!);
  }
  const groups = new Float64Array(rec.g.length * 6);
  rec.g.forEach((g, i) => groups.set(g, i * 6));
  return { n: rec.n, pts, groups };
}

/** Triangle soup in mm, nine numbers per triangle, from a parts or hw record (davit.html geomOf). */
export function decodeSoup(rec: MeshRecord): Float64Array {
  const q = u16(rec.v);
  const span = [0, 1, 2].map((a) => (rec.hi[a]! - rec.lo[a]! < 1e-9 ? 1 : rec.hi[a]! - rec.lo[a]!));
  const f = rec.ft === "u16" ? u16(rec.f) : new Uint32Array(bytes(rec.f).buffer.slice(0));
  const out = new Float64Array(f.length * 3);
  for (let i = 0; i < f.length; i += 1) {
    const v = f[i]!;
    for (let a = 0; a < 3; a += 1) out[i * 3 + a] = rec.lo[a]! + (q[v * 3 + a]! / 65535) * span[a]!;
  }
  return out;
}
