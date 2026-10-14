// CHK-NET-46 (K-04): a seated board pin lands on its printed contact. The
// legal ranges are the profile rows the check names (seat.pinOnContactMin,
// seat.bumpPress.lo and .hi, seat.socketPinMin), read here from the
// committed constants, never from the module under test.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { CheckCtx, ConductorFeature, Feature, Net, Part, PortFeature, PortTap, Ring, Vec2 } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { runNet46 } from "../src/net/net46";

const rows = (JSON.parse(readFileSync(new URL("../../profile/data/constants.json", import.meta.url), "utf8")) as { constants: { id: string; value: number }[] }).constants;
const C = (id: string): number => rows.find((r) => r.id === id)!.value;
const ctx = { profile: createProfileLookup(loadProfile()), machine: "ffc5p", whitelist: new Map() } as unknown as CheckCtx;

const R = 0.85, FLOOR = 4.08, BUMP_H = 0.48, EZ = 0.02;
const circle = (r: number, c: Vec2, n = 48): Ring =>
  Array.from({ length: n }, (_, i): Vec2 => [c[0] + r * Math.cos((2 * Math.PI * i) / n), c[1] + r * Math.sin((2 * Math.PI * i) / n)]);
const bump: ConductorFeature = {
  kind: "conductor", id: "seat.conductor.bumpGP8", material: "cpla", net: "K1", width: 2 * R, t: BUMP_H + EZ,
  region: { path: circle(R, [0, 0]), face: { origin: [0, 0, FLOOR - EZ], normal: [0, 0, 1], u: [1, 0, 0] } },
};
const tap = (over: Partial<PortTap> = {}): PortTap =>
  ({ conductor: bump.id, at: [0, 0, FLOOR + BUMP_H], board: "rp2040-zero", mcu: "rp2040", pin: "GP8", contact: "bump", pressMm: 0.3, ...over });
const partWith = (t: PortTap | undefined, bodies: string[] = []): Part => {
  const port: PortFeature = { kind: "port", id: "seat.port.GP8", net: "K1", type: "signal", interface: "digital", ...(t === undefined ? {} : { tap: t }) };
  return { id: "pad", features: [bump, port] as Feature[], bodies: bodies.map((id) => ({ id })) } as unknown as Part;
};
const net = { id: "K1" } as Net;
const run = (t: PortTap | undefined, bodies: string[] = []) => runNet46({ level: "net", part: partWith(t, bodies), net }, ctx);

describe("CHK-NET-46 seat pin landing", () => {
  test("a pin on the bump centre under a clamp the part lacks: on contact, press warn", () => {
    const [on, press] = run(tap());
    expect([on!.verdict, on!.measured]).toEqual(["pass", expect.closeTo(R * Math.cos(Math.PI / 48), 9)]);
    expect(on!.legal).toMatchObject({ kind: "interval", lo: C("seat.pinOnContactMin"), hi: null });
    expect([press!.verdict, press!.measured]).toEqual(["warn", expect.closeTo(0.3, 9)]);
    expect(press!.legal).toMatchObject({ lo: C("seat.bumpPress.lo"), hi: C("seat.bumpPress.hi") });
    expect(press!.constraint).toMatch(/the clamp is not in part pad/);
  });

  test("the clamp body in the part makes the press a pass", () => {
    expect(run(tap({ clamp: "bezel" }), ["bezel"])[1]!.verdict).toBe("pass");
  });

  test("a pin off the bump, or too near its edge, fails and names the catalog pin", () => {
    const off = run(tap({ at: [1.2, 0, FLOOR + BUMP_H] }))[0]!;
    expect(off.verdict).toBe("fail");
    expect(off.measured as number).toBeLessThan(0);
    expect(off.constraint).toMatch(/outside .* fix: move the contact under the catalog pin/);
    const edge = run(tap({ at: [R - C("seat.pinOnContactMin") / 2, 0, FLOOR + BUMP_H] }))[0]!;
    expect(edge.verdict).toBe("fail");
  });

  test("press depth: none, too deep, and a pin face above the bump", () => {
    expect(run(tap({ pressMm: 0, clamp: "bezel" }), ["bezel"])[1]!.verdict).toBe("fail");
    expect(run(tap({ pressMm: C("seat.bumpPress.hi") + 0.1, clamp: "bezel" }), ["bezel"])[1]!.verdict).toBe("fail");
    // The pin face 0.2 over the bump top eats 0.2 of a 0.3 clamp: 0.1 left, inside the range.
    const high = run(tap({ at: [0, 0, FLOOR + BUMP_H + 0.2], clamp: "bezel" }), ["bezel"])[1]!;
    expect([high.verdict, high.measured]).toEqual(["pass", expect.closeTo(0.1, 9)]);
    // 0.3 over the top: the clamp only reaches the bump.
    expect(run(tap({ at: [0, 0, FLOOR + BUMP_H + 0.3], clamp: "bezel" }), ["bezel"])[1]!.verdict).toBe("fail");
  });

  test("a socket takes the header pin length against seat.socketPinMin", () => {
    const min = C("seat.socketPinMin");
    expect(run(tap({ contact: "socket", pressMm: min + 1 }))[1]!.verdict).toBe("pass");
    expect(run(tap({ contact: "socket", pressMm: min - 0.5 }))[1]!.verdict).toBe("fail");
  });

  test("a net with no seat tap is skipped", () => {
    const [only] = run(undefined);
    expect(only!.verdict).toBe("skip");
  });
});
