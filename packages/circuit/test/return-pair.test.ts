// A branched GND net is priced on one pair, port.gnd to the first key's
// contact (M05-T04). A press on another key used that pair's ohms as its
// own, so a 25-key bed read key1's return path on every key (finding
// INES-02). The return leg of a key whose contact is not the priced pair is
// now left out and named unpriced; the key's own pair still adds in.

import { describe, expect, test } from "vitest";
import type { Feature, Net } from "@hackbuild/spec";
import { pressedPathOf } from "../src/index";

const net = (id: string, ohm: number, to: string, from: string): Net => ({
  id, conductors: [], bodies: [], terminals: [from],
  resistance: [{ terminals: [from, to], preview: { method: "path-1d", segments: [{ direction: "along", lengthMm: 10, areaMm2: 1, ohmCm: 1, ohm }], ohm }, solved: null, solvedOverPreview: null }],
  bulkOhm: ohm, contacts: [], totalOhm: [ohm, ohm], unpricedContacts: [], capToGndPf: 0, couplingPf: {}, capMethod: "pip-per-mm",
  tier: "inferred", qualifier: "computed",
} as unknown as Net);

const features = [
  { kind: "conductor", id: "conductor.k1", net: "K1" },
  { kind: "conductor", id: "conductor.k2", net: "K2" },
  { kind: "conductor", id: "conductor.g1", net: "GND" },
  { kind: "conductor", id: "conductor.g2", net: "GND" },
  { kind: "contact", id: "contact.key1", a: "conductor.k1", b: "conductor.g1" },
  { kind: "contact", id: "contact.key2", a: "conductor.k2", b: "conductor.g2" },
  { kind: "port", id: "port.key1", net: "K1", type: "signal" },
  { kind: "port", id: "port.key2", net: "K2", type: "signal" },
  { kind: "port", id: "port.gnd", net: "GND", type: "gnd" },
] as unknown as Feature[];

const nets = [net("K1", 1000, "contact.key1", "port.key1"), net("K2", 3000, "contact.key2", "port.key2"), net("GND", 50000, "contact.key1", "port.gnd")];
const port = (id: string) => features.find((f) => f.id === id) as never;

describe("pressedPathOf on a branched return net", () => {
  test("the key whose contact ends the priced pair adds the return ohms", () => {
    const got = pressedPathOf({ features }, nets, port("port.key1"));
    if (!("path" in got)) throw new Error(got.reason);
    expect(got.path.pathOhm).toBe(51000);
    expect(got.warning).toBeUndefined();
    expect(got.path.unpriced).toEqual(["contact.key1"]);
  });

  test("another key leaves the return leg unpriced instead of copying key1's", () => {
    const got = pressedPathOf({ features }, nets, port("port.key2"));
    if (!("path" in got)) throw new Error(got.reason);
    expect(got.path.pathOhm).toBe(3000);
    expect(got.path.unpriced).toEqual(["GND return to contact.key2", "contact.key2"]);
    expect(got.warning?.code).toBe("RETURN_PATH_PAIR");
    expect(got.warning?.text).toContain("the return leg of K2 is unpriced and its path a lower bound");
  });
});
