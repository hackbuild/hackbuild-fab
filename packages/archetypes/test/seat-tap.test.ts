// K-04: the RP2040-Zero seat declares each used castellation as a net tap.
// The pin centre comes from the catalog row (packages/catalog
// data/modules/rp2040-zero.json, read here from disk), placed by the seat
// frame, at the face where the pin meets its contact: the bump top the
// board stands on, or the socket bore floor. The placement prefixes the
// tapped conductor id with the archetype's own prefix.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { FaceFrame, PortFeature } from "@hackbuild/spec";
import { SEAT_DEFAULTS, archetypes, pipStack, placeArchetype, seatApply, seatZ, shippedProfile } from "@hackbuild/archetypes";

const row = JSON.parse(readFileSync(new URL("../../catalog/data/modules/rp2040-zero.json", import.meta.url), "utf8")) as {
  id: string; mcu: string; fields: { pins: { value: { name: string; at: [number, number, number] }[] } };
};
const pinAt = (name: string): [number, number] => {
  const p = row.fields.pins.value.find((q) => q.name === name)!;
  return [p.at[0], p.at[1]];
};

const profile = shippedProfile();
const s = pipStack(profile, "ffc5p", { body: "petg", trace: "cpla" });
const draft = { id: "body", name: "body", process: "fdm" as const, machine: "ffc5p", frame: { originOnAxis: false, carriesOffset: false, pose: "print" as const }, bodies: [], features: [] };
// USB toward -x: face u = +y, so local (u, v) maps to part (-v, u) about the origin.
const face: FaceFrame = { origin: [10, 20, s.z.floor], normal: [0, 0, 1], u: [0, 1, 0] };
const ports = (contact: "bump" | "socket") =>
  seatApply({ draft, face, profile, params: { ...SEAT_DEFAULTS, contact } }, "rp2040-zero-seat").features.filter((f): f is PortFeature => f.kind === "port");

describe("rp2040-zero-seat ports are net taps", () => {
  test("every used pad's port taps its bump at the catalog pin centre, placed by the face, on the bump top", () => {
    const zz = seatZ(SEAT_DEFAULTS, s);
    const list = ports("bump");
    expect(list.map((p) => p.tap?.pin)).toEqual(list.map((p) => p.id.replace("port.", "")));
    expect(list.length).toBe(Object.keys(SEAT_DEFAULTS.nets).length);
    for (const p of list) {
      const t = p.tap!;
      const [u, v] = pinAt(t.pin);
      expect(t.at[0], p.id).toBeCloseTo(10 - v, 9);
      expect(t.at[1], p.id).toBeCloseTo(20 + u, 9);
      expect(t.at[2], p.id).toBeCloseTo(zz.boardZ, 9);
      expect([t.conductor, t.board, t.mcu, t.contact, t.pressMm]).toEqual([`conductor.bump${t.pin}`, row.id, row.mcu, "bump", SEAT_DEFAULTS.press]);
    }
  });

  test("a socket seat taps the socket at its bore floor with the header pin length", () => {
    for (const p of ports("socket")) {
      const t = p.tap!;
      expect([t.conductor, t.contact, t.pressMm]).toEqual([`conductor.socket${t.pin}`, "socket", SEAT_DEFAULTS.pinLen]);
      expect(t.at[2]).toBeCloseTo(s.z.floor + 0.72, 9);
    }
  });

  test("the placement prefixes the tapped conductor with the seat's own prefix", () => {
    const out = placeArchetype(archetypes, { id: "rp2040-zero-seat", face, params: {}, draft, profile, index: 0, materials: [
      { slot: 1, material: "petg", role: "body", label: "body", preview: "#F4F1EA" },
      { slot: 2, material: "cpla", role: "conductor", label: "traces", preview: "#1A1A1A" },
    ] });
    const ids = new Set(out.features.map((f) => f.id));
    const tapped = out.features.filter((f): f is PortFeature => f.kind === "port").map((p) => p.tap!.conductor);
    expect(tapped.length).toBeGreaterThan(0);
    for (const c of tapped) {
      expect(c.startsWith("rp2040-zero-seat.0.conductor.bump"), c).toBe(true);
      expect(ids.has(c), c).toBe(true);
    }
  });
});
