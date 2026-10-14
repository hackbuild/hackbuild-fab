// M08-T02 record rules. The fixture's recordHash was written by an
// independent reader (Python json with sorted keys, every length rounded to
// 1e-6 mm, set arrays sorted by their canonical text, hashlib sha256) and is
// committed in test/fixtures/record-small.json; this file recomputes it a
// third way with node:crypto. Expected counts are typed from the fixture's
// own lines, never read back from the code under test.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { isThrownCommandError, type BoardRecord } from "@hackbuild/spec";
import { boardAdapter, boardMetrics, parseBoardRecord, recordHash, withHash } from "../src/index";

const FIXTURE = new URL("./fixtures/record-small.json", import.meta.url);
const GOLDEN_HASH = "1e37d162d6fad6942a0bf8888ef29ec6e00a538d203d0257b6f0a9826f6de9a5";
const load = (): BoardRecord & Record<string, unknown> => JSON.parse(readFileSync(FIXTURE, "utf8")) as BoardRecord & Record<string, unknown>;
// A loose copy the rule tests edit in place; parseBoardRecord sees it as unknown input.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Mutable = Record<string, any>;
const mutable = (): Mutable => structuredClone(load()) as unknown as Mutable;

function errorOf(fn: () => unknown): { code: string; path?: string; hint: string; didYouMean?: readonly string[] } {
  try {
    fn();
  } catch (e) {
    if (isThrownCommandError(e)) return e.hbf;
    throw e;
  }
  throw new Error("expected a command error, none thrown");
}

