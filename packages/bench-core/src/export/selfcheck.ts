// The export self-check: what a 3MF must hold before the shell hands it to a
// download. The rules are the package rules of tools/py/validate_3mf.py ported
// to a reader that needs no Python and no zip library (CHK-3MF-06 ids and
// references, CHK-ART-01 names, CHK-PRT-01 topology) plus the p:UUID
// uniqueness the 3MF production extension asks for. A failing rule refuses the
// download and names itself. The same function runs in a CDN page, a baked
// bench and a Vue host, because it ships in bench-core.

export type SelfCheckRule = "3mf-zip" | "3mf-id" | "3mf-uuid" | "3mf-name" | "3mf-manifold";

export interface SelfCheckFinding {
  readonly rule: SelfCheckRule;
  /** What failed, measured, legal, constraint, fix; one line. */
  readonly line: string;
}

/** The refusal an export raises; the shell logs `message` and writes no download. */
export class ExportSelfCheckError extends Error {
  readonly findings: readonly SelfCheckFinding[];
  constructor(findings: readonly SelfCheckFinding[]) {
    super(`export refused by the self-check: ${findings.map((f) => `${f.rule}, ${f.line}`).join("; ")}`);
    this.name = "ExportSelfCheckError";
    this.findings = findings;
  }
}

