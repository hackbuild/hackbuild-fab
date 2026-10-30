// D-166 untrusted-input fuzz for the share decoder (TESTING.md 4.2.1).
// Every generated hash either decodes inside the limits or is refused with
// E_SCHEMA naming a share-link rule; any throw, a decoded text over the
// cap, or a refusal without a rule fails. Inflation bombs are generated at
// test time, never committed.
//
// Push runs FC_RUNS=100, nightly FC_RUNS=2000; the seed prints on failure.
// Replay: FC_SEED=<s> FC_PATH=<p> npx vitest run packages/bench-core/test/bench/share.fuzz.prop.test.ts

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { currentOnly, decodeShare, encodeShare, SHARE_MAX_BYTES, type AdmitOptions } from "../../src/bench/share.js";

const FC_RUNS = Number(process.env["FC_RUNS"] ?? 100);
const SEED = Number(process.env["FC_SEED"] ?? 20261011);
const PATH = process.env["FC_PATH"];
const params = (numRuns: number): fc.Parameters<unknown> => ({ seed: SEED, numRuns, ...(PATH !== undefined ? { path: PATH, endOnFailure: true } : {}) });
const CHASE = 2;

const validate = (d: unknown): string | null => (d !== null && typeof d === "object" && "state" in d ? null : "no state");
const opts: AdmitOptions = { migrate: currentOnly(CHASE), validate };

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const s = new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(s).arrayBuffer());
}

const b64 = (u: Uint8Array): string => Buffer.from(u).toString("base64url");

const version = fc.oneof(
  fc.constant(String(CHASE)),
  fc.integer({ min: 0, max: 999999 }).map(String),
  fc.constantFrom("", "x", "-1", "2.5", "1e3", "２"),
);

const hash = fc.oneof(
  // well formed designs, some failing validate
  fc.tuple(version, fc.oneof(fc.record({ state: fc.jsonValue() }), fc.jsonValue())).map(async ([v, d]) => `#d=${v}.${(await encodeShare(JSON.stringify(d), CHASE)).slice(5)}`),
  // no version prefix
  fc.jsonValue().map(async (d) => `#d=${(await encodeShare(JSON.stringify(d), CHASE)).slice(5)}`),
  // inflation past the cap
  fc.integer({ min: SHARE_MAX_BYTES + 1, max: SHARE_MAX_BYTES * 3 }).map(async (n) => `#d=${CHASE}.${b64(await deflate(new Uint8Array(n).fill(0x61)))}`),
  // random bytes and random text as payload
  fc.uint8Array({ maxLength: 256 }).map(async (u) => `#d=${CHASE}.${b64(u)}`),
  fc.string({ maxLength: 64 }).map(async (s) => `#d=${CHASE}.${s}`),
  fc.string({ maxLength: 64 }).map(async (s) => `#d=${s}`),
);

describe("share decoder fuzz", () => {
  it("decodes inside the cap or refuses with an E_SCHEMA share-link rule", async () => {
    await fc.assert(
      fc.asyncProperty(hash, async (h) => {
        const got = await decodeShare(await h, opts);
        if (got === null) return;
        if (got.ok) {
          expect(new TextEncoder().encode(got.text).byteLength).toBeLessThanOrEqual(SHARE_MAX_BYTES);
          expect(got.version).toBe(CHASE);
          expect(validate(got.design)).toBeNull();
        } else {
          expect(got.error.code).toBe("E_SCHEMA");
          expect(got.error.record).toMatch(/^share-link\/(format|version|base64url|inflate|oversize|json|legacy|migrate|validate)$/);
        }
      }),
      params(FC_RUNS),
    );
  }, 120_000);
});