// Third reader of the hash rule: own key sort, own rounding, node:crypto.
function independentHash(rec: Record<string, unknown>): string {
  const LEN = new Set(["x", "y", "w", "h", "z", "drill", "holeDx", "pad", "width", "thickness"]);
  const q = (v: unknown, k: string | undefined, pts: boolean): unknown => {
    if (typeof v === "number") return pts || (k !== undefined && LEN.has(k)) ? Number((Math.round(v * 1e6) / 1e6).toFixed(6)) : v;
    if (Array.isArray(v)) return v.map((e) => q(e, k, pts));
    if (v !== null && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([kk, e]) => [kk, q(e, kk, pts || kk === "outline" || kk === "pts")]));
    return v;
  };
  const canon = (v: unknown): string => {
    if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`;
    if (v !== null && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon((v as Record<string, unknown>)[k])}`).join(",")}}`;
    return JSON.stringify(v);
  };
  const { recordHash: _h, ...rest } = rec;
  const h = q(rest, undefined, false) as Record<string, unknown[]>;
  for (const k of ["parts", "pads", "vias", "holes", "tracks", "jumpers", "bridges", "reads"]) h[k] = [...h[k]!].sort((a, b) => (canon(a) < canon(b) ? -1 : canon(a) > canon(b) ? 1 : 0));
  return createHash("sha256").update(canon(h)).digest("hex");
}

describe("record hash", () => {
  test("the fixture's committed hash equals recordHash and a third independent reader", () => {
    const rec = load();
    expect(rec.recordHash).toBe(GOLDEN_HASH);
    expect(recordHash(rec)).toBe(GOLDEN_HASH);
    expect(independentHash(rec)).toBe(GOLDEN_HASH);
    expect(parseBoardRecord(rec)).toBe(rec);
  });

  test("two records equal after quantisation give one recordHash", () => {
    const a = mutable();
    const b = mutable();
    b.pads[0].x = 3 + 4e-7;
    b.board.outline[1][0] = 20 - 3e-7;
    b.tracks[0].pts[1][1] = 7 + 2e-7;
    b.parts[1].body.z = 0.45 + 1e-7;
    expect(recordHash(b as BoardRecord)).toBe(recordHash(a as BoardRecord));
    expect(recordHash(b as BoardRecord)).toBe(GOLDEN_HASH);
  });

  test("a coordinate two grid steps away moves the hash", () => {
    const b = mutable();
    b.pads[0].x = 3 + 2e-6;
    expect(recordHash(b as BoardRecord)).not.toBe(GOLDEN_HASH);
  });

  test("emission order of set arrays leaves the hash; ring and track point order move it", () => {
    const b = mutable();
    b.pads.reverse();
    b.tracks.reverse();
    b.parts.reverse();
    expect(recordHash(b as BoardRecord)).toBe(GOLDEN_HASH);
    const c = mutable();
    c.tracks[0].pts.reverse();
    expect(recordHash(c as BoardRecord)).not.toBe(GOLDEN_HASH);
  });

  test("rot stays exact: a 1e-7 degree turn moves the hash", () => {
    const b = mutable();
    b.pads[3].rot = 90 + 1e-7;
    expect(recordHash(b as BoardRecord)).not.toBe(GOLDEN_HASH);
  });

  test("withHash stamps a record parseBoardRecord accepts", () => {
    const { recordHash: _h, ...rest } = load();
    expect(parseBoardRecord(withHash(rest)).recordHash).toBe(GOLDEN_HASH);
  });
});

describe("record rules", () => {
  const restamp = (m: Mutable): BoardRecord => {
    const { recordHash: _h, ...rest } = m;
    return withHash(rest as Omit<BoardRecord, "recordHash">);
  };

  test("a duplicate U1.GPIO20 pad is E_SCHEMA at /pads/<i>", () => {
    const m = mutable();
    m.pads.push({ ...m.pads[0], x: 4 });
    const e = errorOf(() => parseBoardRecord(restamp(m)));
    expect(e.code).toBe("E_SCHEMA");
    expect(e.path).toBe("/pads/7");
    expect(e.hint).toContain("U1.GPIO20");
  });

  test("a net member naming a missing pad is E_REF with didYouMean", () => {
    const m = mutable();
    m.nets[1].members = ["R1.1", "U1.GPIO21"];
    const e = errorOf(() => parseBoardRecord(restamp(m)));
    expect(e.code).toBe("E_REF");
    expect(e.path).toBe("/nets/1/members/1");
    expect(e.didYouMean).toContain("U1.GPIO20");
  });

  test("a member on another net, and a pad missing from its net, are E_SCHEMA", () => {
    const m = mutable();
    m.nets[0].members = ["JP1.1", "R1.1", "R1.2", "U1.GND"];
    expect(errorOf(() => parseBoardRecord(restamp(m)))).toMatchObject({ code: "E_SCHEMA", path: "/nets/0/members/1" });
    const n = mutable();
    n.nets[0].members = ["JP1.1", "U1.GND"];
    expect(errorOf(() => parseBoardRecord(restamp(n)))).toMatchObject({ code: "E_SCHEMA", path: "/pads/4" });
  });

  test("unsorted nets and unsorted members are E_SCHEMA", () => {
    const m = mutable();
    m.nets.reverse();
    expect(errorOf(() => parseBoardRecord(restamp(m)))).toMatchObject({ code: "E_SCHEMA", path: "/nets/1" });
    const n = mutable();
    n.nets[0].members.reverse();
    expect(errorOf(() => parseBoardRecord(restamp(n)))).toMatchObject({ code: "E_SCHEMA", path: "/nets/0/members/1" });
  });

  test("the outline must sit at the origin, counter-clockwise, without a closing point", () => {
    const m = mutable();
    m.board.outline = m.board.outline.map(([x, y]: [number, number]) => [x + 1, y]);
    expect(errorOf(() => parseBoardRecord(restamp(m)))).toMatchObject({ code: "E_SCHEMA", path: "/board/outline" });
    const c = mutable();
    c.board.outline.reverse();
    expect(errorOf(() => parseBoardRecord(restamp(c)))).toMatchObject({ code: "E_SCHEMA", path: "/board/outline" });
    const d = mutable();
    d.board.outline.push([0, 0]);
    expect(errorOf(() => parseBoardRecord(restamp(d)))).toMatchObject({ code: "E_SCHEMA", path: "/board/outline/4" });
  });

  test("vias, jumpers and bridges that name nothing are E_REF", () => {
    const m = mutable();
    m.vias[0].net = "GDN";
    const v = errorOf(() => parseBoardRecord(restamp(m)));
    expect(v).toMatchObject({ code: "E_REF", path: "/vias/0/net" });
    expect(v.didYouMean?.[0]).toBe("GND");
    const j = mutable();
    j.jumpers[0].pads = ["JP1.1", "JP1.3"];
    expect(errorOf(() => parseBoardRecord(restamp(j)))).toMatchObject({ code: "E_REF", path: "/jumpers/0/pads/1" });
    const b = mutable();
    b.bridges = [{ nets: ["GND", "5V"], through: "R1", reason: "fixture" }];
    expect(errorOf(() => parseBoardRecord(restamp(b)))).toMatchObject({ code: "E_REF", path: "/bridges/0/nets/1" });
  });

  test("a stale recordHash and a shape fault are E_SCHEMA", () => {
    const m = mutable();
    m.pads[0].x = 3.5;
    expect(errorOf(() => parseBoardRecord(m))).toMatchObject({ code: "E_SCHEMA", path: "/recordHash" });
    const s = mutable();
    s.pads[0].w = -1;
    expect(errorOf(() => parseBoardRecord(s))).toMatchObject({ code: "E_SCHEMA", path: "/pads/0/w" });
  });
});

describe("the record as a board part", () => {
  test("metrics.board counts the fixture: 7 pads plus 1 via, 2 drilled pads plus 1 via", () => {
    const byId = Object.fromEntries(boardMetrics(load()).map((m) => [m.id, m]));
    expect(byId["board.nets"]?.value).toBe(3);
    expect(byId["board.pads"]?.value).toBe(8);
    expect(byId["board.holes"]?.value).toBe(3);
    expect(byId["board.vias"]?.value).toBe(1);
    expect(byId["board.npth"]?.value).toBe(1);
    expect(byId["board.pads"]).toMatchObject({ qualifier: "computed", basis: null, gate: "informational" });
  });

  test("the adapter names the backend and the tscircuit version", () => {
    expect(boardAdapter("direct")).toBe("board/direct-1");
    expect(boardAdapter("tscircuit", "0.0.2806")).toBe("board/tscircuit-0.0.2806");
    expect(() => boardAdapter("tscircuit")).toThrow();
  });
});
