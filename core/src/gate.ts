// requestState for the host gate (D-109, M12-T04 step 1). One approval binds
// one command, one args digest and one build hash, once, for 10 minutes. The
// MAC key lives in <workspace>/.hbf/gate.key, mode 0600, never logged. What
// this does not stop: an actor holding the user's shell (spec GateClaim).

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { chmodSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, writeSync } from "node:fs";
import path from "node:path";
import { GATE_EXPIRY_MS } from "@hackbuild/spec";

/** Keys in RFC 8785 order, so JSON.stringify of this literal shape is canonical. */
export interface GateClaim {
  /** digestArgs of the command args: requestState and inputResponses removed, null and false fields dropped. */
  argsDigest: string;
  /** buildHash the person was shown. */
  buildHash: string;
  /** CommandName, e.g. "export.run". */
  cmd: string;
  /** Expiry, ms since epoch: issue time plus GATE_EXPIRY_MS. */
  exp: number;
  /** 16 random bytes, base64url. */
  nonce: string;
}

export type GateCheck =
  | { ok: true; claim: GateClaim }
  | { ok: false; reason: "malformed" | "forged" | "expired" | "replayed" | "args-moved" };

/** Persisted single-use set: one JSON line per used nonce in .hbf/gate-used.jsonl. */
export interface NonceLedger {
  /** Atomic across processes: true when this call recorded the nonce, false when it was already present. */
  consume(nonce: string, exp: number): boolean;
}

export const GATE_TTL_MS = GATE_EXPIRY_MS;

export function canonicalClaim(c: GateClaim): string {
  return JSON.stringify({ argsDigest: c.argsDigest, buildHash: c.buildHash, cmd: c.cmd, exp: c.exp, nonce: c.nonce });
}

/**
 * argsDigest: sha256 hex of RFC 8785 JSON of the args with requestState and
 * inputResponses removed and every null or false field dropped. Gated
 * commands take flat args, so only the top level is pruned. `canonical` is
 * the RFC 8785 serializer the store uses for inputsHash.
 */
export function digestArgs(args: Readonly<Record<string, unknown>>, canonical: (v: unknown) => string): string {
  const kept: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) {
    if (k === "requestState" || k === "inputResponses" || v === null || v === false) continue;
    kept[k] = v;
  }
  return createHash("sha256").update(canonical(kept)).digest("hex");
}

export function newNonce(): string {
  return randomBytes(16).toString("base64url");
}

export function mintState(c: GateClaim, key: Buffer): string {
  const body = Buffer.from(canonicalClaim(c)).toString("base64url");
  const mac = createHmac("sha256", key).update(body).digest("base64url");
  return `${body}.${mac}`;
}

/**
 * Order matters: MAC first (forged), then shape (malformed), expiry, args, nonce.
 * args-moved is checked before the nonce is consumed, so a state minted for other args is not burned.
 * The build hash is compared by the caller after a fresh build: a moved hash re-asks.
 */
export function verifyState(
  state: string,
  key: Buffer,
  nowMs: number,
  ledger: NonceLedger,
  expect: { cmd: string; argsDigest: string },
): GateCheck {
  const parts = state.split(".");
  const body = parts[0];
  const mac = parts[1];
  if (parts.length !== 2 || body === undefined || mac === undefined) return { ok: false, reason: "malformed" };
  const want = createHmac("sha256", key).update(body).digest();
  const got = Buffer.from(mac, "base64url");
  if (got.length !== want.length || !timingSafeEqual(got, want)) return { ok: false, reason: "forged" };
  let claim: GateClaim;
  try {
    claim = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as GateClaim;
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (typeof claim !== "object" || claim === null || typeof claim.exp !== "number" || typeof claim.nonce !== "string") return { ok: false, reason: "malformed" };
  if (claim.exp < nowMs) return { ok: false, reason: "expired" };
  if (claim.cmd !== expect.cmd || claim.argsDigest !== expect.argsDigest) return { ok: false, reason: "args-moved" };
  if (!ledger.consume(claim.nonce, claim.exp)) return { ok: false, reason: "replayed" };
  return { ok: true, claim };
}

/**
 * The workspace gate key: 32 random bytes created on first use with mode
 * 0600 (O_EXCL, so two servers starting together agree on one key). The
 * bytes never leave this process.
 */
export function gateKey(workspace: string): Buffer {
  const dir = path.join(workspace, ".hbf");
  const file = path.join(dir, "gate.key");
  if (!existsSync(file)) {
    mkdirSync(dir, { recursive: true });
    try {
      const fd = openSync(file, "wx", 0o600);
      try {
        writeSync(fd, randomBytes(32));
      } finally {
        closeSync(fd);
      }
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    }
  }
  chmodSync(file, 0o600);
  const key = readFileSync(file);
  if (key.length !== 32) throw new Error(`.hbf/gate.key holds ${key.length} bytes, expected 32; remove it and retry`);
  return key;
}
