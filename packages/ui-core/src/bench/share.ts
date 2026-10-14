// Share links (D-125, D-167) and the untrusted design gate (D-166).
// `#d=<meta.chase>.<base64url of deflate-raw design JSON>`. Decode reads
// the version, inflates through a counting reader that stops past 1 MB,
// parses, migrates from that version, validates, and only then hands the
// design to loadDesign. The drop and file picker paths call admitDesign,
// the same cap and validate. Saving a link never writes storage.

import type { CommandError } from "@hackbuild/spec";

/** Inflated payload cap, bytes (D-166, inferred plan budget). */
export const SHARE_MAX_BYTES = 1_048_576;
/** The line a refused link logs before the bench boots blank (M09-T04 step 3). */
export const SHARE_REFUSED = "share link could not be read, opened blank";

export interface Admitted {
  readonly ok: true;
  /** Chase schema version from the prefix, or "legacy" for an unprefixed payload, or null for a dropped file. */
  readonly version: number | "legacy" | null;
  /** The document text as received, after inflate. */
  readonly text: string;
  /** The parsed document after migrate. */
  readonly design: unknown;
}

export interface Refused {
  readonly ok: false;
  readonly error: CommandError;
}

export type Admission = Admitted | Refused;

export interface AdmitOptions {
  /** Upgrade from `version`; throw to refuse. */
  readonly migrate?: (version: number, doc: unknown) => unknown;
  /** Read a payload without a version prefix as the design's legacy bench JSON (`migrate/legacy.ts`); absent refuses it. */
  readonly legacy?: (doc: unknown) => unknown;
  /** null when the document is valid, else the reason. */
  readonly validate: (doc: unknown) => string | null;
}

function refuse(rule: string, hint: string, got?: unknown, expected?: string): Refused {
  return {
    ok: false,
    error: {
      code: "E_SCHEMA",
      record: `share-link/${rule}`,
      hint,
      ...(got !== undefined ? { got } : {}),
      ...(expected !== undefined ? { expected } : {}),
    },
  };
}

function message(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** The binding migrate until M10-T03 wires packages/chase: the current version passes, any other is refused. */
export function currentOnly(current: number): (version: number, doc: unknown) => unknown {
  return (version, doc) => {
    if (version !== current) throw new Error(`chase version ${version}, this bench reads ${current}`);
    return doc;
  };
}

function toBase64url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(s: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(s) || s.length % 4 === 1) return null;
  try {
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

async function pump(bytes: Uint8Array, stream: CompressionStream | DecompressionStream, cap: number): Promise<Uint8Array | "over"> {
  const writer = stream.writable.getWriter();
  // Errors surface on the reader; the writer side is closed or cancelled with it.
  writer.write(bytes as Uint8Array<ArrayBuffer>).catch(() => undefined);
  writer.close().catch(() => undefined);
  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > cap) {
      await reader.cancel().catch(() => undefined);
      return "over";
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out;
}

export async function encodeShare(designJson: string, chaseVersion: number): Promise<string> {
  const packed = await pump(new TextEncoder().encode(designJson), new CompressionStream("deflate-raw"), Number.POSITIVE_INFINITY);
  if (packed === "over") throw new Error("unreachable");
  return `#d=${chaseVersion}.${toBase64url(packed)}`;
}

function admitParsed(text: string, version: number | "legacy" | null, opts: AdmitOptions): Admission {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch (e) {
    return refuse("json", `design is not json: ${message(e)}`);
  }
  try {
    if (version === "legacy") {
      if (opts.legacy === undefined) return refuse("legacy", "link has no version and this design reads no legacy saves");
      doc = opts.legacy(doc);
    } else if (version !== null && opts.migrate !== undefined) {
      doc = opts.migrate(version, doc);
    }
  } catch (e) {
    return refuse("migrate", `design could not be upgraded: ${message(e)}`, version);
  }
  const why = opts.validate(doc);
  if (why !== null) return refuse("validate", `design failed validation: ${why}`);
  return { ok: true, version, text, design: doc };
}

/** Drop and file picker: the D-166 cap and validate before loadDesign. */
export function admitDesign(text: string, opts: AdmitOptions): Admission {
  const bytes = new TextEncoder().encode(text).byteLength;
  if (bytes > SHARE_MAX_BYTES) return refuse("oversize", `design is ${bytes} bytes, over the ${SHARE_MAX_BYTES} byte limit`, bytes, `at most ${SHARE_MAX_BYTES} bytes`);
  return admitParsed(text, null, opts);
}

/** null when the hash carries no `d=` design. */
export async function decodeShare(hash: string, opts: AdmitOptions): Promise<Admission | null> {
  const h = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!h.startsWith("d=")) return null;
  const m = /^d=(?:([^.]*)\.)?(.*)$/s.exec(h);
  if (m === null) return refuse("format", "link is not a design link");
  let version: number | "legacy" = "legacy";
  if (m[1] !== undefined) {
    if (!/^[0-9]{1,6}$/.test(m[1])) return refuse("version", `link version "${m[1]}" is not a whole number`, m[1]);
    version = Number(m[1]);
  }
  const packed = fromBase64url(m[2] ?? "");
  if (packed === null) return refuse("base64url", "link payload is not base64url");
  let raw: Uint8Array | "over";
  try {
    raw = await pump(packed, new DecompressionStream("deflate-raw"), SHARE_MAX_BYTES);
  } catch (e) {
    return refuse("inflate", `link payload does not inflate: ${message(e)}`);
  }
  if (raw === "over") return refuse("oversize", `link payload inflates past ${SHARE_MAX_BYTES} bytes`, undefined, `at most ${SHARE_MAX_BYTES} bytes`);
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(raw);
  } catch {
    return refuse("json", "link payload is not utf-8 text");
  }
  return admitParsed(text, version, opts);
}

/** The slice of a bench core a share link boots through. */
export interface ShareTarget {
  loadDesign(json: string): boolean;
  reset(): void;
  appendLog(line: string): void;
}

/**
 * Boot from `location.hash` after the welcome decision. A design that
 * passes loads through loadDesign; a refusal logs SHARE_REFUSED with its
 * rule and boots blank. Returns true when a design loaded.
 */
export async function openShare(target: ShareTarget, hash: string, opts: AdmitOptions): Promise<boolean> {
  const got = await decodeShare(hash, opts);
  if (got === null) return false;
  if (!got.ok) {
    target.appendLog(`${SHARE_REFUSED}: ${got.error.record ?? "share-link"}, ${got.error.hint}`);
    target.reset();
    return false;
  }
  if (target.loadDesign(JSON.stringify(got.design))) return true;
  target.appendLog(`${SHARE_REFUSED}: loadDesign refused it`);
  target.reset();
  return false;
}