const u16 = (b: Uint8Array, o: number): number => b[o]! | (b[o + 1]! << 8);
const u32 = (b: Uint8Array, o: number): number => (b[o]! | (b[o + 1]! << 8) | (b[o + 2]! << 16) | (b[o + 3]! << 24)) >>> 0;
const TEXT_ENTRY = /\.(model|rels|config|xml)$/i;

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** The text entries (.model, .rels, .config, .xml) of a zip, by name. Stored and deflated members only. */
export async function readZipText(bytes: Uint8Array): Promise<Map<string, string>> {
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i--) {
    if (u32(bytes, i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("no end of central directory");
  const count = u16(bytes, eocd + 10);
  let p = u32(bytes, eocd + 16);
  const out = new Map<string, string>();
  const td = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (u32(bytes, p) !== 0x02014b50) throw new Error("central directory entry is damaged");
    const method = u16(bytes, p + 10), csize = u32(bytes, p + 20);
    const nameLen = u16(bytes, p + 28), extraLen = u16(bytes, p + 30), commentLen = u16(bytes, p + 32), local = u32(bytes, p + 42);
    const name = td.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (!TEXT_ENTRY.test(name)) continue;
    const dataAt = local + 30 + u16(bytes, local + 26) + u16(bytes, local + 28);
    const raw = bytes.subarray(dataAt, dataAt + csize);
    if (method === 0) out.set(name, td.decode(raw));
    else if (method === 8) out.set(name, td.decode(await inflateRaw(raw)));
    else throw new Error(`entry ${name} uses compression method ${method}`);
  }
  return out;
}

type Attrs = Record<string, string>;

function attrsOf(tag: string): Attrs {
  const a: Attrs = {};
  for (const m of tag.matchAll(/([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) a[m[1]!] = m[3] ?? m[4] ?? "";
  return a;
}

const tagsOf = (xml: string, name: string): Attrs[] => [...xml.matchAll(new RegExp(`<${name}(?=[\\s/>])[^>]*>`, "g"))].map((m) => attrsOf(m[0]));
const UNRESOLVED = /(^|[^A-Za-z])(undefined|null|NaN)([^A-Za-z]|$)/;

interface ObjectBlock { readonly attrs: Attrs; readonly body: string }

function objectsOf(xml: string): ObjectBlock[] {
  return [...xml.matchAll(/<object(?=[\s>])([^>]*)>([\s\S]*?)<\/object>/g)].map((m) => ({ attrs: attrsOf(m[1]!), body: m[2]! }));
}

function meshProblems(body: string): string[] {
  const mesh = /<mesh[\s>][\s\S]*<\/mesh>/.exec(body)?.[0];
  if (mesh === undefined) return [];
  const verts = tagsOf(mesh, "vertex").map((v) => [Number(v["x"]), Number(v["y"]), Number(v["z"])] as const);
  const tris = tagsOf(mesh, "triangle").map((t) => [Number(t["v1"]), Number(t["v2"]), Number(t["v3"])] as const);
  if (tris.length === 0) return ["no triangles"];
  if (tris.some((t) => t.some((i) => !Number.isInteger(i) || i < 0 || i >= verts.length))) return ["a triangle index is out of range"];
  const directed = new Map<string, number>();
  const undirected = new Map<string, number>();
  let vol = 0;
  for (const [a, b, c] of tris) {
    for (const [i, j] of [[a, b], [b, c], [c, a]] as const) {
      directed.set(`${i}>${j}`, (directed.get(`${i}>${j}`) ?? 0) + 1);
      const k = i < j ? `${i}-${j}` : `${j}-${i}`;
      undirected.set(k, (undirected.get(k) ?? 0) + 1);
    }
    const [ax, ay, az] = verts[a]!, [bx, by, bz] = verts[b]!, [cx, cy, cz] = verts[c]!;
    vol += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  const out: string[] = [];
  const odd = [...undirected.values()].filter((n) => n !== 2).length;
  if (odd > 0) out.push(`${odd} undirected edges not shared by exactly two faces`);
  if ([...directed.values()].some((n) => n !== 1)) out.push("inconsistent winding, a directed edge repeats");
  if (!(vol > 0)) out.push(`signed volume ${vol.toFixed(4)} mm3 computed is not positive`);
  return out;
}

function counts(values: readonly string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
}

/** The self-check over the text entries of a 3MF package, in rule order. */
export function check3mfEntries(entries: ReadonlyMap<string, string>): SelfCheckFinding[] {
  const out: SelfCheckFinding[] = [];
  const models = [...entries.entries()].filter(([n]) => /\.model$/i.test(n));
  if (models.length === 0) return [{ rule: "3mf-zip", line: "package holds no .model part, legal at least 1, set by the 3MF core spec, rebuild the export" }];

  for (const [name, xml] of models) {
    const ids = objectsOf(xml).map((o) => o.attrs["id"] ?? "");
    for (const [id, n] of counts(ids)) {
      if (id === "" || n > 1) out.push({ rule: "3mf-id", line: `object id ${id === "" ? "missing" : id} appears ${n} times in ${name}, legal exactly 1, set by the 3MF core spec, renumber the objects` });
    }
    const known = new Set(ids);
    for (const t of [...tagsOf(xml, "item"), ...tagsOf(xml, "component")]) {
      const ref = t["objectid"] ?? "";
      if (t["p:path"] === undefined && !known.has(ref)) out.push({ rule: "3mf-id", line: `objectid ${ref} in ${name} names no object, legal an id declared in the same part, set by CHK-3MF-06, declare it or drop the reference` });
    }
  }

  const uuids: string[] = [];
  for (const [, xml] of models) for (const m of xml.matchAll(/\bp:UUID\s*=\s*"([^"]*)"/g)) uuids.push(m[1]!.toLowerCase());
  for (const [u, n] of counts(uuids)) {
    if (n > 1) out.push({ rule: "3mf-uuid", line: `p:UUID ${u} appears ${n} times, legal exactly 1 across the package, set by the 3MF production extension, derive each UUID from its object id and role` });
  }

  const settings = entries.get("Metadata/model_settings.config");
  const names: string[] = [];
  if (settings !== undefined) {
    for (const o of objectsOf(settings)) names.push(/<metadata\b[^>]*\bkey\s*=\s*"name"[^>]*\bvalue\s*=\s*"([^"]*)"/.exec(o.body)?.[1] ?? "");
  } else {
    const root = entries.get("3D/3dmodel.model");
    if (root !== undefined) for (const o of objectsOf(root)) if (/<components[\s>]/.test(o.body)) names.push(o.attrs["name"] ?? "");
  }
  names.forEach((n, i) => {
    if (n.trim() === "" || UNRESOLVED.test(n)) out.push({ rule: "3mf-name", line: `object ${i} name ${JSON.stringify(n)} is ${n.trim() === "" ? "empty" : "an unresolved token"}, legal a resolved non-empty name, set by CHK-ART-01, name the part in the chase` });
  });
  for (const [n, k] of counts(names)) {
    if (k > 1 && n.trim() !== "") out.push({ rule: "3mf-name", line: `object name ${JSON.stringify(n)} used ${k} times, legal unique, set by CHK-ART-01, give each object its own name` });
  }

  for (const [name, xml] of models) {
    for (const o of objectsOf(xml)) {
      const bad = meshProblems(o.body);
      if (bad.length > 0) out.push({ rule: "3mf-manifold", line: `mesh ${name}#${o.attrs["id"] ?? "?"}: ${bad.join(", ")}, legal a closed manifold with two faces per edge and positive volume, set by CHK-PRT-01, repair the part before export` });
    }
  }
  return out;
}

/** Unzips a 3MF and runs the self-check; a damaged zip is the one finding. */
export async function selfCheck3mf(bytes: Uint8Array): Promise<SelfCheckFinding[]> {
  let entries: Map<string, string>;
  try {
    entries = await readZipText(bytes);
  } catch (e) {
    return [{ rule: "3mf-zip", line: `package unreadable: ${e instanceof Error ? e.message : String(e)}, legal a zip of 3MF parts, set by the 3MF core spec, rebuild the export` }];
  }
  return check3mfEntries(entries);
}

/** Throws ExportSelfCheckError naming every failing rule; returns when the package passes. */
export async function assertExportable(kind: string, bytes: Uint8Array): Promise<void> {
  if (kind !== "3mf") return;
  const findings = await selfCheck3mf(bytes);
  if (findings.length > 0) throw new ExportSelfCheckError(findings);
}
