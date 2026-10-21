// Stored inputs: the meshes and page lines a shipped scene or kernel reads,
// committed beside the code so nothing at run time reads a legacy folder
// (PLAN.md 5, R1-rails-public-09). Each folder holds a stored-inputs.json
// whose rows name the file, its sha256 and bytes, the archive source in the
// publish form of tools/publish-paths.mjs with that source's sha256, how the
// file is taken from it (the whole file, one zip member, or a line range),
// and the lineage row that records the copy.
//
// stored-inputs.test.ts checks the committed bytes against the rows with no
// archive; stored-inputs-originals.test.ts takes each row again from its
// source through localSource and compares, so a stored file cannot drift
// from the original it claims.

import { readFileSync, readdirSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { fileURLToPath } from "node:url";

export interface StoredRow {
  /** Path relative to the folder holding stored-inputs.json. */
  readonly path: string;
  readonly sha256: string;
  readonly bytes: number;
  /** The archive file, publish form. */
  readonly source: string;
  readonly sourceSha256: string;
  /** A zip member of source, when the file is one. */
  readonly member?: string;
  /** First and last line of source, 1 based, inclusive; the file ends with a newline. */
  readonly lines?: readonly [number, number];
  /** The lineage.json row id naming this copy. */
  readonly lineage: string;
}

export const MANIFEST = "stored-inputs.json";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SKIP = new Set(["node_modules", "dist", "legacy", ".git"]);

/** Every folder under packages/ holding a stored-inputs.json, repo relative, sorted. */
export function storedFolders(root: string = ROOT): string[] {
  const out: string[] = [];
  const walk = (rel: string): void => {
    for (const e of readdirSync(`${root}${rel}`, { withFileTypes: true })) {
      if (SKIP.has(e.name)) continue;
      if (e.isDirectory()) walk(`${rel}/${e.name}`);
      else if (e.name === MANIFEST) out.push(rel);
    }
  };
  walk("packages");
  return out.sort();
}

export function storedRows(folder: string, root: string = ROOT): StoredRow[] {
  return (JSON.parse(readFileSync(`${root}${folder}/${MANIFEST}`, "utf8")) as { files: StoredRow[] }).files;
}

/** The repo-relative path of every file under a folder except the manifest. */
export function storedFiles(folder: string, root: string = ROOT): string[] {
  return (readdirSync(`${root}${folder}`, { recursive: true, withFileTypes: true }) as { name: string; parentPath: string; isFile(): boolean }[])
    .filter((e) => e.isFile() && !(e.parentPath === `${root}${folder}` && e.name === MANIFEST))
    .map((e) => `${e.parentPath.slice(root.length + folder.length + 1)}/${e.name}`.replace(/^\//, ""))
    .sort();
}

interface ZipEntry { readonly name: string; readonly method: number; readonly size: number; readonly local: number }

/** The central directory of a zip, in its order. */
function zipEntries(b: Buffer): ZipEntry[] {
  const eocd = b.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error("not a zip: no end of central directory record");
  let at = b.readUInt32LE(eocd + 16);
  const out: ZipEntry[] = [];
  for (let i = 0, count = b.readUInt16LE(eocd + 10); i < count; i += 1) {
    if (b.readUInt32LE(at) !== 0x02014b50) throw new Error(`zip central directory entry ${i} is malformed`);
    const nameLen = b.readUInt16LE(at + 28);
    out.push({ name: b.toString("utf8", at + 46, at + 46 + nameLen), method: b.readUInt16LE(at + 10), size: b.readUInt32LE(at + 20), local: b.readUInt32LE(at + 42) });
    at += 46 + nameLen + b.readUInt16LE(at + 30) + b.readUInt16LE(at + 32);
  }
  return out;
}

const asBuffer = (zip: Uint8Array): Buffer => Buffer.from(zip.buffer, zip.byteOffset, zip.byteLength);

/** The member names of a zip, in its central directory order. */
export function zipNames(zip: Uint8Array): string[] {
  return zipEntries(asBuffer(zip)).map((e) => e.name);
}

/** One member of a zip, stored or deflated, found through the central directory. */
export function zipMember(zip: Uint8Array, name: string): Buffer {
  const b = asBuffer(zip);
  const e = zipEntries(b).find((x) => x.name === name);
  if (e === undefined) throw new Error(`zip holds no member ${name}`);
  const start = e.local + 30 + b.readUInt16LE(e.local + 26) + b.readUInt16LE(e.local + 28);
  const data = b.subarray(start, start + e.size);
  if (e.method === 0) return Buffer.from(data);
  if (e.method === 8) return inflateRawSync(data);
  throw new Error(`zip member ${name} uses method ${e.method}; only stored and deflate are read`);
}

/** The bytes a row stores, taken from its source's bytes. */
export function takeStored(row: StoredRow, source: Uint8Array): Buffer {
  if (row.member !== undefined) return zipMember(source, row.member);
  const text = Buffer.from(source.buffer, source.byteOffset, source.byteLength);
  if (row.lines === undefined) return Buffer.from(text);
  const [first, last] = row.lines;
  const lines = text.toString("utf8").split("\n");
  if (last > lines.length) throw new Error(`${row.source} has ${lines.length} lines; ${row.path} takes ${first} to ${last}`);
  return Buffer.from(`${lines.slice(first - 1, last).join("\n")}\n`, "utf8");
}
