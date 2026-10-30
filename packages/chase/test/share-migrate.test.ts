// Share links and legacy saves through migrate (D-167; M10-T03 step 5). A
// `#d=1.` link of the handoff template loads as schema 2; an unprefixed
// PIP legacy save loads through designs/pip/migrate/legacy.ts; every file
// under designs/*/test/fixtures/legacy/ matches its SHA256SUMS and loads
// with 0 E_SCHEMA. The link is the D-125 form `#d=<meta.chase>.<base64url
// of deflate-raw JSON>`; bench-core decodeShare reads it in the bench, and
// packages/bench-core/test/share-chase.test.ts runs the same options through
// that decoder.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { shareOptions, type ShareOptions } from "@hackbuild/chase";
import { CHASE_SCHEMA_VERSION, type Chase } from "@hackbuild/spec";
import { legacy as pipLegacy } from "../../../designs/pip/migrate/legacy.js";
import { ROOT, flexPair } from "./helpers.js";

const encode = (doc: unknown, version?: number): string => {
  const b = deflateRawSync(Buffer.from(JSON.stringify(doc))).toString("base64url");
  return version === undefined ? `#d=${b}` : `#d=${version}.${b}`;
};

/** decodeShare's order: version prefix, inflate, parse, legacy or migrate, validate. */
function admit(hash: string, opts: ShareOptions): { ok: true; design: unknown } | { ok: false; why: string } {
  const m = /^#d=(?:([0-9]{1,6})\.)?(.*)$/s.exec(hash);
  if (m === null) return { ok: false, why: "format" };
  let doc = JSON.parse(inflateRawSync(Buffer.from(m[2] ?? "", "base64url")).toString("utf8")) as unknown;
  try {
    if (m[1] === undefined) {
      if (opts.legacy === undefined) return { ok: false, why: "legacy" };
      doc = opts.legacy(doc);
    } else doc = opts.migrate(Number(m[1]), doc);
  } catch (e) {
    return { ok: false, why: `migrate: ${(e as Error).message}` };
  }
  const why = opts.validate(doc);
  return why === null ? { ok: true, design: doc } : { ok: false, why };
}

const template = (): unknown => JSON.parse(readFileSync(path.join(ROOT, "packages", "chase", "test", "fixtures", "v1", "_template.chase.json"), "utf8"));

describe("a #d=1. link of the handoff template", () => {
  it("loads as schema 2", () => {
    const got = admit(encode(template(), 1), shareOptions());
    expect(got.ok).toBe(true);
    if (!got.ok) return;
    const c = got.design as Chase;
    expect([c.meta.chase, c.meta.machines, c.meta.license]).toEqual([CHASE_SCHEMA_VERSION, ["ffc5p"], "CC-BY-SA-4.0"]);
  });
  it("is refused when the prefix disagrees with meta.chase, or names a newer schema", () => {
    expect(admit(encode(template(), 2), shareOptions())).toMatchObject({ ok: false });
    expect(admit(encode(template(), 3), shareOptions())).toMatchObject({ ok: false });
  });
  it("is refused with no prefix when the design reads no legacy saves", () => {
    expect(admit(encode(template()), shareOptions())).toEqual({ ok: false, why: "legacy" });
  });
});

describe("a design document link", () => {
  const chase = flexPair();
  it("validates the normalised params against the derived schema", () => {
    expect(admit(encode({ app: "keys-flex-pair", v: 1, state: { W: 70, extra: 1 } }, 2), shareOptions({ chase }))).toMatchObject({ ok: true });
    expect(admit(encode({ app: "keys-flex-pair", v: 1, state: { W: 999 } }, 2), shareOptions({ chase }))).toMatchObject({ ok: false });
  });
});

describe("legacy saves", () => {
  const opts = shareOptions({ legacy: pipLegacy });
  it("an unprefixed PIP legacy save loads through designs/pip/migrate/legacy.ts", () => {
    const save = JSON.parse(readFileSync(path.join(ROOT, "designs", "pip", "test", "fixtures", "legacy", "pip-design.json"), "utf8")) as { state: unknown };
    const got = admit(encode(save), opts);
    expect(got).toMatchObject({ ok: true, design: { app: "pip", legacy: { app: "pip-bench", v: 1 } } });
    if (got.ok) expect((got.design as { state: unknown }).state).toEqual(save.state);
  });
  it("a payload from another app is refused", () => {
    expect(admit(encode({ app: "knurl", v: 1, state: {} }), opts)).toMatchObject({ ok: false });
  });

  const designs = readdirSync(path.join(ROOT, "designs"), { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(path.join(ROOT, "designs", d.name, "test", "fixtures", "legacy")))
    .map((d) => d.name).sort();
  it("finds the designs with legacy fixtures, each with migrate/legacy.ts", () => {
    expect(designs).toContain("pip");
    for (const d of designs) expect(existsSync(path.join(ROOT, "designs", d, "migrate", "legacy.ts"))).toBe(true);
  });
  const files = designs.flatMap((d) => {
    const dir = path.join(ROOT, "designs", d, "test", "fixtures", "legacy");
    return readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => [d, f] as const);
  });
  it.each(files)("designs/%s/test/fixtures/legacy/%s matches SHA256SUMS and loads with 0 E_SCHEMA", async (d, f) => {
    const dir = path.join(ROOT, "designs", d, "test", "fixtures", "legacy");
    const sums = new Map(readFileSync(path.join(dir, "SHA256SUMS"), "utf8").trim().split("\n").map((l) => [l.slice(66), l.slice(0, 64)] as const));
    const bytes = readFileSync(path.join(dir, f));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(sums.get(f));
    const mod = (await import(path.join(ROOT, "designs", d, "migrate", "legacy.ts"))) as { legacy: (doc: unknown) => unknown };
    expect(admit(encode(JSON.parse(bytes.toString("utf8"))), shareOptions({ legacy: mod.legacy }))).toMatchObject({ ok: true });
  });
});
